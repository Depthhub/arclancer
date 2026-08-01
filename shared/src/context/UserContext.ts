import type { JsonStore } from "../store/types.js";

export type AuthMode = "mcp" | "telegram";

export interface UserContext {
  /** Session or chat identifier used for deal draft state keys */
  sessionId: string;
  /** Numeric user id for wallet storage (Telegram fromId or MCP hash) */
  userId: number;
  authMode: AuthMode;
  /** Circle user-controlled wallet linked to this MCP identity. */
  walletAddress?: `0x${string}`;
  circleWalletId?: string;
}

export interface ToolExecutionContext {
  store: JsonStore;
  chatId: string;
  fromId: number;
}

export function userContextToToolContext(
  ctx: UserContext,
  store: JsonStore
): ToolExecutionContext {
  return {
    store,
    chatId: ctx.sessionId,
    fromId: ctx.userId,
  };
}

function hashToUserId(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

/** Build a stable UserContext for MCP stdio/HTTP sessions */
export function createMcpUserContext(
  sessionId?: string,
  wallet?: { address?: string; walletId?: string }
): UserContext {
  const sid =
    sessionId?.trim() ||
    process.env.MCP_SESSION_ID?.trim() ||
    process.env.MCP_USER_ID?.trim() ||
    "mcp-default";
  return {
    sessionId: sid.startsWith("mcp-") ? sid : `mcp-${sid}`,
    userId: hashToUserId(sid),
    authMode: "mcp",
    walletAddress:
      wallet?.address && /^0x[a-fA-F0-9]{40}$/.test(wallet.address)
        ? (wallet.address as `0x${string}`)
        : undefined,
    circleWalletId: wallet?.walletId,
  };
}

/** Build UserContext from Telegram webhook identifiers */
export function createTelegramUserContext(
  chatId: string,
  fromId: number
): UserContext {
  return {
    sessionId: chatId,
    userId: fromId,
    authMode: "telegram",
  };
}
