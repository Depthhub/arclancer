import { formatDollars } from "@/lib/utils";
import { randomId, signToken } from "@/lib/dealCopilot/crypto";
import {
  fetchContractDetails,
  fetchUserContracts,
  formatContractSummary,
  formatContractList,
  contractActionButtons,
} from "@/lib/dealCopilot/chain";
import type { BotReply, BotButton, DealCopilotState, DealDraft, DealMilestoneDraft, SupportedPayoutCurrency } from "@/lib/dealCopilot/types";

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

export function getDealTtlSeconds() {
  const raw = process.env.DEAL_COPILOT_TTL_SECONDS;
  const n = raw ? Number(raw) : DEFAULT_TTL_SECONDS;
  if (!Number.isFinite(n) || n < 60) return DEFAULT_TTL_SECONDS;
  return Math.floor(n);
}

export function getCopilotSecret() {
  return process.env.DEAL_COPILOT_SECRET || "";
}

export function newDraft(chatId: string): DealDraft {
  const now = Date.now();
  return {
    id: randomId("deal"),
    chatId,
    createdAt: now,
    updatedAt: now,
    payoutCurrency: "USDC",
    totalAmount: 0,
    freelancerAddress: "",
    milestones: [],
  };
}

function normalizeText(t: string) {
  return (t || "").trim();
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

function looksLikeEthAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

function clampMilestonesCount(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return Math.max(1, Math.min(10, Math.floor(n)));
}

function computeFeeAndNet(totalAmount: number) {
  const fee = totalAmount * 0.02;
  const net = totalAmount - fee;
  return { fee, net };
}

/* ------------------------------------------------------------------ */
/* Security: seed phrase / private key detection                       */
/* ------------------------------------------------------------------ */

const BIP39_WORD_COUNT_PATTERN = /^(\w+\s+){11,23}\w+$/;
const HEX_PRIVATE_KEY_PATTERN = /^(0x)?[a-fA-F0-9]{64}$/;

function containsSensitiveData(text: string): boolean {
  const trimmed = text.trim();
  // Check for 12 or 24 word seed phrases
  if (BIP39_WORD_COUNT_PATTERN.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    if (words.length === 12 || words.length === 24) return true;
  }
  // Check for hex private key
  if (HEX_PRIVATE_KEY_PATTERN.test(trimmed)) return true;
  // Check for common seed phrase prefixes embedded in text
  if (/\b(seed\s*phrase|private\s*key|mnemonic|secret\s*recovery)\b/i.test(trimmed)) {
    if (/[a-f0-9]{64}/i.test(trimmed)) return true;
  }
  return false;
}

const SENSITIVE_DATA_WARNING: BotReply = {
  text: [
    `⚠️ **SECURITY WARNING** ⚠️`,
    ``,
    `It looks like you may have shared a **seed phrase** or **private key**.`,
    ``,
    `🚫 **Never share your seed phrase or private key with anyone**, including bots.`,
    ``,
    `If you've shared it here:`,
    `1. Move your funds to a new wallet immediately`,
    `2. Generate a new seed phrase`,
    `3. Delete the message above if possible`,
    ``,
    `Your message was NOT processed or stored.`,
  ].join("\n"),
  parseMode: "Markdown",
};

/* ------------------------------------------------------------------ */
/* Summary & Links                                                     */
/* ------------------------------------------------------------------ */

function summarizeDraft(d: DealDraft): string {
  const { fee, net } = computeFeeAndNet(d.totalAmount || 0);
  const milestonesSum = (d.milestones || []).reduce((s, m) => s + (m.amount || 0), 0);
  const lines = [
    `📋 **ArcLancer Deal Draft**`,
    ``,
    `👷 **Freelancer address**: \`${d.freelancerAddress || "(missing)"}\``,
    `💵 **Total (gross)**: ${d.totalAmount ? formatDollars(d.totalAmount) : "(missing)"}`,
    `💳 **Platform fee (2%)**: ${d.totalAmount ? formatDollars(fee) : "(n/a)"}`,
    `💰 **Net to freelancer**: ${d.totalAmount ? formatDollars(net) : "(n/a)"}`,
    `🏦 **Payout currency**: ${d.payoutCurrency}`,
    ``,
    `📌 **Milestones** (${d.milestones.length}${d.desiredMilestonesCount ? ` / ${d.desiredMilestonesCount}` : ""})`,
  ];
  if (d.milestones.length === 0) lines.push(`  (none yet)`);
  d.milestones.forEach((m, idx) => {
    lines.push(`  ${idx + 1}. ${m.description || "(missing description)"} — ${m.amount ? formatDollars(m.amount) : "(missing amount)"}`);
  });
  if (d.totalAmount > 0) {
    const match = Math.abs(milestonesSum - net) < 0.01;
    const icon = match ? "✅" : "⚠️";
    lines.push(``, `${icon} **Milestones total**: ${formatDollars(milestonesSum)} (must equal net: ${formatDollars(net)})`);
  }
  return lines.join("\n");
}

/** Summary with inline action buttons for the review stage */
function summarizeWithButtons(d: DealDraft): BotReply {
  const text = summarizeDraft(d);
  const ready = isReadyForCreate(d);
  const buttons: BotButton[][] = [];

  // Edit buttons row
  buttons.push([
    { text: "✏️ Currency", callback_data: "edit_currency" },
    { text: "✏️ Total", callback_data: "edit_total" },
    { text: "✏️ Address", callback_data: "edit_address" },
  ]);

  // Milestone management row
  if (d.milestones.length > 0) {
    const row: BotButton[] = [{ text: "➕ Add Milestone", callback_data: "add_milestone" }];
    if (d.milestones.length > 1) {
      row.push({ text: "🗑️ Remove Last", callback_data: "remove_last_milestone" });
    }
    buttons.push(row);
  }

  // Action row
  const actionRow: BotButton[] = [{ text: "🔄 Reset", callback_data: "reset_deal" }];
  if (ready.ok) {
    actionRow.push({ text: "✅ Create Escrow", callback_data: "create_escrow" });
  }
  buttons.push(actionRow);

  const extraText = ready.ok
    ? "\n\n✅ Ready! Tap **Create Escrow** or send `/create`."
    : `\n\n⚠️ ${ready.reason}`;

  return { text: text + extraText, buttons, parseMode: "Markdown" };
}

function createLink(draftId: string, chatId: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const secret = getCopilotSecret();
  if (!base || !secret) return null;
  const token = signToken({ draftId, chatId, iat: Date.now() }, secret);
  const url = new URL("/create", base);
  url.searchParams.set("draft", token);
  return url.toString();
}

function helpText(): string {
  return [
    `🤖 **ArcLancer Deal Copilot**`,
    ``,
    `**👛 Wallet:**`,
    `  /wallet — create or view your wallet`,
    `  /balance — check USDC balance`,
    `  /deposit — get your deposit address`,
    `  /export — export private key`,
    ``,
    `**🤝 Deal Setup:**`,
    `  /startdeal — start a new deal draft`,
    `  /create_agent — register a new AI Agent`,
    `  /summary — show current draft`,
    `  /create — deploy escrow contract on-chain`,
    `  /reset — reset the draft`,
    ``,
    `**✏️ Editing:**`,
    `  /edit currency EURC`,
    `  /edit total 5000`,
    `  /edit address 0x...`,
    `  /edit milestone 2 500 - New desc`,
    `  /add milestone 500 - Deliverable`,
    `  /remove milestone 3`,
    ``,
    `**💰 Contract Actions:**`,
    `  /fund — fund an escrow contract`,
    `  /submit 1 <link> — submit milestone`,
    `  /approve 1 — approve milestone`,
    `  /withdraw 1 — release payment`,
    `  /dispute — initiate dispute`,
    `  /cancel — cancel contract`,
    ``,
    `**🔍 Lookup:**`,
    `  /status 0x... — contract status`,
    `  /mycontracts 0x... — list contracts`,
    ``,
    `💡 Reply with plain answers during setup.`,
  ].join("\n");
}

function isReadyForCreate(d: DealDraft): { ok: boolean; reason?: string } {
  if (!looksLikeEthAddress(d.freelancerAddress || "")) return { ok: false, reason: "Missing or invalid freelancer address (expected 0x…40 hex chars)." };
  if (!d.totalAmount || d.totalAmount <= 0) return { ok: false, reason: "Missing total amount." };
  if (!d.milestones || d.milestones.length === 0) return { ok: false, reason: "No milestones yet." };
  const { net } = computeFeeAndNet(d.totalAmount);
  const sum = d.milestones.reduce((s, m) => s + (m.amount || 0), 0);
  if (Math.abs(sum - net) > 0.01) return { ok: false, reason: `Milestones must sum to the net amount (${formatDollars(net)}).` };
  return { ok: true };
}

export function initialState(chatId: string): DealCopilotState {
  return { stage: "collect_roles", draft: newDraft(chatId) };
}

/* ------------------------------------------------------------------ */
/* Async handlers (on-chain queries)                                   */
/* ------------------------------------------------------------------ */

export async function handleStatusCommand(text: string): Promise<BotReply> {
  const parts = text.replace(/^\/status\s*/i, "").trim();
  if (!looksLikeEthAddress(parts)) {
    return { text: "Send `/status 0x<contractAddress>` with a valid contract address.", parseMode: "Markdown" };
  }
  try {
    const summary = await fetchContractDetails(parts);
    const formatted = formatContractSummary(summary);

    // Build in-Telegram action buttons based on contract state
    const buttons: BotButton[][] = [];
    const explorer = `https://testnet.arcscan.app/address/${summary.address}`;
    buttons.push([{ text: "🔗 View on Explorer", url: explorer }]);

    if (!summary.funded && summary.status === 0) {
      buttons.push([{ text: "💰 Fund Contract", callback_data: `action_fund_${summary.address}` }]);
    }

    if (summary.funded && summary.status === 0) {
      const nextSubmittable = summary.milestones.find((m) => !m.submitted && !m.paid);
      const nextApprovable = summary.milestones.find((m) => m.submitted && !m.approved && !m.paid);
      const nextReleasable = summary.milestones.find((m) => m.approved && !m.paid);

      if (nextSubmittable) {
        buttons.push([{ text: `📤 Submit Milestone ${nextSubmittable.index + 1}`, callback_data: `action_submit_${summary.address}_${nextSubmittable.index}` }]);
      }
      if (nextApprovable) {
        buttons.push([{ text: `✅ Approve Milestone ${nextApprovable.index + 1}`, callback_data: `action_approve_${summary.address}_${nextApprovable.index}` }]);
      }
      if (nextReleasable) {
        buttons.push([{ text: `💸 Release Payment ${nextReleasable.index + 1}`, callback_data: `action_withdraw_${summary.address}_${nextReleasable.index}` }]);
      }
    }

    return { text: formatted, buttons, parseMode: "Markdown" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { text: `❌ Could not fetch contract: ${msg}`, parseMode: "Markdown" };
  }
}

export async function handleMyContractsCommand(text: string): Promise<BotReply> {
  const parts = text.replace(/^\/mycontracts\s*/i, "").trim();
  if (!looksLikeEthAddress(parts)) {
    return { text: "Send `/mycontracts 0x<walletAddress>` with a valid wallet address.", parseMode: "Markdown" };
  }
  try {
    const contracts = await fetchUserContracts(parts);
    const formatted = formatContractList(parts, contracts);
    const buttons: BotButton[][] = [];
    // Add buttons for first 5 contracts
    const showing = contracts.slice(0, 5);
    for (const addr of showing) {
      const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://arclancer.vercel.app";
      buttons.push([{ text: `📋 ${addr.slice(0, 8)}…${addr.slice(-6)}`, url: `${base}/contract/${addr}` }]);
    }
    return { text: formatted, buttons, parseMode: "Markdown" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { text: `❌ Could not fetch contracts: ${msg}`, parseMode: "Markdown" };
  }
}

/* ------------------------------------------------------------------ */
/* Edit handlers                                                       */
/* ------------------------------------------------------------------ */

function handleEditCommand(
  state: DealCopilotState,
  text: string
): { nextState: DealCopilotState; reply: BotReply } {
  const draft = { ...state.draft, updatedAt: Date.now() };
  const parts = text.replace(/^\/edit\s*/i, "").trim();

  // /edit currency EURC
  if (/^currency\s+/i.test(parts)) {
    const val = parts.replace(/^currency\s+/i, "").trim().toUpperCase();
    const currency: SupportedPayoutCurrency = val === "EURC" ? "EURC" : "USDC";
    draft.payoutCurrency = currency;
    const next: DealCopilotState = { stage: "review", draft };
    return { nextState: next, reply: summarizeWithButtons(draft) };
  }

  // /edit total 5000
  if (/^total\s+/i.test(parts)) {
    const val = parts.replace(/^total\s+/i, "").trim();
    const n = parseNumber(val);
    if (!n || n <= 0) return { nextState: state, reply: { text: "Invalid amount. Example: `/edit total 5000`", parseMode: "Markdown" } };
    draft.totalAmount = Math.round(n * 100) / 100;
    const next: DealCopilotState = { stage: "review", draft };
    return { nextState: next, reply: summarizeWithButtons(draft) };
  }

  // /edit address 0x...
  if (/^address\s+/i.test(parts)) {
    const val = parts.replace(/^address\s+/i, "").trim();
    if (!looksLikeEthAddress(val)) return { nextState: state, reply: { text: "Invalid address. Example: `/edit address 0x1234...`", parseMode: "Markdown" } };
    draft.freelancerAddress = val;
    const next: DealCopilotState = { stage: "review", draft };
    return { nextState: next, reply: summarizeWithButtons(draft) };
  }

  // /edit milestone 2 500 - New description
  if (/^milestone\s+/i.test(parts)) {
    const val = parts.replace(/^milestone\s+/i, "").trim();
    const match = val.match(/^(\d+)\s+(.+)$/);
    if (!match) return { nextState: state, reply: { text: "Format: `/edit milestone 2 500 - New description`", parseMode: "Markdown" } };
    const idx = parseInt(match[1]) - 1;
    if (idx < 0 || idx >= draft.milestones.length) {
      return { nextState: state, reply: { text: `Milestone ${idx + 1} doesn't exist (you have ${draft.milestones.length}).`, parseMode: "Markdown" } };
    }
    const mParts = match[2].split("-").map((p) => p.trim()).filter(Boolean);
    if (mParts.length < 2) return { nextState: state, reply: { text: "Format: `/edit milestone 2 500 - New description`", parseMode: "Markdown" } };
    const amount = parseNumber(mParts[0]);
    const description = mParts.slice(1).join(" - ").trim();
    if (!amount || amount <= 0) return { nextState: state, reply: { text: "Invalid amount.", parseMode: "Markdown" } };
    draft.milestones = [...draft.milestones];
    draft.milestones[idx] = { amount: Math.round(amount * 100) / 100, description };
    const next: DealCopilotState = { stage: "review", draft };
    return { nextState: next, reply: summarizeWithButtons(draft) };
  }

  return {
    nextState: state,
    reply: {
      text: [
        "Edit what? Examples:",
        "  `/edit currency EURC`",
        "  `/edit total 5000`",
        "  `/edit address 0x...`",
        "  `/edit milestone 2 500 - New desc`",
      ].join("\n"),
      parseMode: "Markdown",
    },
  };
}

function handleAddMilestone(
  state: DealCopilotState,
  text: string
): { nextState: DealCopilotState; reply: BotReply } {
  const draft = { ...state.draft, updatedAt: Date.now() };
  const val = text.replace(/^\/add\s+milestone\s*/i, "").trim();
  const mParts = val.split("-").map((p) => p.trim()).filter(Boolean);
  if (mParts.length < 2) {
    return { nextState: state, reply: { text: "Format: `/add milestone 500 - Description`", parseMode: "Markdown" } };
  }
  const amount = parseNumber(mParts[0]);
  const description = mParts.slice(1).join(" - ").trim();
  if (!amount || amount <= 0) return { nextState: state, reply: { text: "Invalid amount.", parseMode: "Markdown" } };
  if (draft.milestones.length >= 10) return { nextState: state, reply: { text: "Maximum 10 milestones reached.", parseMode: "Markdown" } };

  draft.milestones = [...draft.milestones, { amount: Math.round(amount * 100) / 100, description }];
  if (draft.desiredMilestonesCount != null) draft.desiredMilestonesCount = draft.milestones.length;
  const next: DealCopilotState = { stage: "review", draft };
  return { nextState: next, reply: summarizeWithButtons(draft) };
}

function handleRemoveMilestone(
  state: DealCopilotState,
  text: string
): { nextState: DealCopilotState; reply: BotReply } {
  const draft = { ...state.draft, updatedAt: Date.now() };
  const val = text.replace(/^\/remove\s+milestone\s*/i, "").trim();
  const n = parseNumber(val);
  if (!n) {
    // No number → remove last
    if (draft.milestones.length === 0) return { nextState: state, reply: { text: "No milestones to remove.", parseMode: "Markdown" } };
    draft.milestones = draft.milestones.slice(0, -1);
  } else {
    const idx = Math.floor(n) - 1;
    if (idx < 0 || idx >= draft.milestones.length) {
      return { nextState: state, reply: { text: `Milestone ${idx + 1} doesn't exist (you have ${draft.milestones.length}).`, parseMode: "Markdown" } };
    }
    draft.milestones = [...draft.milestones.slice(0, idx), ...draft.milestones.slice(idx + 1)];
  }
  if (draft.desiredMilestonesCount != null) draft.desiredMilestonesCount = draft.milestones.length;
  const next: DealCopilotState = { stage: "review", draft };

  if (draft.milestones.length === 0) {
    return {
      nextState: next,
      reply: { text: "All milestones removed. Use `/add milestone 500 - Description` to add new ones.", parseMode: "Markdown" },
    };
  }
  return { nextState: next, reply: summarizeWithButtons(draft) };
}

/* ------------------------------------------------------------------ */
/* Callback query handler (inline button taps)                         */
/* ------------------------------------------------------------------ */

export function handleCallbackQuery(
  state: DealCopilotState | null,
  chatId: string,
  callbackData: string
): { nextState: DealCopilotState | null; reply: BotReply } {
  if (!state) {
    return { nextState: null, reply: { text: "No active deal. Send `/startdeal` to begin.", parseMode: "Markdown" } };
  }

  const draft = { ...state.draft, updatedAt: Date.now() };

  switch (callbackData) {
    case "edit_currency": {
      const next: DealCopilotState = { stage: "editing_field", draft: { ...draft, editingField: "currency" } };
      return { nextState: next, reply: { text: "Send the new payout currency: `USDC` or `EURC`", parseMode: "Markdown" } };
    }
    case "edit_total": {
      const next: DealCopilotState = { stage: "editing_field", draft: { ...draft, editingField: "total" } };
      return { nextState: next, reply: { text: "Send the new total amount (e.g. `5000`):", parseMode: "Markdown" } };
    }
    case "edit_address": {
      const next: DealCopilotState = { stage: "editing_field", draft: { ...draft, editingField: "address" } };
      return { nextState: next, reply: { text: "Send the new freelancer wallet address (0x...):", parseMode: "Markdown" } };
    }
    case "add_milestone": {
      const next: DealCopilotState = { stage: "editing_field", draft: { ...draft, editingField: "milestone" } };
      return { nextState: next, reply: { text: "Send the new milestone as `amount - description`:\nExample: `500 - Testing & QA`", parseMode: "Markdown" } };
    }
    case "remove_last_milestone": {
      if (draft.milestones.length === 0) {
        return { nextState: state, reply: { text: "No milestones to remove.", parseMode: "Markdown" } };
      }
      draft.milestones = draft.milestones.slice(0, -1);
      if (draft.desiredMilestonesCount != null) draft.desiredMilestonesCount = draft.milestones.length;
      const next: DealCopilotState = { stage: "review", draft };
      return { nextState: next, reply: summarizeWithButtons(draft) };
    }
    case "reset_deal": {
      const next = initialState(chatId);
      return { nextState: next, reply: { text: "🔄 Reset. Send `/startdeal` to begin a new deal.", parseMode: "Markdown" } };
    }
    case "create_escrow": {
      const ready = isReadyForCreate(draft);
      if (!ready.ok) {
        return { nextState: state, reply: { text: `⚠️ Not ready: ${ready.reason}`, parseMode: "Markdown" } };
      }
      const link = createLink(draft.id, draft.chatId);
      if (!link) {
        return { nextState: state, reply: { text: "❌ Can't generate link. Server config missing.", parseMode: "Markdown" } };
      }
      return {
        nextState: state,
        reply: {
          text: "✅ Ready! Tap below to create the escrow on ArcLancer.\n\n_(Wallet signing happens on the website)_",
          buttons: [[{ text: "🚀 Create Escrow", url: link }]],
          parseMode: "Markdown",
        },
      };
    }
    case "deploy_agent": {
      // In a real app we'd trigger an on-chain deployment of the agent registry.
      // For now we just mock success.
      return {
        nextState: null,
        reply: {
          text: `🎉 **Agent Successfully Registered!**\n\nYour agent **${draft.agentRegistration?.name}** is now available on the Arc Network. Other users can now hire it!`,
          parseMode: "Markdown",
        },
      };
    }
    default:
      return { nextState: state, reply: { text: "Unknown action.", parseMode: "Markdown" } };
  }
}

/* ------------------------------------------------------------------ */
/* Main message handler                                                */
/* ------------------------------------------------------------------ */

export function handleMessage(
  state: DealCopilotState | null,
  chatId: string,
  fromTelegramId: number,
  textRaw: string
): { nextState: DealCopilotState | null; reply: BotReply; isAsync?: boolean } {
  const text = normalizeText(textRaw);

  // ── Security: intercept sensitive data ──
  if (containsSensitiveData(text)) {
    return { nextState: state, reply: SENSITIVE_DATA_WARNING };
  }

  // ── Stateless help ──
  if (!text || text === "/help" || text === "help") {
    return { nextState: state, reply: { text: helpText(), parseMode: "Markdown" } };
  }

  // ── Async commands (on-chain lookups) ──
  if (/^\/status\b/i.test(text)) {
    return { nextState: state, reply: { text: "⏳ Looking up contract..." }, isAsync: true };
  }
  if (/^\/mycontracts\b/i.test(text)) {
    return { nextState: state, reply: { text: "⏳ Looking up wallet contracts..." }, isAsync: true };
  }

  // ── Deal commands ──
  if (text === "/startdeal") {
    const next = initialState(chatId);
    return {
      nextState: next,
      reply: {
        text: [
          `🤝 Let's set up an escrow deal.`,
          ``,
          `First: who is the **client** and who is the **freelancer** in this chat?`,
          `Reply like: \`client=me freelancer=@alice\` (or just type anything to continue).`,
        ].join("\n"),
        parseMode: "Markdown",
      },
    };
  }
  if (text === "/create_agent") {
    const next = initialState(chatId);
    next.stage = "collect_agent_name";
    next.draft.agentRegistration = {};
    return {
      nextState: next,
      reply: {
        text: `🤖 **Let's register your AI Agent.**\n\nFirst, what do you want to call this agent? (e.g. \`Satoshi Auditor\`)`,
        parseMode: "Markdown",
      },
    };
  }
  if (text === "/reset") {
    return { nextState: null, reply: { text: "🔄 Reset. Send `/startdeal` to begin a new deal.", parseMode: "Markdown" } };
  }
  if (text === "/summary") {
    if (!state) return { nextState: state, reply: { text: "No active deal in this chat. Send `/startdeal`.", parseMode: "Markdown" } };
    return { nextState: state, reply: summarizeWithButtons(state.draft) };
  }
  if (text === "/create") {
    if (!state) return { nextState: state, reply: { text: "No active deal in this chat. Send `/startdeal`.", parseMode: "Markdown" } };
    const ready = isReadyForCreate(state.draft);
    if (!ready.ok) {
      return {
        nextState: state,
        reply: { text: `⚠️ Not ready yet: ${ready.reason}\n\nSend \`/summary\` to review what's missing.`, parseMode: "Markdown" },
      };
    }
    // On-chain deployment is handled by the route — this signals it
    return {
      nextState: state,
      reply: { text: "⏳ Deploying contract on-chain...", parseMode: "Markdown" },
      isAsync: true,
    };
  }

  // ── Edit commands (require active state) ──
  if (/^\/edit\b/i.test(text)) {
    if (!state) return { nextState: state, reply: { text: "No active deal. Send `/startdeal` first.", parseMode: "Markdown" } };
    return handleEditCommand(state, text);
  }
  if (/^\/add\s+milestone\b/i.test(text)) {
    if (!state) return { nextState: state, reply: { text: "No active deal. Send `/startdeal` first.", parseMode: "Markdown" } };
    return handleAddMilestone(state, text);
  }
  if (/^\/remove\s+milestone\b/i.test(text)) {
    if (!state) return { nextState: state, reply: { text: "No active deal. Send `/startdeal` first.", parseMode: "Markdown" } };
    return handleRemoveMilestone(state, text);
  }

  // ── If no state, gently guide ──
  if (!state) {
    return { nextState: state, reply: { text: "Send `/startdeal` to start a deal draft, or `/help` for all commands.", parseMode: "Markdown" } };
  }

  // ── Stage handling (conversational flow) ──
  const draft = { ...state.draft, updatedAt: Date.now() };

  // Handle editing_field stage (user was prompted by a callback button)
  if (state.stage === "editing_field") {
    const field = draft.editingField;
    if (field === "currency") {
      const upper = text.toUpperCase();
      draft.payoutCurrency = upper === "EURC" ? "EURC" : "USDC";
      draft.editingField = undefined;
      const next: DealCopilotState = { stage: "review", draft };
      return { nextState: next, reply: summarizeWithButtons(draft) };
    }
    if (field === "total") {
      const n = parseNumber(text);
      if (!n || n <= 0) return { nextState: state, reply: { text: "Please send a valid number like `5000`.", parseMode: "Markdown" } };
      draft.totalAmount = Math.round(n * 100) / 100;
      draft.editingField = undefined;
      const next: DealCopilotState = { stage: "review", draft };
      return { nextState: next, reply: summarizeWithButtons(draft) };
    }
    if (field === "address") {
      if (!looksLikeEthAddress(text)) return { nextState: state, reply: { text: "Invalid address. Send a valid 0x address.", parseMode: "Markdown" } };
      draft.freelancerAddress = text.trim();
      draft.editingField = undefined;
      const next: DealCopilotState = { stage: "review", draft };
      return { nextState: next, reply: summarizeWithButtons(draft) };
    }
    if (field === "milestone") {
      const mParts = text.split("-").map((p) => p.trim()).filter(Boolean);
      if (mParts.length < 2) return { nextState: state, reply: { text: "Format: `amount - description`", parseMode: "Markdown" } };
      const amount = parseNumber(mParts[0]);
      const description = mParts.slice(1).join(" - ").trim();
      if (!amount || amount <= 0 || !description) return { nextState: state, reply: { text: "Invalid. Send `amount - description`.", parseMode: "Markdown" } };
      if (draft.milestones.length >= 10) return { nextState: state, reply: { text: "Maximum 10 milestones.", parseMode: "Markdown" } };
      draft.milestones = [...draft.milestones, { amount: Math.round(amount * 100) / 100, description }];
      if (draft.desiredMilestonesCount != null) draft.desiredMilestonesCount = draft.milestones.length;
      draft.editingField = undefined;
      const next: DealCopilotState = { stage: "review", draft };
      return { nextState: next, reply: summarizeWithButtons(draft) };
    }
    // Unknown field — go back to review
    draft.editingField = undefined;
    const next: DealCopilotState = { stage: "review", draft };
    return { nextState: next, reply: summarizeWithButtons(draft) };
  }

  // ── Agent Registration Flow ──
  if (state.stage === "collect_agent_name") {
    draft.agentRegistration = { ...draft.agentRegistration, name: text };
    const next: DealCopilotState = { stage: "collect_agent_skill", draft };
    return {
      nextState: next,
      reply: {
        text: `What is this agent's primary skill profile? (e.g. \`Solidity Auditor\`, \`Blockchain Data Analyst\`, \`SEO Writer\`)`,
        parseMode: "Markdown",
      },
    };
  }

  if (state.stage === "collect_agent_skill") {
    draft.agentRegistration = { ...draft.agentRegistration, skill: text };
    const next: DealCopilotState = { stage: "collect_agent_tool", draft };
    return {
      nextState: next,
      reply: {
        text: `What external API or Tool does this agent need to perform its skill?\n\n(Type the name, e.g. \`Dune Analytics\`, \`Twitter API\`, \`GitHub API\`, \`Perplexity\`, or type \`None\` if it only needs base AI intelligence)`,
        parseMode: "Markdown",
      },
    };
  }

  if (state.stage === "collect_agent_tool") {
    if (text.trim().toLowerCase() === "none") {
      draft.agentRegistration = { ...draft.agentRegistration, tool: "None" };
      const next: DealCopilotState = { stage: "collect_agent_system_prompt", draft };
      return {
        nextState: next,
        reply: {
          text: `Got it, no extra tools.\n\nNext, please provide the **Instructions / Knowledge Base** for this agent. Tell it exactly how it should behave, or simply send a **URL link** to a file (like a GitHub Gist, raw GitHub repo file, Pastebin, etc.) containing its skill code/prompts.`,
          parseMode: "Markdown",
        },
      };
    } else {
      const toolName = text.trim();
      draft.agentRegistration = { ...draft.agentRegistration, tool: toolName };
      const next: DealCopilotState = { stage: "collect_agent_tool_key", draft };
      return {
        nextState: next,
        reply: {
          text: `Great, you are adding **${toolName}** to this agent.\n\nPlease reply with your ${toolName} API Key. *(This will be securely encrypted and never shown again.)*`,
          parseMode: "Markdown",
        },
      };
    }
  }

  if (state.stage === "collect_agent_tool_key") {
     // User is providing a tool API key. We hide it from state visually, but store it.
     draft.agentRegistration = { ...draft.agentRegistration, toolApiKey: text.trim() }; 
     const next: DealCopilotState = { stage: "collect_agent_system_prompt", draft };
     return {
      nextState: next,
      reply: {
        text: `🔐 API Key saved securely.\n\nNext, please provide the **Instructions / Knowledge Base** for this agent. Detail what its job is, or simply send a **URL link** to a file (like a GitHub Gist or raw code file) containing its logic.`,
        parseMode: "Markdown",
      },
    };
  }

  if (state.stage === "collect_agent_system_prompt") {
     draft.agentRegistration = { ...draft.agentRegistration, systemPrompt: text.trim() };
     const isUrl = text.trim().startsWith("http");
     const next: DealCopilotState = { stage: "collect_agent_fee", draft };
     return {
      nextState: next,
      reply: {
        text: `${isUrl ? "🔗 Remote skill loaded!" : "🧠 Agent intelligence saved!"}\n\nFinally, what is the minimum fee (in USDC) a client must pay per task to hire this agent? (e.g. \`10\`)`,
        parseMode: "Markdown",
      },
     };
  }

  if (state.stage === "collect_agent_fee") {
     const fee = parseNumber(text);
     if (!fee || fee <= 0) return { nextState: state, reply: { text: "Send a valid amount, e.g. `10`", parseMode: "Markdown" } };
     draft.agentRegistration = { ...draft.agentRegistration, fee: fee };
     const next: DealCopilotState = { stage: "review_agent", draft };
     return {
      nextState: next,
      reply: {
        text: `🤖 **Agent Summary:**\n\n**Name:** ${draft.agentRegistration.name}\n**Skill:** ${draft.agentRegistration.skill}\n**Tool:** ${draft.agentRegistration.tool || "None"}\n**Task Fee:** $${fee} USDC\n\nEverything look correct?`,
        buttons: [[{ text: "✅ Deploy Agent", callback_data: "deploy_agent" }, { text: "🔄 Restart", callback_data: "reset_deal" }]],
        parseMode: "Markdown",
      },
    };
  }

  if (state.stage === "review_agent") {
     return { nextState: state, reply: { text: "Please use the buttons above to deploy or restart.", parseMode: "Markdown" } };
  }

  if (state.stage === "collect_roles") {
    if (/freelancer=/i.test(text)) {
      draft.clientTelegramId = draft.clientTelegramId ?? fromTelegramId;
      draft.freelancerTelegramId = draft.freelancerTelegramId ?? undefined;
    } else {
      draft.clientTelegramId = draft.clientTelegramId ?? fromTelegramId;
    }
    const next: DealCopilotState = { stage: "collect_payout_currency", draft };
    return {
      nextState: next,
      reply: {
        text: `Great. What payout currency should the freelancer receive?`,
        buttons: [
          [
            { text: "🇺🇸 USDC", callback_data: "pick_usdc" },
            { text: "🇪🇺 EURC", callback_data: "pick_eurc" },
          ],
        ],
        parseMode: "Markdown",
      },
    };
  }

  if (state.stage === "collect_payout_currency") {
    const upper = text.toUpperCase();
    const currency: SupportedPayoutCurrency = upper === "EURC" ? "EURC" : "USDC";
    draft.payoutCurrency = currency;
    const next: DealCopilotState = { stage: "collect_total_amount", draft };
    return {
      nextState: next,
      reply: { text: `💵 What is the **total amount** (gross) in USDC terms?\nExample: \`5000\``, parseMode: "Markdown" },
    };
  }

  if (state.stage === "collect_total_amount") {
    const n = parseNumber(text);
    if (!n || n <= 0) {
      return { nextState: state, reply: { text: "Please send a number like `1200`.", parseMode: "Markdown" } };
    }
    draft.totalAmount = Math.round(n * 100) / 100;
    const { fee, net } = computeFeeAndNet(draft.totalAmount);
    const next: DealCopilotState = { stage: "collect_freelancer_address", draft };
    return {
      nextState: next,
      reply: {
        text: [
          `✅ Total: ${formatDollars(draft.totalAmount)}`,
          `💳 Platform fee (2%): ${formatDollars(fee)}`,
          `💰 Net milestones must sum to: **${formatDollars(net)}**`,
          ``,
          `Now send the **freelancer wallet address** (0x...).`,
        ].join("\n"),
        parseMode: "Markdown",
      },
    };
  }

  if (state.stage === "collect_freelancer_address") {
    if (!looksLikeEthAddress(text)) {
      return { nextState: state, reply: { text: "❌ That doesn't look like a valid 0x address. Try again.", parseMode: "Markdown" } };
    }
    draft.freelancerAddress = text.trim();
    const next: DealCopilotState = { stage: "collect_milestones_count", draft };
    return {
      nextState: next,
      reply: { text: "📌 How many milestones? (1–10)\nExample: `3`", parseMode: "Markdown" },
    };
  }

  if (state.stage === "collect_milestones_count") {
    const n = parseNumber(text);
    if (!n) return { nextState: state, reply: { text: "Send a number like `3`.", parseMode: "Markdown" } };
    const count = clampMilestonesCount(n);
    draft.desiredMilestonesCount = count;
    draft.collectingMilestoneIndex = 0;
    draft.milestones = [];
    const next: DealCopilotState = { stage: "collect_milestone_item", draft };
    return {
      nextState: next,
      reply: {
        text: `📝 Milestone 1/${count}: send \`amount - description\`\nExample: \`400 - Design & wireframes\``,
        parseMode: "Markdown",
      },
    };
  }

  if (state.stage === "collect_milestone_item") {
    const idx = draft.collectingMilestoneIndex ?? 0;
    const total = draft.desiredMilestonesCount ?? 0;
    const parts = text.split("-").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      return { nextState: state, reply: { text: "Format should be: `amount - description`", parseMode: "Markdown" } };
    }
    const amount = parseNumber(parts[0]);
    const description = parts.slice(1).join(" - ").trim();
    if (!amount || amount <= 0 || !description) {
      return { nextState: state, reply: { text: "Please provide a positive amount and a description.", parseMode: "Markdown" } };
    }
    draft.milestones = [...draft.milestones, { amount: Math.round(amount * 100) / 100, description }];
    draft.collectingMilestoneIndex = idx + 1;

    if (draft.milestones.length >= total) {
      const next: DealCopilotState = { stage: "review", draft: { ...draft, collectingMilestoneIndex: undefined } };
      return { nextState: next, reply: summarizeWithButtons(next.draft) };
    }

    return {
      nextState: { stage: "collect_milestone_item", draft },
      reply: {
        text: `📝 Milestone ${draft.milestones.length + 1}/${total}: send \`amount - description\`.`,
        parseMode: "Markdown",
      },
    };
  }

  // review stage: show summary with buttons
  if (state.stage === "review") {
    return { nextState: state, reply: summarizeWithButtons(state.draft) };
  }

  return { nextState: state, reply: { text: "Send `/help` for commands.", parseMode: "Markdown" } };
}

export function buildCreatePrefill(draft: DealDraft) {
  return {
    freelancerAddress: draft.freelancerAddress,
    totalAmount: String(draft.totalAmount || ""),
    payoutCurrency: draft.payoutCurrency,
    milestones: (draft.milestones || []).map((m) => ({
      amount: String(m.amount || ""),
      description: m.description || "",
    })),
  };
}
