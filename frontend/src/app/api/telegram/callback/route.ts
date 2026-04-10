import { NextResponse } from "next/server";
import { telegramSendMessage } from "@/lib/dealCopilot/telegram";

export const runtime = "nodejs";

/**
 * POST /api/telegram/callback
 * 
 * Used by the OpenClaw Worker to deliver the results of heavy, long-running
 * agentic tasks (like smart contract audits) back to the user on Telegram.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, text, secret } = body;

    // Very basic protection to ensure only our worker can call this
    const expectedSecret = process.env.OPENCLAW_WORKER_SECRET || "arclancer-worker-secret-2026";
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!chatId || !text) {
      return NextResponse.json({ error: "Missing chatId or text" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("[telegram-callback] Missing TELEGRAM_BOT_TOKEN");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Send the execution result back to the user on Telegram
    await telegramSendMessage({
      token,
      chatId,
      reply: { text, parseMode: "Markdown" },
    });

    return NextResponse.json({ ok: true, delivered: true });
  } catch (e) {
    console.error("[telegram-callback] Error delivering message:", e);
    return NextResponse.json({ error: "Delivery failed" }, { status: 500 });
  }
}
