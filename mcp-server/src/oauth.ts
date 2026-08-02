import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { JsonStore } from "../../shared/src/store/types.js";

export const OAUTH_SCOPES = ["arclancer:read", "arclancer:write"] as const;
const IGNORED_OAUTH_SCOPES = new Set(["offline_access", "openid"]);
const CLIENT_TTL_SECONDS = 60 * 60 * 24 * 365;
const REQUEST_TTL_SECONDS = 10 * 60;
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_BODY_BYTES = 16_384;

export interface OAuthClient {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt: number;
}

export interface OAuthAuthorizationRequest {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope: string[];
  codeChallenge: string;
  createdAt: number;
}

export interface OAuthAuthorizationCode {
  clientId: string;
  redirectUri: string;
  scope: string[];
  codeChallenge: string;
  subject: string;
  walletAddress: string;
  walletId: string;
}

interface OAuthRefreshGrant {
  clientId: string;
  scope: string[];
  subject: string;
  walletAddress: string;
  walletId: string;
}

interface OAuthIdentity extends OAuthRefreshGrant {
  tokenType: "oauth";
  createdAt: string;
}

function publicOrigin() {
  return (process.env.MCP_PUBLIC_ORIGIN?.trim() || "https://arclancer.xyz").replace(/\/$/, "");
}

function appOrigin() {
  return (
    process.env.APP_PUBLIC_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://arclancer.xyz"
  ).replace(/\/$/, "");
}

function resourceUrl() {
  return `${publicOrigin()}/mcp`;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function tokenKey(token: string) {
  return `mcp:token:${hash(token)}`;
}

function refreshKey(token: string) {
  return `oauth:refresh:${hash(token)}`;
}

function clientKey(clientId: string) {
  return `oauth:client:${clientId}`;
}

function codeKey(code: string) {
  return `oauth:code:${hash(code)}`;
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function validateRedirectUri(value: string): string {
  const url = new URL(value);
  const isLoopback =
    url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLoopback) {
    throw new Error("redirect_uri must use HTTPS");
  }
  if (url.username || url.password || url.hash) {
    throw new Error("redirect_uri contains forbidden URL components");
  }
  return url.toString();
}

function normalizeScopes(value: string | null | undefined): string[] {
  const requested = (value || OAUTH_SCOPES.join(" "))
    .split(/\s+/)
    .filter(Boolean)
    .filter((scope) => !IGNORED_OAUTH_SCOPES.has(scope));
  const unique = [...new Set(requested.length > 0 ? requested : [...OAUTH_SCOPES])];
  if (unique.some((scope) => !OAUTH_SCOPES.includes(scope as (typeof OAUTH_SCOPES)[number]))) {
    throw new Error("Unsupported OAuth scope");
  }
  return unique;
}

function normalizeRedirectUris(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  const uris = raw
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object" && "uri" in entry) {
        const uri = (entry as { uri?: unknown }).uri;
        return typeof uri === "string" ? uri.trim() : "";
      }
      return String(entry).trim();
    })
    .filter(Boolean);
  return uris.map(validateRedirectUri);
}

export function verifyPkce(codeVerifier: string, expectedChallenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(codeVerifier)) return false;
  const actual = createHash("sha256").update(codeVerifier).digest("base64url");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expectedChallenge);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

async function issueTokens(
  store: JsonStore,
  grant: OAuthRefreshGrant
): Promise<Record<string, unknown>> {
  const accessToken = `arc_oauth_${randomBytes(32).toString("base64url")}`;
  const refreshToken = `arc_refresh_${randomBytes(32).toString("base64url")}`;
  const identity: OAuthIdentity = {
    ...grant,
    tokenType: "oauth",
    createdAt: new Date().toISOString(),
  };
  await Promise.all([
    store.setJSON(tokenKey(accessToken), identity, ACCESS_TTL_SECONDS),
    store.setJSON(refreshKey(refreshToken), grant, REFRESH_TTL_SECONDS),
  ]);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: grant.scope.join(" "),
  };
}

async function registerClient(req: IncomingMessage, res: ServerResponse, store: JsonStore) {
  const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
  const redirectUris = normalizeRedirectUris(body.redirect_uris);
  if (redirectUris.length === 0 || redirectUris.length > 10) {
    return json(res, 400, { error: "invalid_client_metadata" });
  }
  if (
    body.token_endpoint_auth_method &&
    body.token_endpoint_auth_method !== "none"
  ) {
    return json(res, 400, { error: "invalid_client_metadata" });
  }
  const clientId = `arc_client_${randomBytes(24).toString("base64url")}`;
  const client: OAuthClient = {
    clientId,
    clientName:
      typeof body.client_name === "string" && body.client_name.trim()
        ? body.client_name.trim().slice(0, 120)
        : "AI connector",
    redirectUris,
    createdAt: Date.now(),
  };
  await store.setJSON(clientKey(clientId), client, CLIENT_TTL_SECONDS);
  return json(res, 201, {
    client_id: clientId,
    client_id_issued_at: Math.floor(client.createdAt / 1000),
    client_name: client.clientName,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  });
}

