/**
 * ArcLancer OpenClaw Worker Dispatch
 * Routes heavy tasks (audits, code analysis, repo work) to the persistent
 * OpenClaw container on Railway instead of running them in Vercel's 60s window.
 * 
 * OpenClaw uses WebSocket RPC for real-time communication. For one-shot task
 * dispatch from Vercel, we use the gateway's HTTP health endpoint to verify
 * liveness and the WebSocket API to send the actual task.
 */

const OPENCLAW_WORKER_URL = (process.env.OPENCLAW_WORKER_URL || "").trim();

/** Keywords that indicate a heavy task requiring the OpenClaw worker */
const HEAVY_TASK_KEYWORDS = [
  "audit", "analyze", "review", "scan", "vulnerability",
  "slither", "foundry", "forge", "compile",
  "github", "repo", "repository", "clone",
  "execute a task", "execute task", "run task",
  "agent id", "agent_id",
  "smart contract", "solidity",
  "security review", "penetration",
  "deploy", "test suite",
];

/**
 * Check if the user's message should be routed to the OpenClaw worker
 */
export function isHeavyTask(userText: string): boolean {
  if (!OPENCLAW_WORKER_URL) return false;
  const lower = userText.toLowerCase();
  return HEAVY_TASK_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Check if the OpenClaw worker is configured and reachable
 */
export function isWorkerEnabled(): boolean {
  return OPENCLAW_WORKER_URL.length > 0;
}

/**
 * Verify the OpenClaw worker is alive via its /health endpoint
 */
export async function isWorkerHealthy(): Promise<boolean> {
  if (!OPENCLAW_WORKER_URL) return false;
  try {
    const res = await fetch(`${OPENCLAW_WORKER_URL}/health`, { method: "GET" });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Dispatch a task to the OpenClaw Worker.
 * 
 * Since OpenClaw uses WebSocket RPC (not REST), we verify liveness via /health
 * and return an acknowledgment. The actual processing happens asynchronously
 * on the worker — for Telegram delivery, the worker will use its own
 * channel bindings to respond directly.
 */
export async function dispatchToWorker(
  userText: string,
  chatId: string,
  fromId: number,
  store: import('./storage').JsonStore
): Promise<string> {
  if (!OPENCLAW_WORKER_URL) {
    throw new Error("OPENCLAW_WORKER_URL not configured");
  }

  console.log(`[openclaw-dispatch] Checking worker health at ${OPENCLAW_WORKER_URL}`);

  // 1. Verify the worker is alive
  const healthy = await isWorkerHealthy();
  if (!healthy) {
    throw new Error("OpenClaw worker is not responding. It may be restarting.");
  }

  // 2. Log and push the task to the Upstash Redis Job Queue
  console.log(`[openclaw-dispatch] Worker is healthy. Queuing task from chat ${chatId}: "${userText.slice(0, 100)}"`);

  await store.rpush("arclancer:jobs", {
    id: Date.now().toString(),
    chatId,
    fromId,
    userText,
    status: "pending",
    timestamp: Date.now()
  });

  // 3. Return acknowledgment — the OpenClaw gateway processes tasks
  //    asynchronously via its persistent daemon and channel bindings
  return [
    "✅ **OpenClaw Worker Status: ONLINE**",
    "",
    "🦞 Your task has been received by the ArcLancer Worker Node.",
    "",
    `📋 **Task:** ${userText.slice(0, 200)}`,
    "",
    "🔧 **Available Tools:**",
    "• Foundry (forge build, forge test)",
    "• Slither (static analysis)",  
    "• Git (clone, diff, patch)",
    "• Node.js runtime",
    "",
    "⏳ The persistent agent is processing your request.",
    "Results will be delivered to this chat when complete.",
    "",
    `_Worker: ${OPENCLAW_WORKER_URL}_`,
  ].join("\n");
}
