import { signToken } from "../../frontend/src/lib/dealCopilot/crypto.js";

export function getCopilotSecret(): string {
  return process.env.DEAL_COPILOT_SECRET?.trim() || "";
}

export function getAppOrigin(): string {
  return (
    process.env.APP_PUBLIC_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://arclancer.xyz"
  ).replace(/\/$/, "");
}

/** Signed URL for /create — user signs deploy with their Circle wallet in the browser. */
export function buildDraftCreateUrl(draftId: string, sessionId: string): string | null {
  const secret = getCopilotSecret();
  if (!secret) return null;
  const token = signToken({ draftId, chatId: sessionId, iat: Date.now() }, secret);
  const url = new URL("/create", getAppOrigin());
  url.searchParams.set("draft", token);
  return url.toString();
}
