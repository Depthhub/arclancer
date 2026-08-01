import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { JsonStore } from "./types.js";

type StoreEntry = { value: unknown; expiresAt: number };

const DEFAULT_STORE_FILE = join(process.cwd(), ".data", "mcp-store.json");

export class FileStore implements JsonStore {
  private data: Record<string, StoreEntry> = {};
  private dirty = false;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private storeFile = DEFAULT_STORE_FILE) {
    this.load();
  }

  private load() {
    try {
      if (existsSync(this.storeFile)) {
        const raw = readFileSync(this.storeFile, "utf-8");
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
      if (!this.dirty) return;
      try {
        const dir = dirname(this.storeFile);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(this.storeFile, JSON.stringify(this.data), "utf-8");
        this.dirty = false;
      } catch (e) {
        console.error("[FileStore] write failed:", e);
      }
    }, 500);
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

  async rpush(key: string, value: unknown): Promise<void> {
    const list = Array.isArray(this.data[key]?.value)
      ? (this.data[key].value as unknown[])
      : [];
    list.push(value);
    this.data[key] = { value: list, expiresAt: Date.now() + 86400 * 1000 };
    this.scheduleSave();
  }
}

let singleton: FileStore | null = null;

export function getMcpFileStore(): JsonStore {
  if (!singleton) {
    const path = process.env.MCP_STORE_PATH?.trim();
    singleton = new FileStore(path || DEFAULT_STORE_FILE);
  }
  return singleton;
}
