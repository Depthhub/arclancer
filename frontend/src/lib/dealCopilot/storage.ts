import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export interface JsonStore {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

type StoreEntry = { value: unknown; expiresAt: number };

/* ------------------------------------------------------------------ */
/* File-backed store — survives server restarts                        */
/* ------------------------------------------------------------------ */

const STORE_FILE = join(process.cwd(), ".data", "store.json");

class FileStore implements JsonStore {
  private data: Record<string, StoreEntry> = {};
  private dirty = false;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (existsSync(STORE_FILE)) {
        const raw = readFileSync(STORE_FILE, "utf-8");
        this.data = JSON.parse(raw) as Record<string, StoreEntry>;
      }
    } catch {
      this.data = {};
    }
  }

  private scheduleSave() {
    if (this.writeTimer) return;
    this.dirty = true;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      if (this.dirty) {
        try {
          const dir = dirname(STORE_FILE);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(STORE_FILE, JSON.stringify(this.data), "utf-8");
          this.dirty = false;
        } catch (e) {
          console.error("[store] Failed to write store file:", e);
        }
      }
    }, 500); // debounce 500ms
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const entry = this.data[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete this.data[key];
      this.scheduleSave();
      return null;
    }
    return entry.value as T;
  }

  async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.data[key] = { value, expiresAt: Date.now() + ttlSeconds * 1000 };
    this.scheduleSave();
  }

  async del(key: string): Promise<void> {
    delete this.data[key];
    this.scheduleSave();
  }
}

class UpstashRestStore implements JsonStore {
  constructor(
    private restUrl: string,
    private restToken: string
  ) {}

  private async call(commandPath: string, opts?: { body?: string; query?: Record<string, string | number> }): Promise<unknown> {
    const url = new URL(`${this.restUrl.replace(/\/$/, "")}/${commandPath.replace(/^\//, "")}`);
    if (opts?.query) {
      for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, String(v));
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.restToken}`,
          "Content-Type": "text/plain",
        },
        body: opts?.body,
        cache: "no-store",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upstash fetch failed";
      throw new Error(msg);
    }
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: unknown }).error === "string"
          ? (json as { error: string }).error
          : `Upstash request failed (${res.status})`;
      throw new Error(msg);
    }
    return json;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const json = await this.call(`get/${encodeURIComponent(key)}`);
    const value =
      typeof json === "object" && json !== null && "result" in json ? (json as { result?: unknown }).result : null;
    if (value === null) return null;
    try {
      if (typeof value !== "string") return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.call(`set/${encodeURIComponent(key)}`, {
      body: JSON.stringify(value),
      query: { EX: ttlSeconds },
    });
  }

  async del(key: string): Promise<void> {
    await this.call(`del/${encodeURIComponent(key)}`);
  }
}

function sanitizeEnvValue(v: string | undefined): string {
  if (!v) return "";
  // Aggressively remove any newlines, carriage returns, or invisible whitespace at ends
  let s = v.replace(/[\r\n]/g, "").trim();
  // Strip bounding quotes safely 
  s = s.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
  return s;
}

function resilientStore(primary: JsonStore, fallback: JsonStore): JsonStore {
  return {
    async getJSON<T>(key: string) {
      if (process.env.NODE_ENV === "production") return primary.getJSON<T>(key);
      try {
        return await primary.getJSON<T>(key);
      } catch (e) {
        console.error("[dealCopilot] store.getJSON failed, falling back:", e);
        return await fallback.getJSON<T>(key);
      }
    },
    async setJSON(key: string, value: unknown, ttlSeconds: number) {
      if (process.env.NODE_ENV === "production") return primary.setJSON(key, value, ttlSeconds);
      try {
        await primary.setJSON(key, value, ttlSeconds);
      } catch (e) {
        console.error("[dealCopilot] store.setJSON failed, falling back:", e);
        await fallback.setJSON(key, value, ttlSeconds);
      }
    },
    async del(key: string) {
      if (process.env.NODE_ENV === "production") return primary.del(key);
      try {
        await primary.del(key);
      } catch (e) {
        console.error("[dealCopilot] store.del failed, falling back:", e);
        await fallback.del(key);
      }
    },
  };
}

declare global {
  var __ARCLANCER_DEAL_COPILOT_STORE__: FileStore | undefined;
}

export function getJsonStore(): JsonStore {
  const restUrl = sanitizeEnvValue(process.env.UPSTASH_REDIS_REST_URL);
  const restToken = sanitizeEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN);

  if (!globalThis.__ARCLANCER_DEAL_COPILOT_STORE__) {
    globalThis.__ARCLANCER_DEAL_COPILOT_STORE__ = new FileStore();
  }
  const fileStore = globalThis.__ARCLANCER_DEAL_COPILOT_STORE__;

  // In production, we MUST not use FileStore silently because Vercel Serverless wipes it over time
  // Make it throw loudly so the bot responds with error, rather than faking success.
  const isSetupForUpstash = restUrl && restToken && /^https?:\/\//i.test(restUrl);
  
  if (isSetupForUpstash) {
    if (process.env.NODE_ENV === "production") {
      return new UpstashRestStore(restUrl, restToken);
    }
    return resilientStore(new UpstashRestStore(restUrl, restToken), fileStore);
  }

  if (process.env.NODE_ENV === "production") {
    return {
      async getJSON() { throw new Error("PRODUCTION ARCHITECTURE ERROR: Persistent Upstash Backend missing inside Vercel Config."); },
      async setJSON() { throw new Error("PRODUCTION ARCHITECTURE ERROR: Persistent Upstash Backend missing inside Vercel Config."); },
      async del() { throw new Error("PRODUCTION ARCHITECTURE ERROR: Persistent Upstash Backend missing inside Vercel Config."); }
    };
  }

  return fileStore;
}

