import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 55;

const OPENCLAW_WORKER_URL = process.env.OPENCLAW_WORKER_URL || "";

/**
 * GET /api/test-worker?q=your+message+here
 * 
 * Simple test endpoint that sends a message to the OpenClaw gateway
 * and returns whatever it responds with. Use this to verify the worker is alive.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "Hello, what can you do?";

  if (!OPENCLAW_WORKER_URL) {
    return NextResponse.json({
      status: "error",
      message: "OPENCLAW_WORKER_URL not configured in Vercel env vars",
    }, { status: 500 });
  }

  const workerBase = OPENCLAW_WORKER_URL.replace(/\/$/, "");

  // First check if the worker is alive
  let healthStatus = "unknown";
  try {
    const healthRes = await fetch(workerBase, { method: "GET" });
    healthStatus = `HTTP ${healthRes.status}`;
  } catch (e) {
    healthStatus = `unreachable: ${e instanceof Error ? e.message : "unknown"}`;
  }

  // Try to interact with the gateway via common API paths
  const results: Record<string, string> = {};
  const paths = [
    "/api/v1/status",
    "/api/v1/health",
    "/api/message",
    "/api/chat",
    "/v1/chat/completions",
    "/rpc",
    "/health",
    "/status",
  ];

  for (const path of paths) {
    try {
      const res = await fetch(`${workerBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      const text = await res.text();
      results[path] = `${res.status}: ${text.slice(0, 200)}`;
    } catch (e) {
      results[path] = `error: ${e instanceof Error ? e.message : "unknown"}`;
    }
  }

  return NextResponse.json({
    status: "ok",
    worker_url: workerBase,
    worker_health: healthStatus,
    query,
    endpoint_scan: results,
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}
