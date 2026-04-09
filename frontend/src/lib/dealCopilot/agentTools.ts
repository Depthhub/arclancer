/**
 * Agent Tool Executor — Bridge between LLM tool calls and existing codebase.
 * Each function takes structured params from Gemma 4 and calls existing helpers.
 */
import type { JsonStore } from "@/lib/dealCopilot/storage";
import { resolveApiKey } from "@/lib/dealCopilot/byok";
import type { DealCopilotState, DealDraft, AgentPendingAction, AgentPendingActionType } from "@/lib/dealCopilot/types";
import { formatDollars } from "@/lib/utils";
import { randomId } from "@/lib/dealCopilot/crypto";
import {
  getOrCreateWallet,
  getWallet,
  getPrivateKey,
  isWalletEnabled,
} from "@/lib/dealCopilot/wallet";
import { checkBalance } from "@/lib/dealCopilot/executor";
import {
  fetchContractDetails,
  fetchUserContracts,
  formatContractSummary,
  formatContractList,
  fetchRegisteredAgents,
} from "@/lib/dealCopilot/chain";
import {
  registerAgentIdentity,
  lookupAgentIdentity,
  getAgenticJobInfo,
} from "@/lib/dealCopilot/arcAgent";
import { getDealTtlSeconds } from "@/lib/dealCopilot/engine";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function storeKey(chatId: string) {
  return `dealCopilot:state:${chatId}`;
}

function looksLikeEthAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

/* ------------------------------------------------------------------ */
/* Tool executors                                                      */
/* ------------------------------------------------------------------ */

export async function executeCreateWallet(
  store: JsonStore,
  fromId: number
): Promise<string> {
  if (!isWalletEnabled()) {
    return "❌ Wallet features are not enabled. The server needs WALLET_ENCRYPTION_SECRET configured.";
  }
  const { wallet, created } = await getOrCreateWallet(store, fromId);
  if (created) {
    return [
      `🔐 **New Wallet Created!**`,
      `📍 Address: \`${wallet.address}\``,
      `💡 Send USDC to this address to start using ArcLancer.`,
      `Explorer: https://testnet.arcscan.app/address/${wallet.address}`,
    ].join("\n");
  }
  return [
    `👛 **Your Wallet**`,
    `📍 Address: \`${wallet.address}\``,
    `Created: ${new Date(wallet.createdAt).toLocaleDateString()}`,
    `Explorer: https://testnet.arcscan.app/address/${wallet.address}`,
  ].join("\n");
}

export async function executeCheckBalance(
  store: JsonStore,
  fromId: number
): Promise<string> {
  if (!isWalletEnabled()) return "❌ Wallet not enabled.";
  const wallet = await getWallet(store, fromId);
  if (!wallet) return "No wallet found. Ask me to create one first.";
  const balance = await checkBalance(wallet.address);
  return `💰 Balance: **$${balance.toFixed(2)} USDC**\n📍 \`${wallet.address.slice(0, 10)}…${wallet.address.slice(-8)}\``;
}

export async function executeGetDepositAddress(
  store: JsonStore,
  fromId: number
): Promise<string> {
  if (!isWalletEnabled()) return "❌ Wallet not enabled.";
  const wallet = await getWallet(store, fromId);
  if (!wallet) return "No wallet found. Ask me to create one first.";
  return [
    `📥 **Deposit USDC**`,
    `Send USDC (Arc Testnet) to:`,
    `\`${wallet.address}\``,
    `🚰 Faucet: https://faucet.circle.com`,
  ].join("\n");
}

