import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { JsonStore } from "../../shared/src/store/types.js";
import { resolveConnectorBearerToken } from "./connectorAuth.js";
import {
  handleOAuthRequest,
  oauthChallengeHeader,
  verifyPkce,
  type OAuthAuthorizationCode,
} from "./oauth.js";

class MemoryStore implements JsonStore {
  values = new Map<string, unknown>();
  ttls = new Map<string, number>();

  async getJSON<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }
  async getdelJSON<T>(key: string): Promise<T | null> {
    const value = await this.getJSON<T>(key);
    this.values.delete(key);
    return value;
  }
  async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.values.set(key, value);
    this.ttls.set(key, ttlSeconds);
  }
  async del(key: string): Promise<void> {
    this.values.delete(key);
  }
  async rpush(key: string, value: unknown): Promise<void> {
    const list = (this.values.get(key) as unknown[] | undefined) ?? [];
    this.values.set(key, [...list, value]);
  }
}

class MockResponse {
  statusCode = 0;
  headers: Record<string, string> = {};
  body = "";

  writeHead(status: number, headers: Record<string, string>) {
    this.statusCode = status;
    this.headers = headers;
    return this;
  }
  end(body?: string) {
    this.body = body ?? "";
  }
}

function request(method: string, url: string, body = ""): IncomingMessage {
  const stream = Readable.from(body ? [Buffer.from(body)] : []) as IncomingMessage;
  stream.method = method;
  stream.url = url;
  stream.headers = {};
  return stream;
}

async function call(store: JsonStore, method: string, url: string, body = "") {
  const response = new MockResponse();
  const handled = await handleOAuthRequest(
    request(method, url, body),
    response as unknown as ServerResponse,
    store
  );
  return { handled, response, json: response.body ? JSON.parse(response.body) : null };
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

test.before(() => {
  process.env.MCP_PUBLIC_ORIGIN = "https://mcp.example";
  process.env.APP_PUBLIC_ORIGIN = "https://app.example";
});

test("publishes OAuth discovery and authentication challenge metadata", async () => {
  const store = new MemoryStore();
  const { response, json } = await call(
    store,
    "GET",
    "/.well-known/oauth-authorization-server"
  );
  assert.equal(response.statusCode, 200);
  assert.equal(json.issuer, "https://mcp.example");
  assert.equal(json.code_challenge_methods_supported[0], "S256");
  assert.match(oauthChallengeHeader(), /oauth-protected-resource/);
  assert.match(oauthChallengeHeader(), /arclancer:write/);

  const resource = await call(store, "GET", "/.well-known/oauth-protected-resource/mcp");
  assert.equal(resource.response.statusCode, 200);
  assert.equal(resource.json.resource, "https://mcp.example/mcp");
});

test("registers a client and rejects unregistered redirect URIs", async () => {
  const store = new MemoryStore();
  const registration = await call(
    store,
    "POST",
    "/oauth/register",
    JSON.stringify({
      client_name: "ChatGPT",
      redirect_uris: ["https://chatgpt.com/aip/callback"],
      token_endpoint_auth_method: "none",
    })
  );
  assert.equal(registration.response.statusCode, 201);

  const claudeRegistration = await call(
    store,
    "POST",
    "/oauth/register",
    JSON.stringify({
      client_name: "Claude",
      redirect_uris: "https://claude.ai/api/mcp/auth_callback",
      token_endpoint_auth_method: "none",
    })
  );
  assert.equal(claudeRegistration.response.statusCode, 201);

  const verifier = "v".repeat(64);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorize = await call(
    store,
    "GET",
    `/oauth/authorize?client_id=${registration.json.client_id}` +
      `&redirect_uri=${encodeURIComponent("https://attacker.example/callback")}` +
      `&response_type=code&code_challenge=${challenge}&code_challenge_method=S256`
  );
  assert.equal(authorize.response.statusCode, 400);
});

test("accepts offline_access in authorize scope requests", async () => {
  const store = new MemoryStore();
  const registration = await call(
    store,
    "POST",
    "/oauth/register",
    JSON.stringify({
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      token_endpoint_auth_method: "none",
    })
  );
  const verifier = "v".repeat(64);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorize = await call(
    store,
    "GET",
    `/oauth/authorize?client_id=${registration.json.client_id}` +
      `&redirect_uri=${encodeURIComponent("https://claude.ai/api/mcp/auth_callback")}` +
      `&response_type=code&scope=${encodeURIComponent("arclancer:read offline_access")}` +
      `&code_challenge=${challenge}&code_challenge_method=S256`
  );
  assert.equal(authorize.response.statusCode, 302);
  assert.match(authorize.response.headers.Location, /\/connect\/authorize\?request_id=/);
});

test("enforces PKCE, one-time codes, and refresh-token rotation", async () => {
  const store = new MemoryStore();
  const verifier = "correct-verifier-".padEnd(64, "x");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(verifyPkce(verifier, challenge), true);
  assert.equal(verifyPkce("wrong".repeat(12), challenge), false);

  const code = "arc_code_test";
  const record: OAuthAuthorizationCode = {
    clientId: "client-1",
    redirectUri: "https://client.example/callback",
    scope: ["arclancer:read", "arclancer:write"],
    codeChallenge: challenge,
    subject: "circle:wallet-1",
    walletAddress: "0x1111111111111111111111111111111111111111",
    walletId: "wallet-1",
  };
  await store.setJSON(`oauth:code:${digest(code)}`, record, 300);
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: record.clientId,
    redirect_uri: record.redirectUri,
    code_verifier: verifier,
  }).toString();

  const first = await call(store, "POST", "/oauth/token", form);
  assert.equal(first.response.statusCode, 200);
  assert.match(first.json.access_token, /^arc_oauth_/);
  assert.match(first.json.refresh_token, /^arc_refresh_/);
  assert.equal(store.ttls.get(`mcp:token:${digest(first.json.access_token)}`), 3600);

  const replay = await call(store, "POST", "/oauth/token", form);
  assert.equal(replay.response.statusCode, 400);
  assert.equal(replay.json.error, "invalid_grant");

  const refreshForm = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: first.json.refresh_token,
    client_id: record.clientId,
  }).toString();
  const refreshed = await call(store, "POST", "/oauth/token", refreshForm);
  assert.equal(refreshed.response.statusCode, 200);
  assert.notEqual(refreshed.json.refresh_token, first.json.refresh_token);

  const refreshReplay = await call(store, "POST", "/oauth/token", refreshForm);
  assert.equal(refreshReplay.response.statusCode, 400);
  assert.equal(refreshReplay.json.error, "invalid_grant");

  const bearer = await resolveConnectorBearerToken(first.json.access_token, store);
  assert.equal(bearer?.identity.walletId, "wallet-1");
  assert.deepEqual(bearer?.identity.scope, ["arclancer:read", "arclancer:write"]);
  assert.equal(
    await resolveConnectorBearerToken(first.json.refresh_token, store),
    null
  );
});
