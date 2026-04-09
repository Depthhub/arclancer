/**
 * ArcLancer AI Agent - Core agent loop powered by Gemma 4 via NVIDIA Build API.
 * Uses a ReAct-style tool-calling loop: user -> LLM -> tool_calls -> execute -> LLM -> response.
 */
import type { JsonStore } from "@/lib/dealCopilot/storage";
import type {
  AgentMessage,
  AgentConversation,
  BotReply,
  BotButton,
  DealCopilotState,
  AgentPendingAction,
} from "@/lib/dealCopilot/types";
import { AGENT_SYSTEM_PROMPT, AGENT_TOOL_DEFINITIONS } from "@/lib/dealCopilot/agentPrompt";
import { executeTool } from "@/lib/dealCopilot/agentTools";
import { getDealTtlSeconds } from "@/lib/dealCopilot/engine";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "google/gemma-4-26b-a4b-it";
const MAX_AGENT_ITERATIONS = 5;
const API_TIMEOUT_MS = 25000;
const MAX_CONVERSATION_MESSAGES = 20;
const CONVERSATION_TTL_SECONDS = 3600;

// Legacy Server Keys block removed — keys are strictly resolved upstream in byok.ts

// Always enabled — key check happens at call time (BYOK or server key)
export function isAgentEnabled(): boolean {
  return true;
}

/* ------------------------------------------------------------------ */
/* Conversation storage                                                */
/* ------------------------------------------------------------------ */

function conversationKey(chatId: string): string {
  return `agent:conversation:${chatId}`;
}

async function loadConversation(store: JsonStore, chatId: string): Promise<AgentMessage[]> {
  const conv = await store.getJSON<AgentConversation>(conversationKey(chatId));
  if (!conv) return [];
  return conv.messages.slice(-MAX_CONVERSATION_MESSAGES);
}

async function saveConversation(store: JsonStore, chatId: string, messages: AgentMessage[]): Promise<void> {
  const trimmed = messages.slice(-MAX_CONVERSATION_MESSAGES);
  await store.setJSON(
    conversationKey(chatId),
    { messages: trimmed, lastUpdated: Date.now() } satisfies AgentConversation,
    CONVERSATION_TTL_SECONDS
  );
}

/* ------------------------------------------------------------------ */
/* NVIDIA Build API call                                               */
/* ------------------------------------------------------------------ */

interface GemmaResponse {
  choices: Array<{
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct";
const LAST_RESORT_MODEL = "meta-llama/llama-3.1-8b-instruct";

async function callLLM(messages: AgentMessage[], apiKey: string): Promise<GemmaResponse> {
  if (!apiKey) throw new Error("No API key available.");

  const isGroq = apiKey.startsWith("gsk_");
  const apiUrl = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : OPENROUTER_API_URL;
  const modelsToTry = isGroq ? ["llama-3.3-70b-versatile"] : [MODEL_ID, FALLBACK_MODEL];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };
  if (!isGroq) {
    headers["HTTP-Referer"] = "https://arclancer.vercel.app";
    headers["X-Title"] = "ArcLancer Deal Copilot";
  }

  // Tier 1 & 2: Try models with tools. If hitting 429 or provider 400, try next model.
  let lastError = "";
  for (const model of modelsToTry) {
    const body = {
      model,
      messages,
      tools: AGENT_TOOL_DEFINITIONS,
      max_tokens: 2048,
      temperature: 0.3,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      lastError = fetchErr instanceof Error ? fetchErr.message : "Network error";
      console.log(`[agent] fetch error on ${model}: ${lastError}, trying next...`);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 401 || res.status === 403) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`LLM API Auth error ${res.status}: ${errBody.slice(0, 300)}`);
    }

    if (res.status === 429 || res.status === 400 || res.status === 402) {
      const errBody = await res.text().catch(() => "");
      lastError = `${res.status}: ${errBody.slice(0, 200)}`;
      console.log(`[agent] ${res.status} on ${model}: ${lastError.slice(0, 100)}, trying next...`);
      continue;
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`LLM API error ${res.status}: ${errBody.slice(0, 300)}`);
    }

    return (await res.json()) as GemmaResponse;
  }

  // Tier 3: use 8B WITHOUT tools to avoid malformed tool calls
  console.log("[agent] All primary models rate-limited, falling back to 8B text-only");
  const body = {
    model: LAST_RESORT_MODEL,
    messages,
    max_tokens: 2048,
    temperature: 0.3,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    throw new Error(fetchErr instanceof Error ? fetchErr.message : "Network error in fallback");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenRouter API error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  return (await res.json()) as GemmaResponse;
}

/* ------------------------------------------------------------------ */
/* Agent loop                                                          */
/* ------------------------------------------------------------------ */

