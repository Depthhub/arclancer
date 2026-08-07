/**
 * Agent Tool Executor — Bridge between LLM tool calls and existing codebase.
 * Each function takes structured params from Gemma 4 and calls existing helpers.
 */
import type { JsonStore } from "@/lib/dealCopilot/storage";
import type { DealCopilotState, DealDraft, AgentPendingAction, AgentPendingActionType } from "@/lib/dealCopilot/types";
import {
  userContextToToolContext,
  type UserContext,
} from "@/lib/mcp/userContext";
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
import { resolveFreelancerInput } from "@/lib/profile/resolveFreelancer";
import type { AgentTaskRouting } from "@/lib/agents/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function storeKey(chatId: string) {
  return `dealCopilot:state:${chatId}`;
}

function looksLikeEthAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

function formatFreelancerLine(d: DealDraft): string {
  if (d.freelancerUsername) return `👷 Freelancer: @${d.freelancerUsername}`;
  if (d.freelancerAddress) return `👷 Freelancer: \`${d.freelancerAddress}\``;
  return `👷 Freelancer: (missing)`;
}

async function resolveFreelancerArg(
  params: {
    freelancer_username?: string;
    freelancer_address?: string;
  },
  store: JsonStore
): Promise<{ ok: true; walletAddress: string; username: string | null } | { ok: false; error: string }> {
  const raw = params.freelancer_username?.trim() || params.freelancer_address?.trim() || "";
  if (!raw) {
    return {
      ok: false,
      error: "Provide freelancer_username (e.g. samuel) or freelancer_address.",
    };
  }
  return resolveFreelancerInput(raw, store);
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
    freelancer_username?: string;
    freelancer_address?: string;
    total_amount: number;
    currency?: string;
    milestones?: Array<{ amount: number; description: string }>;
  }
): Promise<string> {
  const key = storeKey(chatId);

  const resolved = await resolveFreelancerArg(params, store);
  if (!resolved.ok) return `❌ ${resolved.error}`;
  if (!params.total_amount || params.total_amount <= 0) {
    return "❌ Total amount must be positive.";
  }

  const fee = params.total_amount * 0.02;
  const net = params.total_amount - fee;
  const milestones =
    params.milestones && params.milestones.length > 0
      ? params.milestones
      : [{ amount: Math.round(net * 100) / 100, description: "Full delivery" }];

  const draft: DealDraft = {
    id: randomId("deal"),
    chatId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    payoutCurrency: (params.currency?.toUpperCase() === "EURC" ? "EURC" : "USDC") as "USDC" | "EURC",
    totalAmount: Math.round(params.total_amount * 100) / 100,
    freelancerAddress: resolved.walletAddress,
    freelancerUsername: resolved.username ?? undefined,
    milestones: milestones.map((m) => ({
      amount: Math.round(m.amount * 100) / 100,
      description: m.description,
    })),
    desiredMilestonesCount: milestones.length,
  };

  const state: DealCopilotState = { stage: "review", draft };
  await store.setJSON(key, state, getDealTtlSeconds());

  const milestonesSum = milestones.reduce((s, m) => s + m.amount, 0);
  const match = Math.abs(milestonesSum - net) < 0.01;
  const lines = [
    `📋 **Deal Draft Created!**`,
    ``,
    formatFreelancerLine(draft),
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
    formatFreelancerLine(d),
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
      const resolved = await resolveFreelancerInput(params.value, store);
      if (!resolved.ok) return `❌ ${resolved.error}`;
      draft.freelancerAddress = resolved.walletAddress;
      draft.freelancerUsername = resolved.username ?? undefined;
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
    skill: string;
    fee?: number;
    skill_uri: string;
    content_hash?: string;
    execution_mode?: "inbox" | "creator_mcp";
    mcp_endpoint?: string;
  }
): Promise<string> {
  if (!params.skill_uri?.trim()) {
    return "❌ skill_uri is required. Store a public pointer, not a full prompt.";
  }
  if (!/^(https:\/\/|ipfs:\/\/|ar:\/\/)/i.test(params.skill_uri.trim())) {
    return "❌ skill_uri must use HTTPS, IPFS, or Arweave.";
  }
  if (params.content_hash && !/^[a-fA-F0-9]{64}$/.test(params.content_hash)) {
    return "❌ content_hash must be a SHA-256 hex digest.";
  }
  if (params.execution_mode === "creator_mcp" && !params.mcp_endpoint?.trim()) {
    return "❌ mcp_endpoint is required when execution_mode is creator_mcp.";
  }
  if (
    params.execution_mode === "creator_mcp" &&
    !/^https:\/\//i.test(params.mcp_endpoint?.trim() ?? "")
  ) {
    return "❌ mcp_endpoint must use HTTPS.";
  }
  // Auto-save pending action and trigger confirmation
  const key = storeKey(chatId);
  const state = await store.getJSON<DealCopilotState>(key);
  const draft = state?.draft ?? {
    id: randomId("deal"), chatId, createdAt: Date.now(), updatedAt: Date.now(),
    payoutCurrency: "USDC" as const, totalAmount: 0, freelancerAddress: "", milestones: [],
  };
  const fee = params.fee ?? 0;
  draft.pendingAction = {
    type: "register_agent",
    params: {
      name: params.name,
      skill: params.skill,
      fee,
      skill_uri: params.skill_uri,
      content_hash: params.content_hash || "",
      execution_mode: params.execution_mode || "inbox",
      mcp_endpoint: params.mcp_endpoint || "",
    },
    description: `Register agent "${params.name}" on ArcLancer Marketplace with fee $${fee} USDC`,
  };
  draft.updatedAt = Date.now();
  await store.setJSON(key, { stage: "agent_confirming" as const, draft }, getDealTtlSeconds());
  
  const lines = [
    `CONFIRMATION_NEEDED: Register agent **${params.name}** on the ArcLancer Marketplace.`,
    `• Skill: ${params.skill}`,
    `• Fee: $${fee} USDC per task`,
  ];
  lines.push(`• Skill URI: ${params.skill_uri}`);
  lines.push(`• Execution: ${params.execution_mode || "inbox"}`);
  lines.push(`\nThis will mint an on-chain agent NFT on Arc Testnet.`);
  return lines.join("\n");
}