export async function executeCreateDealDraft(
  store: JsonStore,
  chatId: string,
  params: {
    freelancer_address: string;
    total_amount: number;
    currency?: string;
    milestones: Array<{ amount: number; description: string }>;
  }
): Promise<string> {
  const key = storeKey(chatId);

  if (!looksLikeEthAddress(params.freelancer_address)) {
    return "❌ Invalid freelancer address. Please provide a valid 0x address.";
  }
  if (!params.total_amount || params.total_amount <= 0) {
    return "❌ Total amount must be positive.";
  }
  if (!params.milestones || params.milestones.length === 0) {
    return "❌ At least one milestone is required.";
  }

  const fee = params.total_amount * 0.02;
  const net = params.total_amount - fee;
  const milestonesSum = params.milestones.reduce((s, m) => s + m.amount, 0);

  const draft: DealDraft = {
    id: randomId("deal"),
    chatId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    payoutCurrency: (params.currency?.toUpperCase() === "EURC" ? "EURC" : "USDC") as "USDC" | "EURC",
    totalAmount: Math.round(params.total_amount * 100) / 100,
    freelancerAddress: params.freelancer_address.trim(),
    milestones: params.milestones.map((m) => ({
      amount: Math.round(m.amount * 100) / 100,
      description: m.description,
    })),
    desiredMilestonesCount: params.milestones.length,
  };

  const state: DealCopilotState = { stage: "review", draft };
  await store.setJSON(key, state, getDealTtlSeconds());

  const match = Math.abs(milestonesSum - net) < 0.01;
  const lines = [
    `📋 **Deal Draft Created!**`,
    ``,
    `👷 Freelancer: \`${draft.freelancerAddress.slice(0, 10)}…${draft.freelancerAddress.slice(-8)}\``,
    `💵 Total (gross): ${formatDollars(draft.totalAmount)}`,
    `💳 Platform fee (2%): ${formatDollars(fee)}`,
    `💰 Net to freelancer: ${formatDollars(net)}`,
    `🏦 Currency: ${draft.payoutCurrency}`,
    ``,
    `📌 **Milestones** (${draft.milestones.length})`,
  ];
  draft.milestones.forEach((m, i) => {
    lines.push(`  ${i + 1}. ${m.description} — ${formatDollars(m.amount)}`);
  });
  lines.push(``, `${match ? "✅" : "⚠️"} Milestones total: ${formatDollars(milestonesSum)} (net: ${formatDollars(net)})`);
  if (!match) {
    lines.push(`⚠️ Milestones don't sum to net amount. Please adjust.`);
  }
  return lines.join("\n");
}

export async function executeShowDealSummary(
  store: JsonStore,
  chatId: string
): Promise<string> {
  const key = storeKey(chatId);
  const state = await store.getJSON<DealCopilotState>(key);
  if (!state?.draft) return "No active deal draft. Ask me to create one!";

  const d = state.draft;
  const fee = d.totalAmount * 0.02;
  const net = d.totalAmount - fee;
  const sum = d.milestones.reduce((s, m) => s + m.amount, 0);
  const lines = [
    `📋 **Deal Draft Summary**`,
    ``,
    `👷 Freelancer: \`${d.freelancerAddress || "(missing)"}\``,
    `💵 Total: ${d.totalAmount ? formatDollars(d.totalAmount) : "(missing)"}`,
    `💳 Fee (2%): ${d.totalAmount ? formatDollars(fee) : "n/a"}`,
    `💰 Net: ${d.totalAmount ? formatDollars(net) : "n/a"}`,
    `🏦 Currency: ${d.payoutCurrency}`,
    ``,
    `📌 **Milestones** (${d.milestones.length})`,
  ];
  if (d.milestones.length === 0) lines.push(`  (none)`);
  d.milestones.forEach((m, i) => {
    lines.push(`  ${i + 1}. ${m.description || "(no desc)"} — ${formatDollars(m.amount)}`);
  });
  if (d.totalAmount > 0) {
    const ok = Math.abs(sum - net) < 0.01;
    lines.push(``, `${ok ? "✅" : "⚠️"} Milestones total: ${formatDollars(sum)} (must = ${formatDollars(net)})`);
  }
  return lines.join("\n");
}

export async function executeEditDeal(
  store: JsonStore,
  chatId: string,
  params: { field: string; value: string }
): Promise<string> {
  const key = storeKey(chatId);
  const state = await store.getJSON<DealCopilotState>(key);
  if (!state?.draft) return "No active deal. Create one first.";

  const draft = { ...state.draft, updatedAt: Date.now() };

  switch (params.field) {
    case "currency": {
      const v = params.value.toUpperCase();
      draft.payoutCurrency = v === "EURC" ? "EURC" : "USDC";
      break;
    }
    case "total": {
      const n = parseFloat(params.value.replace(/[$,]/g, ""));
      if (isNaN(n) || n <= 0) return "Invalid amount.";
      draft.totalAmount = Math.round(n * 100) / 100;
      break;
    }
    case "address": {
      if (!looksLikeEthAddress(params.value)) return "Invalid address format.";
      draft.freelancerAddress = params.value.trim();
      break;
    }
    case "milestone": {
      // Format: "index amount description"
      const parts = params.value.match(/^(\d+)\s+([\d.]+)\s+(.+)$/);
      if (!parts) return "Format: 'index amount description' (e.g. '2 500 Testing')";
      const idx = parseInt(parts[1]) - 1;
      if (idx < 0 || idx >= draft.milestones.length) return `Milestone ${idx + 1} doesn't exist.`;
      draft.milestones = [...draft.milestones];
      draft.milestones[idx] = { amount: Math.round(parseFloat(parts[2]) * 100) / 100, description: parts[3] };
      break;
    }
    default:
      return `Unknown field: ${params.field}`;
  }

  await store.setJSON(key, { stage: "review" as const, draft }, getDealTtlSeconds());
  return `✅ Updated ${params.field}. Use show_deal_summary to review.`;
}

