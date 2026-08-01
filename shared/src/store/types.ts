export interface JsonStore {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  rpush(key: string, value: unknown): Promise<void>;
}
