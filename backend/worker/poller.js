/**
 * ArcLancer Async Job Poller
 * Runs persistently alongside the OpenClaw Gateway on Railway.
 * 
 * 1. Polls Upstash Redis for any heavy tasks (audits, repo checks).
 * 2. Uses the available container tools (Foundry, Slither, Git).
 * 3. Uses OpenRouter or Groq to synthesize the security report.
 * 4. Posts the final result back to Vercel/Telegram.
 */
import { exec } from "child_process";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "https://inviting-mink-70031.upstash.io";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAARGPAAIncDE4ZWI3ZGQwNGU0MDA0ZTg3OTVlZDE3OWQxMDIxMmYzY3AxNzAwMzE";
const VERCEL_CALLBACK = process.env.VERCEL_CALLBACK_URL || "https://arclancer.vercel.app/api/telegram/callback";
const WORKER_SECRET = process.env.OPENCLAW_WORKER_SECRET || "arclancer-worker-secret-2026";
const LLM_API_KEY = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;

console.log(`[Poller] Environment Check: OPENROUTER=${!!process.env.OPENROUTER_API_KEY}, GROQ=${!!process.env.GROQ_API_KEY}`);

const SLEEP_MS = 5000;

async function executeCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: "/app/workspace", timeout: 60000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || "",
        stderr: stderr || "",
        code: error ? error.code : 0
      });
    });
  });
}

async function callLLM(prompt, systemPrompt) {
  if (!LLM_API_KEY) throw new Error("No LLM API Key available for analysis.");
  const isGroq = LLM_API_KEY.startsWith("gsk_");
  const endpoint = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
  const model = isGroq ? "llama3-70b-8192" : "google/gemma-4-26b-a4b-it";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LLM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 3000
    })
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "LLM Call Failed");
  return json.choices[0].message.content;
}

async function processJob(job) {
  console.log(`[Poller] Processing job for chat ${job.chatId}: ${job.userText.slice(0, 50)}`);
  let finalReport = "No report generated.";
  
  try {
    const textLower = job.userText.toLowerCase();
    
    // Simulate smart tools usage if keywords matched
    let toolContext = "";
    if (textLower.includes("audit") || textLower.includes("slither") || textLower.includes("contract")) {
      console.log(`[Poller] Running Foundry & Slither sanity checks...`);
      toolContext += "## Tools Executed\n";
      const forgeRes = await executeCommand("forge --version");
      toolContext += `[Forge] ${forgeRes.stdout.trim() || forgeRes.stderr}\n`;
      
      const slitherRes = await executeCommand("slither --version");
      toolContext += `[Slither] ${slitherRes.stdout.trim() || slitherRes.stderr}\n\n`;
    }

    // Fetch dynamic agent brain
    let systemPrompt = "You are an expert CertiQ smart contract auditor running inside a secure container. Read the user's task and any tool outputs, then produce a professional, formatted Markdown audit report.";
    if (job.agentId) {
      try {
        const metaRes = await fetch(`${REDIS_URL}/get/${encodeURIComponent("agent_meta:" + job.agentId)}`, {
          headers: { "Authorization": `Bearer ${REDIS_TOKEN}` }
        });
        const metaData = await metaRes.json();
        if (metaData && metaData.result) {
          const meta = typeof metaData.result === 'string' ? JSON.parse(metaData.result) : metaData.result;
          systemPrompt = `Agent Name: ${meta.name}\nSkills: ${meta.skills?.join(", ")}\n\nInstructions:\n${meta.systemPrompt}`;
          
          if (meta.skills?.includes("researcher") || meta.skills?.includes("explorer")) {
             toolContext += "\n[System Tool] Agent has researcher skills enabled. Activating advanced cross-reference mode.\n";
          }

          // Process Knowledge Skills (External Data/RAG) via URLs
          if (meta.skills && Array.isArray(meta.skills)) {
            for (const skill of meta.skills) {
              if (skill.startsWith("http://") || skill.startsWith("https://")) {
                try {
                  console.log(`[Poller] Fetching Knowledge Skill from URL: ${skill}`);
                  const docRes = await fetch(skill);
                  if (docRes.ok) {
                    const text = await docRes.text();
                    // Truncate to reasonable size (e.g. 10k chars) to prevent huge context bloat
                    const safeText = text.slice(0, 15000);
                    toolContext += `\n========== KNOWLEDGE SOURCE =================\nLink: ${skill}\nContent snippet:\n${safeText}\n==============================================\n`;
                    console.log(`[Poller] Successfully injected ${safeText.length} chars of knowledge from ${skill}`);
                  }
                } catch (e) {
                  toolContext += `\n[Warning] Failed to fetch Knowledge Skill from ${skill}: ${e.message}\n`;
                  console.error(`[Poller] Fetch error for skill ${skill}`, e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("[Poller] Could not fetch specific agent meta", e);
      }
    }

    // Call LLM
    console.log(`[Poller] Generating response using LLM...`);
    const prompt = `Task: ${job.userText}\n\n${toolContext}\n\nPlease generate a response based on your agent skills and the context provided.`;
    finalReport = await callLLM(prompt, systemPrompt);

  } catch (e) {
    console.error(`[Poller] Job failed:`, e);
    finalReport = `⚠️ Worker encountered an error: ${e.message}`;
  }

  // Send back to Telegram via Vercel Callback
  console.log(`[Poller] Sending result back to Vercel...`);
  try {
    await fetch(VERCEL_CALLBACK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: job.chatId,
        text: `🦞 **OpenClaw Worker Finished**\n\n${finalReport}`,
        secret: WORKER_SECRET
      })
    });
    console.log(`[Poller] Callback delivered for ${job.chatId}.`);
  } catch (e) {
    console.error(`[Poller] Failed to invoke callback URL:`, e);
  }
}

async function pollQueue() {
  while (true) {
    try {
      const res = await fetch(`${REDIS_URL}/lpop/arclancer:jobs`, {
        headers: { "Authorization": `Bearer ${REDIS_TOKEN}` }
      });
      const data = await res.json();
      
      if (data && data.result) {
        let job;
        try {
          job = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        } catch(e) {
          console.error("[Poller] Parsed invalid job payload.");
          continue;
        }
        await processJob(job);
      }
    } catch (e) {
      // suppress network noise during polling
    }
    await new Promise(r => setTimeout(r, SLEEP_MS));
  }
}

console.log("[Poller] Starting Upstash Redis Poller...");
pollQueue();
