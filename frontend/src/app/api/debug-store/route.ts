import { NextResponse } from "next/server";

export async function GET() {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? "");
  
  const diag: Record<string, unknown> = {
    urlLength: url.length,
    urlPrefix: url.slice(0, 30),
    urlHasNewline: url.includes("\n") || url.includes("\r"),
    urlMatchesExpected: url === "https://valued-gnat-56547.upstash.io",
    tokenLength: token.trim().length,
    tokenPrefix: token.trim().slice(0, 10),
    tokenHasNewline: token.includes("\n") || token.includes("\r"),
    nodeEnv: process.env.NODE_ENV,
  };

  // Try a raw fetch to Upstash
  try {
    const testUrl = `${url.replace(/\/$/, "")}/ping`;
    const res = await fetch(testUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    const body = await res.text();
    diag.pingStatus = res.status;
    diag.pingBody = body.slice(0, 200);
  } catch (e) {
    diag.pingError = e instanceof Error ? e.message : "unknown";
  }

  return NextResponse.json(diag);
}
