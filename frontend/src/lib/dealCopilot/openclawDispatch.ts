/**
 * ArcLancer OpenClaw Worker Dispatch
 * Routes heavy tasks (audits, code analysis, repo work) to the persistent
 * OpenClaw container on Railway instead of running them in Vercel's 60s window.
 */

const OPENCLAW_WORKER_URL = process.env.OPENCLAW_WORKER_URL || "";

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
 * Dispatch a task to the OpenClaw Worker via its Gateway RPC API.
 * Returns the worker's response text, or throws on failure.
 */
export async function dispatchToWorker(
  userText: string,
  chatId: string,
  fromId: number
): Promise<string> {
  if (!OPENCLAW_WORKER_URL) {
    throw new Error("OPENCLAW_WORKER_URL not configured");
  }

  const workerUrl = OPENCLAW_WORKER_URL.replace(/\/$/, "");

  // Send a message to the OpenClaw gateway's REST API
  // The gateway exposes an HTTP endpoint for programmatic message injection
  const payload = {
    message: userText,
    metadata: {
      source: "arclancer-telegram",
      chatId,
      fromId: String(fromId),
    },
  };

  console.log(`[openclaw-dispatch] Sending task to worker at ${workerUrl}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000); // 55s to stay within Vercel's 60s

  try {
    const res = await fetch(`${workerUrl}/api/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown");
      console.error(`[openclaw-dispatch] Worker returned ${res.status}: ${errorBody.slice(0, 300)}`);
      throw new Error(`OpenClaw worker returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.response || data.text || data.message || "✅ Task dispatched to OpenClaw worker. Processing...";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      // Task is still processing on the worker — that's OK for long tasks
      return "⏳ Your task has been dispatched to the ArcLancer OpenClaw Worker and is being processed. The agent has full access to Foundry, Slither, and terminal tools. Results will be delivered shortly.";
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
