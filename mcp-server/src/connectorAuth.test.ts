import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { JsonStore } from "../../shared/src/store/types.js";
import { resolveConnectorBearerToken } from "./connectorAuth.js";

class MemoryStore implements JsonStore {
  values = new Map<string, unknown>();

  async getJSON<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }
  async getdelJSON<T>(key: string): Promise<T | null> {
    const value = await this.getJSON<T>(key);
    this.values.delete(key);
    return value;
  }
  async setJSON(key: string, value: unknown, _ttlSeconds: number): Promise<void> {
    this.values.set(key, value);
  }
  async del(key: string): Promise<void> {
    this.values.delete(key);
  }
  async rpush(key: string, value: unknown): Promise<void> {
    const list = (this.values.get(key) as unknown[] | undefined) ?? [];
    this.values.set(key, [...list, value]);
  }
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

test("accepts manual and OAuth access tokens bound to wallet identity", async () => {
  const store = new MemoryStore();
  const manualToken = "arc_manual_token";
  store.values.set(`mcp:token:${digest(manualToken)}`, {
    subject: "circle:wallet-1",
    walletAddress: "0x1111111111111111111111111111111111111111",
    walletId: "wallet-1",
  });

  const manual = await resolveConnectorBearerToken(manualToken, store);
  assert.equal(manual?.sessionId, "circle:wallet-1:manual");
  assert.equal(manual?.identity.walletId, "wallet-1");

  const oauthToken = "arc_oauth_access_token";
  store.values.set(`mcp:token:${digest(oauthToken)}`, {
    subject: "circle:wallet-2",
    walletAddress: "0x2222222222222222222222222222222222222222",
    walletId: "wallet-2",
    scope: ["arclancer:read"],
    tokenType: "oauth",
  });

  const oauth = await resolveConnectorBearerToken(oauthToken, store);
  assert.equal(oauth?.sessionId, "circle:wallet-2:arclancer:read");
  assert.deepEqual(oauth?.identity.scope, ["arclancer:read"]);
});

test("rejects refresh codes and unknown bearer tokens", async () => {
  const store = new MemoryStore();
  assert.equal(await resolveConnectorBearerToken("arc_refresh_token", store), null);
  assert.equal(await resolveConnectorBearerToken("arc_code_token", store), null);
  assert.equal(await resolveConnectorBearerToken("not_arc_token", store), null);
  assert.equal(await resolveConnectorBearerToken("arc_missing_lookup", store), null);
});
