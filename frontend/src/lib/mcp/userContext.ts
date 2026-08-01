import type { JsonStore } from "@/lib/dealCopilot/storage";

export type AuthMode = "mcp" | "telegram";

export interface UserContext {
  sessionId: string;
  userId: number;
  authMode: AuthMode;
  walletAddress?: `0x${string}`;
  circleWalletId?: string;
  scopes?: string[];
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
