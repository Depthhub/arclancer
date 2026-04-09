import { NextResponse } from "next/server";
import { getJsonStore } from "@/lib/dealCopilot/storage";
import { verifyToken } from "@/lib/dealCopilot/crypto";
import { buildCreatePrefill, getCopilotSecret, getDealTtlSeconds } from "@/lib/dealCopilot/engine";
import type { DealCopilotState, DealDraft } from "@/lib/dealCopilot/types";

export const runtime = "nodejs";

function storeKey(chatId: string) {
  return `dealCopilot:state:${chatId}`;
}

// NOTE: This MVP keeps drafts inside the same per-chat state entry.
// The resolve token includes the draftId, but we still need to find it.
// We therefore also accept chatId in the token to locate the draft deterministically.
type ResolveToken = {
  draftId: string;
  chatId?: string;
  iat?: number;
};

export async function POST(req: Request) {
  const secret = getCopilotSecret();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Missing DEAL_COPILOT_SECRET" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  const decoded = verifyToken<ResolveToken>(token, secret);
  if (!decoded?.draftId) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

  const store = getJsonStore();

  // If chatId is provided, we can look up directly; otherwise we can't find state safely in MVP.
  if (!decoded.chatId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Token missing chatId. Regenerate with updated server. (MVP requires chatId to resolve drafts.)",
      },
      { status: 400 }
    );
  }

  const state = await store.getJSON<DealCopilotState>(storeKey(decoded.chatId));
  const draft = state?.draft;
  if (!draft || draft.id !== decoded.draftId) {
    return NextResponse.json({ ok: false, error: "Draft not found or expired" }, { status: 404 });
  }

  // Refresh TTL on successful resolve
  await store.setJSON(storeKey(decoded.chatId), state, getDealTtlSeconds());

  const prefill = buildCreatePrefill(draft as DealDraft);
  return NextResponse.json({ ok: true, draft: prefill });
}