export interface AgentResult {
  reply: BotReply;
  needsConfirmation?: boolean;
  pendingAction?: AgentPendingAction;
}

export async function runAgentLoop(
  store: JsonStore,
  chatId: string,
  fromId: number,
  userText: string,
  apiKey?: string
): Promise<AgentResult> {
  // Load conversation history
  const history = await loadConversation(store, chatId);

  // Build messages
  const messages: AgentMessage[] = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userText },
  ];

  // ReAct loop
  if (!apiKey) throw new Error("No API key configured for Copilot.");
  
  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    let response: GemmaResponse;
    try {
      response = await callLLM(messages, apiKey);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error calling AI";
      console.error("[agent] API error:", errMsg);
      return {
        reply: {
          text: "AI temporarily unavailable. Use /help for manual commands.\n\nError: " + errMsg.slice(0, 100),
          parseMode: "Markdown",
        },
      };
    }

    const choice = response.choices?.[0];
    if (!choice) {
      return {
        reply: { text: "No response from AI. Try again or use /help for commands.", parseMode: "Markdown" },
      };
    }

    const assistantMsg = choice.message;
    const toolCalls = assistantMsg.tool_calls;

    // Add assistant message to history
    const historyEntry: AgentMessage = {
      role: "assistant",
      content: assistantMsg.content,
    };
    if (toolCalls && toolCalls.length > 0) {
      historyEntry.tool_calls = toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      }));
    }
    messages.push(historyEntry);

    // If no tool calls -> final response
    if (!toolCalls || toolCalls.length === 0) {
      const text = assistantMsg.content || "I'm not sure how to help with that. Try /help.";

      // Save updated conversation
      const saveMsgs = messages.filter((m) => m.role !== "system");
      await saveConversation(store, chatId, saveMsgs);

      return { reply: { text, parseMode: "Markdown" } };
    }

    // Execute all tool calls
    for (const tc of toolCalls) {
      const toolResult = await executeTool(tc.function.name, tc.function.arguments, {
        store,
        chatId,
        fromId,
      });

      // Check if this is a confirmation request
      if (toolResult.startsWith("CONFIRMATION_NEEDED:")) {
        // Save conversation up to this point
        const saveMsgs = messages.filter((m) => m.role !== "system");
        // Add the tool result
        saveMsgs.push({
          role: "tool",
          content: toolResult,
          tool_call_id: tc.id,
        });
        await saveConversation(store, chatId, saveMsgs);

        // Load pending action from state
        const stateKey = `dealCopilot:state:${chatId}`;
        const state = await store.getJSON<DealCopilotState>(stateKey);
        const pendingAction = state?.draft?.pendingAction;

        const confirmText = toolResult.replace("CONFIRMATION_NEEDED: ", "");
        const buttons: BotButton[][] = [
          [
            { text: "Confirm", callback_data: "agent_confirm" },
            { text: "Cancel", callback_data: "agent_cancel" },
          ],
        ];

        return {
          reply: {
            text: `**Confirmation Required**\n\n${confirmText}\n\nTap **Confirm** to proceed or **Cancel** to abort.`,
            buttons,
            parseMode: "Markdown",
          },
          needsConfirmation: true,
          pendingAction: pendingAction || undefined,
        };
      }

      // Add tool result to messages
      messages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: tc.id,
      });
    }

    // Continue loop - LLM will process tool results
  }

  // Max iterations reached
  const saveMsgs = messages.filter((m) => m.role !== "system");
  await saveConversation(store, chatId, saveMsgs);

  return {
    reply: {
      text: "I've reached my processing limit for this request. Please try a simpler command or use /help.",
      parseMode: "Markdown",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Confirmation handler                                                */
/* ------------------------------------------------------------------ */

export async function handleAgentConfirmation(
  store: JsonStore,
  chatId: string,
  fromId: number,
  confirmed: boolean
): Promise<BotReply> {
  const stateKey = `dealCopilot:state:${chatId}`;
  const state = await store.getJSON<DealCopilotState>(stateKey);

  if (!state?.draft?.pendingAction) {
    return { text: "No pending action to confirm.", parseMode: "Markdown" };
  }

  const action = state.draft.pendingAction;

  // Clear pending action
  const draft = { ...state.draft, pendingAction: undefined, updatedAt: Date.now() };
  await store.setJSON(stateKey, { stage: "review" as const, draft }, getDealTtlSeconds());

  if (!confirmed) {
    // Add cancellation to conversation
    const history = await loadConversation(store, chatId);
    history.push({ role: "user", content: "I cancelled the action." });
    await saveConversation(store, chatId, history);

    return { text: "Action cancelled.", parseMode: "Markdown" };
  }

  // Execute the confirmed action
  try {
    const result = await executeConfirmedAction(store, chatId, fromId, action);

    // Add result to conversation
    const history = await loadConversation(store, chatId);
    history.push({ role: "user", content: "I confirmed the action." });
    history.push({ role: "assistant", content: result });
    await saveConversation(store, chatId, history);

    return { text: result, parseMode: "Markdown" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { text: "Action failed: " + msg.slice(0, 200), parseMode: "Markdown" };
  }
}

/* ------------------------------------------------------------------ */
/* Execute confirmed on-chain actions                                  */
/* ------------------------------------------------------------------ */

async function executeConfirmedAction(
  store: JsonStore,
  chatId: string,
  fromId: number,
  action: AgentPendingAction
): Promise<string> {
  // Import executors dynamically to avoid circular deps
  const { getWallet, getPrivateKey, isWalletEnabled } = await import("@/lib/dealCopilot/wallet");
  const {
    createEscrowContract,
    fundContract,
    submitMilestone,
    approveMilestone,
    releaseMilestonePayment,
    initiateDispute,
    cancelContract,
  } = await import("@/lib/dealCopilot/executor");
  const {
    registerAgentIdentity,
    createAgenticJob,
    fundAgenticJob,
    submitAgenticDeliverable,
    completeAgenticJob,
  } = await import("@/lib/dealCopilot/arcAgent");

  if (!isWalletEnabled()) {
    return "Wallet features not enabled.";
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    return "No wallet found. Use /wallet to create one first.";
  }
  const pk = getPrivateKey(wallet, fromId);

  const p = action.params;

  switch (action.type) {
    case "deploy_contract": {
      const stateKey = `dealCopilot:state:${chatId}`;
      const cState = await store.getJSON<DealCopilotState>(stateKey);
      if (!cState?.draft) return "No deal draft found.";
      const result = await createEscrowContract(pk, cState.draft);
      if (result.success) {
        const updatedDraft = { ...cState.draft, lastContractAddress: result.contractAddress, updatedAt: Date.now() };
        await store.setJSON(stateKey, { stage: "review" as const, draft: updatedDraft }, getDealTtlSeconds());
        const lines = [
          "**Contract Created!**",
          "Contract: " + (result.contractAddress || ""),
          "Tx: " + (result.hash?.slice(0, 14) || "") + "...",
          "",
          "Next: ask me to **fund** the contract.",
        ];
        if (result.explorerUrl) lines.push(result.explorerUrl);
        return lines.join("\n");
      }
      return "Contract creation failed: " + (result.error || "unknown");
    }

    case "fund_contract": {
      const stateKey = `dealCopilot:state:${chatId}`;
      const cState = await store.getJSON<DealCopilotState>(stateKey);
      let addr = (p.contract_address as string) || cState?.draft?.lastContractAddress || "";
      if (!addr) return "Funding failed: No contract address provided or available in state.";

      const result = await fundContract(pk, addr);
      if (result.success) {
        return "**Contract Funded!**\nTx: " + (result.hash?.slice(0, 14) || "") + "...\n" + (result.explorerUrl || "");
      }
      return "Funding failed: " + (result.error || "unknown");
    }

    case "submit_milestone": {
      const stateKey = `dealCopilot:state:${chatId}`;
      const cState = await store.getJSON<DealCopilotState>(stateKey);
      let addr = (p.contract_address as string) || cState?.draft?.lastContractAddress || "";
      if (!addr) return "Submit failed: No contract address provided or available in state.";

      const idx = (p.milestone_index as number) || 0;
      const uri = (p.deliverable_uri as string) || "";
      const result = await submitMilestone(pk, addr, idx, uri);
      if (result.success) {
        return "**Milestone " + (idx + 1) + " Submitted!**\nDeliverable: " + uri + "\nTx: " + (result.hash?.slice(0, 14) || "") + "...";
      }
      return "Submit failed: " + (result.error || "unknown");
    }

    case "approve_milestone": {
      const stateKey = `dealCopilot:state:${chatId}`;
      const cState = await store.getJSON<DealCopilotState>(stateKey);
      let addr = (p.contract_address as string) || cState?.draft?.lastContractAddress || "";
      if (!addr) return "Approval failed: No contract address provided or available in state.";

      const idx = (p.milestone_index as number) || 0;
      const result = await approveMilestone(pk, addr, idx);
      if (result.success) {
        const releaseResult = await releaseMilestonePayment(pk, addr, idx);
        if (releaseResult.success) {
          return "**Milestone " + (idx + 1) + " Approved & Paid!**\nApprove Tx: " + (result.hash?.slice(0, 14) || "") + "...\nRelease Tx: " + (releaseResult.hash?.slice(0, 14) || "") + "...";
        }
        return "Approved but payment release failed. Use /withdraw " + (idx + 1) + " to retry.";
      }
      return "Approval failed: " + (result.error || "unknown");
    }

    case "release_payment": {
      const stateKey = `dealCopilot:state:${chatId}`;
      const cState = await store.getJSON<DealCopilotState>(stateKey);
      let addr = (p.contract_address as string) || cState?.draft?.lastContractAddress || "";
      if (!addr) return "Release failed: No contract address provided or available in state.";

      const idx = (p.milestone_index as number) || 0;
      const result = await releaseMilestonePayment(pk, addr, idx);
      if (result.success) {
        return "**Payment Released!**\nTx: " + (result.hash?.slice(0, 14) || "") + "...";
      }
      return "Release failed: " + (result.error || "unknown");
    }

    case "initiate_dispute": {
      const stateKey = `dealCopilot:state:${chatId}`;
      const cState = await store.getJSON<DealCopilotState>(stateKey);
      let addr = (p.contract_address as string) || cState?.draft?.lastContractAddress || "";
      if (!addr) return "Dispute failed: No contract address provided or available in state.";

      const result = await initiateDispute(pk, addr);
      if (result.success) {
        return "**Dispute Initiated**\nTx: " + (result.hash?.slice(0, 14) || "") + "...";
      }
      return "Dispute failed: " + (result.error || "unknown");
    }

    case "cancel_contract": {
      const stateKey = `dealCopilot:state:${chatId}`;
      const cState = await store.getJSON<DealCopilotState>(stateKey);
      let addr = (p.contract_address as string) || cState?.draft?.lastContractAddress || "";
      if (!addr) return "Cancel failed: No contract address provided or available in state.";

      const result = await cancelContract(pk, addr);
      if (result.success) {
        return "**Contract Cancelled**\nTx: " + (result.hash?.slice(0, 14) || "") + "...";
      }
      return "Cancel failed: " + (result.error || "unknown");
    }

    case "register_agent": {
      const result = await registerAgentIdentity(pk, {
        name: (p.name as string) || "ArcLancer Copilot",
        description: (p.description as string) || "AI escrow agent",
        agent_type: (p.agent_type as string) || "escrow",
        capabilities: (p.capabilities as string[]) || ["deal_creation", "escrow_management"],
      });
      if (result.success) {
        const lines = [
          "**Agent Registered!**",
          "Agent ID: " + (result.agentId || ""),
          "Tx: " + (result.txHash?.slice(0, 14) || "") + "...",
        ];
        if (result.explorerUrl) lines.push(result.explorerUrl);
        return lines.join("\n");
      }
      return "Registration failed: " + (result.error || "unknown");
    }

    case "create_erc8183_job": {
      const result = await createAgenticJob(pk, {
        providerAddress: (p.provider_address as string) || "",
        description: (p.description as string) || "",
        budgetUsdc: (p.budget_usdc as number) || 0,
        expiryHours: (p.expiry_hours as number) || 24,
      });
      if (result.success) {
        const lines = [
          "**ERC-8183 Job Created!**",
          "Job ID: " + (result.jobId || ""),
          "Tx: " + (result.txHash?.slice(0, 14) || "") + "...",
        ];
        if (result.explorerUrl) lines.push(result.explorerUrl);
        return lines.join("\n");
      }
      return "Job creation failed: " + (result.error || "unknown");
    }

    case "fund_erc8183_job": {
      const jobId = (p.job_id as string) || "";
      const budget = (p.budget_usdc as number) || 0;
      const result = await fundAgenticJob(pk, jobId, budget);
      if (result.success) {
        return "**Job Funded!**\nTx: " + (result.txHash?.slice(0, 14) || "") + "...";
      }
      return "Funding failed: " + (result.error || "unknown");
    }

    case "submit_erc8183_deliverable": {
      const jobId = (p.job_id as string) || "";
      const content = (p.deliverable as string) || "";
      const result = await submitAgenticDeliverable(pk, jobId, content);
      if (result.success) {
        return "**Deliverable Submitted!**\nTx: " + (result.txHash?.slice(0, 14) || "") + "...";
      }
      return "Submit failed: " + (result.error || "unknown");
    }

    case "complete_erc8183_job": {
      const jobId = (p.job_id as string) || "";
      const reason = (p.reason as string) || "approved";
      const result = await completeAgenticJob(pk, jobId, reason);
      if (result.success) {
        return "**Job Completed!**\nTx: " + (result.txHash?.slice(0, 14) || "") + "...";
      }
      return "Completion failed: " + (result.error || "unknown");
    }

    default:
      return "Unknown action type: " + action.type;
  }
}