async function authorize(req: IncomingMessage, res: ServerResponse, store: JsonStore) {
  const url = new URL(req.url || "/", publicOrigin());
  const clientId = url.searchParams.get("client_id") || "";
  const redirectUri = validateRedirectUri(url.searchParams.get("redirect_uri") || "");
  const client = await store.getJSON<OAuthClient>(clientKey(clientId));
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return json(res, 400, { error: "invalid_request", error_description: "Unknown client or redirect URI" });
  }
  if (url.searchParams.get("response_type") !== "code") {
    return json(res, 400, { error: "unsupported_response_type" });
  }
  const codeChallenge = url.searchParams.get("code_challenge") || "";
  if (
    url.searchParams.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)
  ) {
    return json(res, 400, { error: "invalid_request", error_description: "PKCE S256 is required" });
  }
  const requestId = `arc_req_${randomBytes(24).toString("base64url")}`;
  const request: OAuthAuthorizationRequest = {
    clientId,
    redirectUri,
    state: url.searchParams.get("state") || undefined,
    scope: normalizeScopes(url.searchParams.get("scope")),
    codeChallenge,
    createdAt: Date.now(),
  };
  await store.setJSON(`oauth:request:${requestId}`, request, REQUEST_TTL_SECONDS);
  res.writeHead(302, {
    Location: `${appOrigin()}/connect/authorize?request_id=${encodeURIComponent(requestId)}`,
    "Cache-Control": "no-store",
  });
  res.end();
}

async function exchangeToken(req: IncomingMessage, res: ServerResponse, store: JsonStore) {
  const form = new URLSearchParams(await readBody(req));
  const grantType = form.get("grant_type");

  if (grantType === "authorization_code") {
    const code = form.get("code") || "";
    const record = await store.getdelJSON<OAuthAuthorizationCode>(codeKey(code));
    if (
      !record ||
      record.clientId !== form.get("client_id") ||
      record.redirectUri !== validateRedirectUri(form.get("redirect_uri") || "") ||
      !verifyPkce(form.get("code_verifier") || "", record.codeChallenge)
    ) {
      return json(res, 400, { error: "invalid_grant" });
    }
    return json(
      res,
      200,
      await issueTokens(store, {
        clientId: record.clientId,
        scope: record.scope,
        subject: record.subject,
        walletAddress: record.walletAddress,
        walletId: record.walletId,
      })
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token") || "";
    const grant = await store.getdelJSON<OAuthRefreshGrant>(refreshKey(refreshToken));
    if (!grant || grant.clientId !== form.get("client_id")) {
      return json(res, 400, { error: "invalid_grant" });
    }
    return json(res, 200, await issueTokens(store, grant));
  }

  return json(res, 400, { error: "unsupported_grant_type" });
}

export function oauthResourceMetadataUrl() {
  return `${publicOrigin()}/.well-known/oauth-protected-resource`;
}

export function oauthChallengeHeader() {
  return `Bearer resource_metadata="${oauthResourceMetadataUrl()}", scope="${OAUTH_SCOPES.join(" ")}"`;
}

export async function handleOAuthRequest(
  req: IncomingMessage,
  res: ServerResponse,
  store: JsonStore
): Promise<boolean> {
  const path = new URL(req.url || "/", publicOrigin()).pathname;

  if (
    req.method === "GET" &&
    (path === "/.well-known/oauth-protected-resource" ||
      path === "/.well-known/oauth-protected-resource/mcp")
  ) {
    json(res, 200, {
      resource: resourceUrl(),
      authorization_servers: [publicOrigin()],
      bearer_methods_supported: ["header"],
      scopes_supported: OAUTH_SCOPES,
    });
    return true;
  }

  if (req.method === "GET" && path === "/.well-known/oauth-authorization-server") {
    json(res, 200, {
      issuer: publicOrigin(),
      authorization_endpoint: `${publicOrigin()}/oauth/authorize`,
      token_endpoint: `${publicOrigin()}/oauth/token`,
      registration_endpoint: `${publicOrigin()}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: OAUTH_SCOPES,
    });
    return true;
  }

  if (req.method === "GET" && path === "/.well-known/oauth-authorization-server/mcp") {
    json(res, 200, {
      issuer: publicOrigin(),
      authorization_endpoint: `${publicOrigin()}/oauth/authorize`,
      token_endpoint: `${publicOrigin()}/oauth/token`,
      registration_endpoint: `${publicOrigin()}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: OAUTH_SCOPES,
    });
    return true;
  }

  try {
    if (req.method === "POST" && path === "/oauth/register") {
      await registerClient(req, res, store);
      return true;
    }
    if (req.method === "GET" && path === "/oauth/authorize") {
      await authorize(req, res, store);
      return true;
    }
    if (req.method === "POST" && path === "/oauth/token") {
      await exchangeToken(req, res, store);
      return true;
    }
  } catch (error) {
    const description =
      error instanceof TypeError && error.message === "Invalid URL"
        ? "OAuth storage backend is misconfigured"
        : error instanceof Error
          ? error.message
          : "Invalid OAuth request";
    json(res, 400, {
      error: "invalid_request",
      error_description: description,
    });
    return true;
  }

  return false;
}