export async function executeRequestConfirmation(
  store: JsonStore,
  chatId: string,
  params: {
    action_type: AgentPendingActionType;
    description: string;
    params?: Record<string, unknown>;
  }
): Promise<string> {
  const key = storeKey(chatId);
  const state = await store.getJSON<DealCopilotState>(key);
  const draft = state?.draft ?? {
    id: randomId("deal"),
    chatId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    payoutCurrency: "USDC" as const,
    totalAmount: 0,
    freelancerAddress: "",
    milestones: [],
  };

  const pendingAction: AgentPendingAction = {
    type: params.action_type,
    params: params.params || {},
    description: params.description,
  };

  draft.pendingAction = pendingAction;
  draft.updatedAt = Date.now();
  await store.setJSON(key, { stage: "agent_confirming" as const, draft }, getDealTtlSeconds());

  return `CONFIRMATION_NEEDED: ${params.description}`;
}

export async function executeCheckContractStatus(
  store: JsonStore,
  chatId: string,
  params: { contract_address?: string }
): Promise<string> {
  let addr = params.contract_address;
  if (!addr) {
    const key = storeKey(chatId);
    const state = await store.getJSON<DealCopilotState>(key);
    addr = state?.draft?.lastContractAddress;
  }
  if (!addr || !looksLikeEthAddress(addr)) {
    return "Please provide a contract address (0x...).";
  }
  try {
    const details = await fetchContractDetails(addr);
    return formatContractSummary(details);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return `❌ Could not fetch contract: ${msg.slice(0, 200)}`;
  }
}

