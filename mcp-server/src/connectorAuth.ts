import { createHash } from "node:crypto";
import type { JsonStore } from "../../shared/src/store/types.js";

export interface ConnectorIdentity {
  subject: string;
  walletAddress: string;
  walletId: string;
  scope?: string[];
  tokenType?: "oauth";
}

export async function resolveConnectorBearerToken(
  token: string,
  store: JsonStore
): Promise<{ sessionId: string; identity: ConnectorIdentity } | null> {
  if (!token) return null;
  if (token.startsWith("arc_refresh_") || token.startsWith("arc_code_")) return null;
  if (!token.startsWith("arc_")) return null;

  const digest = createHash("sha256").update(token).digest("hex");
  const identity = await store.getJSON<ConnectorIdentity>(`mcp:token:${digest}`);
  if (!identity?.subject || !identity.walletAddress || !identity.walletId) return null;

  const scopeKey = identity.scope?.slice().sort().join(",") || "manual";
  return { sessionId: `${identity.subject}:${scopeKey}`, identity };
}