export async function executeCheckAgentReputation(
  params: { agent_id: string }
): Promise<string> {
  const result = await lookupAgentIdentity(params.agent_id);
  if (!result.found) {
    return `No agent found for "${params.agent_id}". ${result.error || ""}`;
  }

  const lines = [
    `🤖 **Agent Identity**`,
    ``,
    `🆔 Agent ID: ${result.agentId}`,
    `👤 Owner: \`${result.owner?.slice(0, 10)}…${result.owner?.slice(-8)}\``,
  ];

  // If metadata came from the AgentRegistry fallback, it starts with "Agent:"
  if (result.metadataURI?.startsWith("Agent:")) {
    // Parse structured metadata: "Agent: Name | Skill: X | Tool: Y | Fee: $Z | Active: true"
    const parts = result.metadataURI.split(" | ");
    for (const part of parts) {
      if (part.startsWith("Agent:")) lines.push(`📛 Name: **${part.replace("Agent: ", "")}**`);
      else if (part.startsWith("Skill:")) lines.push(`✨ ${part}`);
      else if (part.startsWith("Tool:")) lines.push(`🔧 ${part}`);
      else if (part.startsWith("Fee:")) lines.push(`💰 ${part}`);
      else if (part.startsWith("Active:")) lines.push(`🟢 ${part}`);
    }
  } else {
    lines.push(`📄 Metadata: ${result.metadataURI?.slice(0, 100)}…`);
  }

  lines.push(`🔗 Explorer: https://testnet.arcscan.app/address/${result.owner}`);
  return lines.join("\n");
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
    
    lines.push("You can hire agents like human freelancers — use their username if they have an ArcLancer account, or their owner wallet address.");
    return lines.join("\n");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return `❌ Could not fetch agents: ${msg.slice(0, 200)}`;
  }
}

export async function executeAgentTask(
  store: JsonStore,
  _fromId: number,
  agentId: string,
  _taskDescription: string
): Promise<AgentTaskRouting> {
  void _taskDescription;
  const meta = await store.getJSON<{
    skill_uri?: string;
    content_hash?: string;
    execution_mode?: "inbox" | "creator_mcp";
    mcp_endpoint?: string;
  }>(`agent_meta:${agentId}`);

  const executionMode = meta?.execution_mode ?? "inbox";
  if (executionMode === "creator_mcp" && meta?.mcp_endpoint) {
    return {
      executionMode,
      skillUri: meta.skill_uri,
      contentHash: meta.content_hash,
      mcpEndpoint: meta.mcp_endpoint,
      message: "Route this task to the creator-hosted MCP endpoint. ArcLancer does not fetch the skill URI or execute the agent.",
    };
  }

  return {
    executionMode: "inbox",
    skillUri: meta?.skill_uri,
    contentHash: meta?.content_hash,
    message: "Deliver this task to the creator inbox. ArcLancer does not fetch the skill URI or execute the agent.",
  };
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
        return JSON.stringify(await executeAgentTask(context.store, context.fromId, (args as Record<string, string>).agent_id, (args as Record<string, string>).task_description));
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return `Tool error (${toolName}): ${msg.slice(0, 300)}`;
  }
}

/** MCP / shared entry — maps UserContext to Telegram-style tool context */
export async function executeToolForUser(
  toolName: string,
  args: Record<string, unknown>,
  user: UserContext,
  store: JsonStore
): Promise<string> {
  return executeTool(toolName, JSON.stringify(args ?? {}), userContextToToolContext(user, store));
}

export type { UserContext };