export async function executeListContracts(
  store: JsonStore,
  fromId: number,
  params: { wallet_address?: string }
): Promise<string> {
  let addr = params.wallet_address;
  if (!addr && isWalletEnabled()) {
    const wallet = await getWallet(store, fromId);
    if (wallet) addr = wallet.address;
  }
  if (!addr || !looksLikeEthAddress(addr)) {
    return "Please provide a wallet address or create a wallet first.";
  }
  try {
    const contracts = await fetchUserContracts(addr);
    return formatContractList(addr, contracts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return `❌ Could not fetch contracts: ${msg.slice(0, 200)}`;
  }
}

export async function executeRegisterAgentIdentity(
  store: JsonStore,
  chatId: string,
  params: {
    name: string;
    description: string;
    agent_type?: string;
    capabilities?: string[];
  }
): Promise<string> {
  // Auto-save pending action and trigger confirmation
  const key = storeKey(chatId);
  const state = await store.getJSON<DealCopilotState>(key);
  const draft = state?.draft ?? {
    id: randomId("deal"), chatId, createdAt: Date.now(), updatedAt: Date.now(),
    payoutCurrency: "USDC" as const, totalAmount: 0, freelancerAddress: "", milestones: [],
  };
  draft.pendingAction = {
    type: "register_agent",
    params: {
      name: params.name,
      description: params.description,
      agent_type: params.agent_type || "escrow",
      capabilities: params.capabilities || ["deal_creation", "escrow_management"],
    },
    description: `Register agent "${params.name}" on-chain as ERC-8004 identity NFT`,
  };
  draft.updatedAt = Date.now();
  await store.setJSON(key, { stage: "agent_confirming" as const, draft }, getDealTtlSeconds());
  return `CONFIRMATION_NEEDED: Register agent "${params.name}" (${params.agent_type || "escrow"}) on Arc Testnet. This will mint an ERC-8004 identity NFT.`;
}

export async function executeCheckAgentReputation(
  params: { agent_id: string }
): Promise<string> {
  const result = await lookupAgentIdentity(params.agent_id);
  if (!result.found) {
    return `No agent found for "${params.agent_id}". ${result.error || ""}`;
  }
  return [
    `🤖 **Agent Identity**`,
    ``,
    `🆔 Agent ID: ${result.agentId}`,
    `👤 Owner: \`${result.owner?.slice(0, 10)}…${result.owner?.slice(-8)}\``,
    `📄 Metadata: ${result.metadataURI?.slice(0, 50)}…`,
    `🔗 Explorer: https://testnet.arcscan.app/address/${result.owner}`,
  ].join("\n");
}

export async function executeCreateAgenticJob(
  store: JsonStore,
  chatId: string,
  params: {
    provider_address: string;
    description: string;
    budget_usdc: number;
    expiry_hours?: number;
  }
): Promise<string> {
  if (!looksLikeEthAddress(params.provider_address)) {
    return "❌ Invalid provider address.";
  }
  // Auto-save pending action and trigger confirmation
  const key = storeKey(chatId);
  const state = await store.getJSON<DealCopilotState>(key);
  const draft = state?.draft ?? {
    id: randomId("deal"), chatId, createdAt: Date.now(), updatedAt: Date.now(),
    payoutCurrency: "USDC" as const, totalAmount: 0, freelancerAddress: "", milestones: [],
  };
  draft.pendingAction = {
    type: "create_erc8183_job",
    params: {
      provider_address: params.provider_address,
      description: params.description,
      budget_usdc: params.budget_usdc,
      expiry_hours: params.expiry_hours || 24,
    },
    description: `Create ERC-8183 job: "${params.description}" for $${params.budget_usdc} USDC`,
  };
  draft.updatedAt = Date.now();
  await store.setJSON(key, { stage: "agent_confirming" as const, draft }, getDealTtlSeconds());
  return `CONFIRMATION_NEEDED: Create ERC-8183 agentic job "${params.description}" with budget $${params.budget_usdc} USDC, expires in ${params.expiry_hours || 24}h.`;
}

export async function executeCheckAgenticJob(
  params: { job_id: string }
): Promise<string> {
  const result = await getAgenticJobInfo(params.job_id);
  if (!result.found || !result.job) {
    return `❌ Job not found: ${result.error || "unknown error"}`;
  }
  const j = result.job;
  return [
    `📋 **ERC-8183 Job #${j.id}**`,
    ``,
    `Status: ${j.statusLabel}`,
    `📝 ${j.description}`,
    `💵 Budget: $${j.budget} USDC`,
    `👤 Client: \`${j.client.slice(0, 10)}…${j.client.slice(-8)}\``,
    `👷 Provider: \`${j.provider.slice(0, 10)}…${j.provider.slice(-8)}\``,
    `⏰ Expires: ${j.expiredAt}`,
  ].join("\n");
}

export async function executeSearchRegisteredAgents(): Promise<string> {
  try {
    const agents = await fetchRegisteredAgents();
    if (agents.length === 0) {
      return "No custom agents have been registered on the market yet.";
    }
    
    const lines = ["🤖 **Registered AI Agents Marketplace**\n"];
    agents.forEach((a) => {
      lines.push(`🆔 **ID: ${a.id}** — ${a.name}`);
      lines.push(`   ✨ Skill: ${a.skill}`);
      if (a.toolName !== "None") lines.push(`   🔧 Tool: ${a.toolName}`);
      lines.push(`   💰 Base Fee: $${a.taskFee.toFixed(2)} USDC`);
      lines.push(`   📍 Owner Address: \`${a.ownerAddress}\``);
      lines.push(`   🟢 Status: ${a.isActive ? "Active" : "Inactive"}`);
      lines.push("");
    });
    
    lines.push("You can draft an escrow deal with one of these agents just like a human freelancer! Use their Owner Address as the freelancer address to hire them.");
    return lines.join("\n");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return `❌ Could not fetch agents: ${msg.slice(0, 200)}`;
  }
}

export async function executeAgentTask(
  store: JsonStore,
  fromId: number,
  agentId: string,
  taskDescription: string
): Promise<string> {
  try {
    // Step 1: Fetch agent memory
    const metaStr = await store.getJSON<any>(`agent_meta:${agentId}`);
    if (!metaStr) {
      console.error(`[executeAgentTask] agent_meta:${agentId} returned null from store`);
      return `❌ Agent memory not found for ID ${agentId}. The agent's brain was not saved during registration, or the storage backend was unavailable.`;
    }

    let systemPrompt = metaStr.systemPrompt || "You are a helpful AI assistant.";
    
    // Automatically fetch content if it's a URL (External Skill Injection)
    if (systemPrompt.startsWith("http")) {
      try {
        const res = await fetch(systemPrompt);
        systemPrompt = await res.text();
      } catch {
        return `❌ Execution Failed: Could not load the external skill logic from the provided URL.`;
      }
    }

    // Step 2: Resolve API key — try user key, then GROQ_API_KEY, then resolveApiKey chain
    let apiKey: string | null = null;
    
    // Priority 1: Server-side GROQ key (fastest, free)
    const groqEnv = (process.env.GROQ_API_KEY ?? "").replace(/[^\x20-\x7E]/g, "").trim();
    if (groqEnv && groqEnv.startsWith("gsk_") && groqEnv.length > 20) {
      apiKey = groqEnv;
    }
    
    // Priority 2: User's stored key or other server keys
    if (!apiKey) {
      apiKey = await resolveApiKey(store, fromId);
    }
    
    if (!apiKey) {
      return `❌ No API key available. The server needs a GROQ_API_KEY environment variable, or you can set your own with \`/setkey gsk_...\``;
    }

    // Step 3: Route to correct endpoint based on key type
    let url: string;
    let model: string;
    let headers: Record<string, string>;
    
    if (apiKey.startsWith("gsk_")) {
      url = "https://api.groq.com/openai/v1/chat/completions";
      model = "llama-3.3-70b-versatile";
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };
    } else {
      // OpenRouter key (sk-or-*)
      url = "https://openrouter.ai/api/v1/chat/completions";
      model = "google/gemma-4-26b-a4b-it"; // Fast, high rate-limit model
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://arclancer.vercel.app",
        "X-Title": "Arclancer Agent Node"
      };
    }

    console.log(`[executeAgentTask] Calling ${apiKey.startsWith("gsk_") ? "Groq" : "OpenRouter"} for agent ${agentId}`);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: taskDescription }
        ],
        max_tokens: 3000
      })
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown");
      console.error(`[executeAgentTask] API returned ${res.status}: ${errorBody.slice(0, 300)}`);
      return `❌ Agent execution failed: AI API returned HTTP ${res.status}. Check server logs.`;
    }

    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) {
      console.error(`[executeAgentTask] Unexpected API response:`, JSON.stringify(data).slice(0, 300));
      return `❌ Agent execution failed: AI returned an unexpected response format.`;
    }
    const output = data.choices[0].message.content;

    return `🧠 **Agent Execution Complete!**\n\nThe registered AI Agent processed your task using its unique skill pipeline.\n\n**Output:**\n${output}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[executeAgentTask] Exception:`, msg);
    return `❌ Agent Execution failed: ${msg.slice(0, 200)}`;
  }
}

