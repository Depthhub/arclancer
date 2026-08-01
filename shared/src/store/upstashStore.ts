import type { JsonStore } from "./types.js";
import { FileStore } from "./fileStore.js";

class UpstashRestStore implements JsonStore {
  constructor(
    private restUrl: string,
    private restToken: string
  ) {}

  private async call(
    commandPath: string,
    body?: string,
    query?: Record<string, string | number>
  ): Promise<unknown> {
    const url = new URL(
      `${this.restUrl.replace(/\/$/, "")}/${commandPath.replace(/^\//, "")}`
    );
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.restToken}`,
        "Content-Type": "text/plain",
      },
      body,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Upstash request failed (${response.status})`);
    }
    return payload;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const payload = await this.call(`get/${encodeURIComponent(key)}`);
    const result =
      payload && typeof payload === "object" && "result" in payload
        ? (payload as { result?: unknown }).result
        : null;
    if (typeof result !== "string") return null;
    try {
      return JSON.parse(result) as T;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.call(
      `set/${encodeURIComponent(key)}`,
      JSON.stringify(value),
      { EX: ttlSeconds }
    );
  }

  async del(key: string): Promise<void> {
    await this.call(`del/${encodeURIComponent(key)}`);
  }

  async rpush(key: string, value: unknown): Promise<void> {
    await this.call(`rpush/${encodeURIComponent(key)}`, JSON.stringify(value));
  }
}

let singleton: JsonStore | null = null;

export function getMcpStore(): JsonStore {
  if (singleton) return singleton;

  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (restUrl && restToken) {
    singleton = new UpstashRestStore(restUrl, restToken);
    return singleton;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("MCP production requires Upstash Redis configuration");
  }

  singleton = new FileStore(process.env.MCP_STORE_PATH?.trim());
  return singleton;
}