/* ------------------------------------------------------------------ */
/* Tool router                                                         */
/* ------------------------------------------------------------------ */

export async function executeTool(
  toolName: string,
  argsJson: string,
  context: {
    store: JsonStore;
    chatId: string;
    fromId: number;
  }
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson || "{}");
  } catch {
    return `Error: Invalid JSON arguments for tool ${toolName}`;
  }

  try {
    switch (toolName) {
      case "create_wallet":
        return await executeCreateWallet(context.store, context.fromId);
      case "check_balance":
        return await executeCheckBalance(context.store, context.fromId);
      case "get_deposit_address":
        return await executeGetDepositAddress(context.store, context.fromId);
      case "create_deal_draft":
        return await executeCreateDealDraft(context.store, context.chatId, args as Parameters<typeof executeCreateDealDraft>[2]);
      case "show_deal_summary":
        return await executeShowDealSummary(context.store, context.chatId);
      case "edit_deal":
        return await executeEditDeal(context.store, context.chatId, args as { field: string; value: string });
      case "request_confirmation":
        return await executeRequestConfirmation(context.store, context.chatId, args as Parameters<typeof executeRequestConfirmation>[2]);
      case "check_contract_status":
        return await executeCheckContractStatus(context.store, context.chatId, args as { contract_address?: string });
      case "list_contracts":
        return await executeListContracts(context.store, context.fromId, args as { wallet_address?: string });
      case "register_agent_identity":
        return await executeRegisterAgentIdentity(context.store, context.chatId, args as Parameters<typeof executeRegisterAgentIdentity>[2]);
      case "check_agent_reputation":
        return await executeCheckAgentReputation(args as { agent_id: string });
      case "create_agentic_job":
        return await executeCreateAgenticJob(context.store, context.chatId, args as Parameters<typeof executeCreateAgenticJob>[2]);
      case "check_agentic_job":
        return await executeCheckAgenticJob(args as { job_id: string });
      case "search_registered_agents":
        return await executeSearchRegisteredAgents();
      case "execute_agent_task":
        return await executeAgentTask(context.store, context.fromId, (args as Record<string, string>).agent_id, (args as Record<string, string>).task_description);
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return `Tool error (${toolName}): ${msg.slice(0, 300)}`;
  }
}
