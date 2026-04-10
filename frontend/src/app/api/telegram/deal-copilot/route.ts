import { NextResponse, after } from "next/server";
import { getJsonStore } from "@/lib/dealCopilot/storage";
import {
  handleMessage,
  handleCallbackQuery,
  handleStatusCommand,
  handleMyContractsCommand,
  initialState,
  getDealTtlSeconds,
} from "@/lib/dealCopilot/engine";
import { telegramSendMessage, telegramAnswerCallbackQuery, escapeMarkdown } from "@/lib/dealCopilot/telegram";
import {
  getOrCreateWallet,
  getWallet,
  getPrivateKey,
  isWalletEnabled,
} from "@/lib/dealCopilot/wallet";
import {
  checkBalance,
  createEscrowContract,
  fundContract,
  submitMilestone,
  approveMilestone,
  releaseMilestonePayment,
  initiateDispute,
  cancelContract,
  deployAgent,
} from "@/lib/dealCopilot/executor";
import {
  fetchContractDetails,
  formatContractSummary,
  contractActionButtons,
} from "@/lib/dealCopilot/chain";
import { runAgentLoop, handleAgentConfirmation, isAgentEnabled } from "@/lib/dealCopilot/agent";
import { resolveApiKey, saveUserApiKey, deleteUserApiKey } from "@/lib/dealCopilot/byok";
import { isHeavyTask, dispatchToWorker, isWorkerEnabled } from "@/lib/dealCopilot/openclawDispatch";
import type { DealCopilotState } from "@/lib/dealCopilot/types";
import type { JsonStore } from "@/lib/dealCopilot/storage";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds — needed for on-chain transactions

/* ------------------------------------------------------------------ */
/* Env helpers                                                         */
/* ------------------------------------------------------------------ */

function sanitizeEnvValue(v: string | undefined): string {
  const s = (v ?? "").trim();
  return s.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
}

function getTelegramToken(): string {
  return sanitizeEnvValue(process.env.TELEGRAM_BOT_TOKEN);
}

function getWebhookSecret(): string {
  return sanitizeEnvValue(process.env.TELEGRAM_WEBHOOK_SECRET);
}

function storeKey(chatId: string) {
  return `dealCopilot:state:${chatId}`;
}

function addressLookupKey(address: string) {
  return `wallet:lookup:${address.toLowerCase()}`;
}

function looksLikeEthAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

/** Save wallet address → chatId mapping so we can notify freelancers */
async function indexWalletAddress(store: JsonStore, address: string, chatId: string): Promise<void> {
  await store.setJSON(addressLookupKey(address), { chatId }, 365 * 24 * 3600);
}

/** Look up the Telegram chatId for a given wallet address */
async function getChatIdByWallet(store: JsonStore, address: string): Promise<string | null> {
  const record = await store.getJSON<{ chatId: string }>(addressLookupKey(address));
  return record?.chatId ?? null;
}

/** Notify a freelancer about a new contract or funding event */
async function notifyFreelancer(
  store: JsonStore,
  token: string,
  freelancerAddress: string,
  message: string,
  buttons?: { text: string; url: string }[][]
): Promise<void> {
  try {
    const freelancerChatId = await getChatIdByWallet(store, freelancerAddress);
    if (freelancerChatId) {
      await telegramSendMessage({
        token,
        chatId: freelancerChatId,
        reply: { text: message, buttons, parseMode: "Markdown" },
      });
    }
  } catch (e) {
    console.error("[dealCopilot] Failed to notify freelancer:", e);
  }
}

/* ------------------------------------------------------------------ */
/* Telegram Update types                                               */
/* ------------------------------------------------------------------ */

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
    from: { id: number };
  };
};

/* ------------------------------------------------------------------ */
/* Wallet command handlers                                             */
/* ------------------------------------------------------------------ */

async function handleWalletCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: "❌ Wallet features are not enabled. Server needs `WALLET_ENCRYPTION_SECRET` set.", parseMode: "Markdown" },
    });
    return;
  }

  const { wallet, created } = await getOrCreateWallet(store, fromId);
  const explorer = `https://testnet.arcscan.app/address/${wallet.address}`;

  // Index wallet address → chatId for freelancer notifications
  await indexWalletAddress(store, wallet.address, chatId);

  if (created) {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: [
          `🔐 **New Wallet Created!**`,
          ``,
          `📍 Address:`,
          `\`${wallet.address}\``,
          ``,
          `💡 Send USDC to this address to start using ArcLancer.`,
          `Use \`/balance\` to check your balance.`,
          `Use \`/export\` to export your private key.`,
          ``,
          `⚠️ **Important**: Your private key is encrypted and stored securely. You can export it anytime with \`/export\`.`,
        ].join("\n"),
        buttons: [[{ text: "🔗 View on Explorer", url: explorer }]],
        parseMode: "Markdown",
      },
    });
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: [
          `👛 **Your Wallet**`,
          ``,
          `📍 Address:`,
          `\`${wallet.address}\``,
          ``,
          `Created: ${new Date(wallet.createdAt).toLocaleDateString()}`,
          ``,
          `Use \`/balance\` to check USDC balance.`,
          `Use \`/deposit\` to see your deposit address.`,
        ].join("\n"),
        buttons: [[{ text: "🔗 View on Explorer", url: explorer }]],
        parseMode: "Markdown",
      },
    });
  }
}

async function handleBalanceCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: "No wallet found. Send `/wallet` to create one.", parseMode: "Markdown" },
    });
    return;
  }

  const balance = await checkBalance(wallet.address);
  await telegramSendMessage({
    token,
    chatId,
    reply: {
      text: [
        `💰 **Wallet Balance**`,
        ``,
        `📍 \`${wallet.address.slice(0, 10)}…${wallet.address.slice(-8)}\``,
        `💵 **$${balance.toFixed(2)} USDC**`,
      ].join("\n"),
      parseMode: "Markdown",
    },
  });
}

async function handleDepositCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: "No wallet found. Send `/wallet` to create one.", parseMode: "Markdown" },
    });
    return;
  }

  await telegramSendMessage({
    token,
    chatId,
    reply: {
      text: [
        `📥 **Deposit USDC**`,
        ``,
        `Send USDC (Arc Testnet) to your wallet:`,
        ``,
        `\`${wallet.address}\``,
        ``,
        `📋 Tap the address above to copy it.`,
        ``,
        `🚰 Need testnet USDC? Visit the faucet:`,
        `https://faucet.circle.com`,
        ``,
        `Use \`/balance\` to check when it arrives.`,
      ].join("\n"),
      parseMode: "Markdown",
    },
  });
}

async function handleExportCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: "No wallet found. Send `/wallet` to create one.", parseMode: "Markdown" },
    });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);

  await telegramSendMessage({
    token,
    chatId,
    reply: {
      text: [
        `🔑 **Private Key Export**`,
        ``,
        `⚠️ **NEVER share this with anyone!**`,
        `⚠️ **Delete this message after saving!**`,
        ``,
        `\`${pk}\``,
        ``,
        `📍 Address: \`${wallet.address}\``,
        ``,
        `You can import this key into MetaMask, Rainbow, or any EVM wallet.`,
      ].join("\n"),
      parseMode: "Markdown",
    },
  });
}

/* ------------------------------------------------------------------ */
/* Transaction command handlers                                        */
/* ------------------------------------------------------------------ */

async function handleCreateContract(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number,
  key: string
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled. Set `WALLET_ENCRYPTION_SECRET`.", parseMode: "Markdown" } });
    return;
  }

  // Get deal state
  const state = await store.getJSON<DealCopilotState>(key);
  if (!state?.draft) {
    await telegramSendMessage({ token, chatId, reply: { text: "No active deal. Send `/startdeal` first.", parseMode: "Markdown" } });
    return;
  }

  const draft = state.draft;

  // Validate draft
  if (!looksLikeEthAddress(draft.freelancerAddress)) {
    await telegramSendMessage({ token, chatId, reply: { text: "⚠️ Invalid freelancer address. Use `/edit address 0x...` to fix.", parseMode: "Markdown" } });
    return;
  }
  if (!draft.totalAmount || draft.totalAmount <= 0) {
    await telegramSendMessage({ token, chatId, reply: { text: "⚠️ Missing total amount. Use `/edit total 5000` to fix.", parseMode: "Markdown" } });
    return;
  }
  if (!draft.milestones || draft.milestones.length === 0) {
    await telegramSendMessage({ token, chatId, reply: { text: "⚠️ No milestones. Add milestones first.", parseMode: "Markdown" } });
    return;
  }

  // Get wallet
  const { wallet, created } = await getOrCreateWallet(store, fromId);
  if (created) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `🔐 Wallet created: \`${wallet.address}\`\n\nYou need USDC for the fee ($${(draft.totalAmount * 0.02).toFixed(2)}). Send USDC to your wallet first, then try \`/create\` again.`, parseMode: "Markdown" },
    });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);

  // Notify user
  await telegramSendMessage({
    token,
    chatId,
    reply: { text: "⏳ Creating escrow contract on-chain... (this may take a moment)", parseMode: "Markdown" },
  });

  // Execute
  const result = await createEscrowContract(pk, draft);

  if (result.success) {
    // Store contract address in state
    const updatedDraft = { ...draft, lastContractAddress: result.contractAddress, updatedAt: Date.now() };
    await store.setJSON(key, { stage: "review" as const, draft: updatedDraft }, getDealTtlSeconds());

    const lines = [
      `✅ **Contract Created!**`,
      ``,
      `📋 Contract: \`${result.contractAddress}\``,
      `🔗 Tx: \`${result.hash?.slice(0, 14)}…\``,
      ``,
      `**Next steps:**`,
      `1. Fund the contract: \`/fund\``,
      `2. Check status: \`/status ${result.contractAddress}\``,
    ];

    const buttons: { text: string; url: string }[][] = [];
    if (result.explorerUrl) {
      buttons.push([{ text: "🔗 View Transaction", url: result.explorerUrl }]);
    }
    if (result.contractAddress) {
      buttons.push([{ text: "📋 View Contract", url: `https://testnet.arcscan.app/address/${result.contractAddress}` }]);
    }

    await telegramSendMessage({ token, chatId, reply: { text: lines.join("\n"), buttons, parseMode: "Markdown" } });

    // 🔔 Notify the freelancer about the new contract
    if (draft.freelancerAddress && result.contractAddress) {
      const clientWallet = await getWallet(store, fromId);
      const clientAddr = clientWallet?.address ? `\`${clientWallet.address.slice(0, 10)}…\`` : "a client";
      const notifyMsg = [
        `🔔 **New Escrow Contract Created!**`,
        ``,
        `A client (${clientAddr}) has created an escrow contract with you.`,
        ``,
        `💰 Total: **$${draft.totalAmount?.toFixed(2)} ${draft.payoutCurrency || "USDC"}**`,
        `📋 Milestones: **${draft.milestones?.length || 0}**`,
        `📋 Contract: \`${result.contractAddress}\``,
        ``,
        `Once the contract is funded, you can submit milestone deliverables with:`,
        `\`/submit ${result.contractAddress} 1 <deliverable_url>\``,
      ].join("\n");
      const notifyButtons = result.contractAddress
        ? [[{ text: "📋 View Contract", url: `https://testnet.arcscan.app/address/${result.contractAddress}` }]]
        : [];
      await notifyFreelancer(store, token, draft.freelancerAddress, notifyMsg, notifyButtons);
    }
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `❌ **Contract creation failed**\n\n${result.error}`, parseMode: "Markdown" },
    });
  }
}

async function handleFundCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number,
  text: string,
  key: string
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  // Parse contract address from text or use last
  let contractAddr = text.replace(/^\/fund\s*/i, "").trim();
  if (!contractAddr) {
    const state = await store.getJSON<DealCopilotState>(key);
    contractAddr = state?.draft?.lastContractAddress || "";
  }

  if (!looksLikeEthAddress(contractAddr)) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: "Send `/fund 0x<contractAddress>` or create a contract first with `/create`.", parseMode: "Markdown" },
    });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);
  await telegramSendMessage({ token, chatId, reply: { text: "⏳ Funding contract..." } });

  const result = await fundContract(pk, contractAddr);
  if (result.success) {
    const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: `✅ **Contract Funded!**\n\n📋 \`${contractAddr.slice(0, 10)}…${contractAddr.slice(-8)}\`\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\`\n\nThe freelancer can now submit milestones.`,
        buttons,
        parseMode: "Markdown",
      },
    });

    // 🔔 Notify freelancer that contract is funded
    const state = await store.getJSON<DealCopilotState>(key);
    const freelancerAddr = state?.draft?.freelancerAddress;
    if (freelancerAddr) {
      const clientWallet = await getWallet(store, fromId);
      const clientAddr = clientWallet?.address ? `\`${clientWallet.address.slice(0, 10)}…\`` : "a client";
      const notifyMsg = [
        `💰 **Contract Funded!**`,
        ``,
        `${clientAddr} has funded the escrow contract.`,
        `📋 Contract: \`${contractAddr.slice(0, 10)}…${contractAddr.slice(-8)}\``,
        ``,
        `You can now start submitting milestones:`,
        `\`/submit ${contractAddr} 1 <deliverable_url>\``,
      ].join("\n");
      const notifyButtons = [[{ text: "📋 View Contract", url: `https://testnet.arcscan.app/address/${contractAddr}` }]];
      await notifyFreelancer(store, token, freelancerAddr, notifyMsg, notifyButtons);
    }
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `❌ **Funding failed**\n\n${result.error}`, parseMode: "Markdown" },
    });
  }
}

async function handleSubmitCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number,
  text: string,
  key: string
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  // Supported formats:
  //   /submit 0xContract 1 https://link.com      (explicit contract)
  //   /submit 0xContract 1                         (will prompt for URL)
  //   /submit 1 https://link.com                   (uses last contract from state)
  //   /submit 1                                     (uses last contract, prompts for URL)
  const raw = text.replace(/^\/submit\s*/i, "").trim();
  const parts = raw.split(/\s+/);
  let contractAddr = "";
  let milestoneIdx = -1;
  let uri = "";

  if (parts.length >= 1 && looksLikeEthAddress(parts[0])) {
    // First arg is contract address
    contractAddr = parts[0];
    if (parts.length >= 2) milestoneIdx = parseInt(parts[1]) - 1;
    if (parts.length >= 3) uri = parts.slice(2).join(" ");
  } else if (parts.length >= 1 && parts[0]) {
    // First arg is milestone number
    milestoneIdx = parseInt(parts[0]) - 1;
    if (parts.length >= 2) uri = parts.slice(1).join(" ");
    // Try to get contract from state
    const state = await store.getJSON<DealCopilotState>(key);
    contractAddr = state?.draft?.lastContractAddress || "";
  }

  // Validate milestone index
  if (isNaN(milestoneIdx) || milestoneIdx < 0) {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: [
          "📤 **Submit Milestone**",
          "",
          "Format: `/submit 0x<contract> <milestone#> <deliverable_url>`",
          "",
          "Examples:",
          "  `/submit 0xAbC...123 1 https://drive.google.com/file/abc`",
          "  `/submit 1 https://drive.google.com/file/abc`",
          "",
          "The milestone number starts at 1.",
        ].join("\n"),
        parseMode: "Markdown",
      },
    });
    return;
  }

  // Validate contract address
  if (!looksLikeEthAddress(contractAddr)) {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: [
          "⚠️ **Contract address required**",
          "",
          "I don't have a contract address saved for this chat.",
          "Please include it in the command:",
          "",
          "`/submit 0x<contractAddress> " + (milestoneIdx + 1) + " <deliverable_url>`",
          "",
          "You can find the contract address with `/mycontracts 0x<yourWallet>`.",
        ].join("\n"),
        parseMode: "Markdown",
      },
    });
    return;
  }

  if (!uri) {
    // Save pending state and ask for URI
    const state = await store.getJSON<DealCopilotState>(key);
    const draft = state?.draft ?? { id: "", chatId, createdAt: Date.now(), updatedAt: Date.now(), payoutCurrency: "USDC" as const, totalAmount: 0, freelancerAddress: "", milestones: [] };
    const updatedDraft = { ...draft, pendingSubmitContract: contractAddr, pendingSubmitMilestone: milestoneIdx, updatedAt: Date.now() };
    await store.setJSON(key, { stage: "awaiting_submit_uri" as const, draft: updatedDraft }, getDealTtlSeconds());
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `📤 Send the deliverable URL/link for milestone ${milestoneIdx + 1}:`, parseMode: "Markdown" },
    });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);
  await telegramSendMessage({ token, chatId, reply: { text: `⏳ Submitting milestone ${milestoneIdx + 1}...` } });

  const result = await submitMilestone(pk, contractAddr, milestoneIdx, uri);
  if (result.success) {
    const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: `✅ **Milestone ${milestoneIdx + 1} Submitted!**\n\n📎 Deliverable: ${escapeMarkdown(uri)}\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\`\n\nWaiting for client approval.`,
        buttons,
        parseMode: "Markdown",
      },
    });
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `❌ **Submit failed**\n\n${result.error}`, parseMode: "Markdown" },
    });
  }
}

async function handleApproveCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number,
  text: string,
  key: string
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  const parts = text.replace(/^\/approve\s*/i, "").trim().split(/\s+/);
  let contractAddr = "";
  let milestoneIdx = -1;

  if (parts.length >= 2 && looksLikeEthAddress(parts[0])) {
    contractAddr = parts[0];
    milestoneIdx = parseInt(parts[1]) - 1;
  } else if (parts.length >= 1) {
    milestoneIdx = parseInt(parts[0]) - 1;
    const state = await store.getJSON<DealCopilotState>(key);
    contractAddr = state?.draft?.lastContractAddress || "";
  }

  if (isNaN(milestoneIdx) || milestoneIdx < 0) {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: "Format: `/approve 0x<contract> <milestone#>`\nExample: `/approve 0xAbC...123 1`",
        parseMode: "Markdown",
      },
    });
    return;
  }

  if (!looksLikeEthAddress(contractAddr)) {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: `⚠️ **Contract address required**\n\nPlease include the contract address:\n\`/approve 0x<contractAddress> ${milestoneIdx + 1}\`\n\nFind it with \`/mycontracts 0x<yourWallet>\`.`,
        parseMode: "Markdown",
      },
    });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);
  await telegramSendMessage({ token, chatId, reply: { text: `⏳ Approving milestone ${milestoneIdx + 1}...` } });

  const result = await approveMilestone(pk, contractAddr, milestoneIdx);
  if (result.success) {
    // Automatically release payment after approval
    await telegramSendMessage({ token, chatId, reply: { text: `✅ Approved! Now releasing payment...` } });

    const releaseResult = await releaseMilestonePayment(pk, contractAddr, milestoneIdx);
    if (releaseResult.success) {
      const buttons = releaseResult.explorerUrl ? [[{ text: "🔗 View Transaction", url: releaseResult.explorerUrl }]] : [];
      await telegramSendMessage({
        token,
        chatId,
        reply: {
          text: `💰 **Milestone ${milestoneIdx + 1} Approved & Paid!**\n\n✅ Approved Tx: \`${result.hash?.slice(0, 14)}…\`\n💸 Payment Tx: \`${releaseResult.hash?.slice(0, 14)}…\`\n\nThe freelancer has been paid.`,
          buttons,
          parseMode: "Markdown",
        },
      });
    } else {
      // Approved but release failed — tell user to retry with /withdraw
      const buttons = result.explorerUrl ? [[{ text: "🔗 Approval Tx", url: result.explorerUrl }]] : [];
      await telegramSendMessage({
        token,
        chatId,
        reply: {
          text: `✅ **Milestone ${milestoneIdx + 1} Approved** but payment release failed.\n\n${releaseResult.error}\n\nUse \`/withdraw ${milestoneIdx + 1}\` to retry releasing the payment.`,
          buttons,
          parseMode: "Markdown",
        },
      });
    }
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `❌ **Approval failed**\n\n${result.error}`, parseMode: "Markdown" },
    });
  }
}

async function handleWithdrawCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number,
  text: string,
  key: string
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  const parts = text.replace(/^\/withdraw\s*/i, "").trim().split(/\s+/);
  let contractAddr = "";
  let milestoneIdx = -1;

  if (parts.length >= 2 && looksLikeEthAddress(parts[0])) {
    contractAddr = parts[0];
    milestoneIdx = parseInt(parts[1]) - 1;
  } else if (parts.length >= 1) {
    milestoneIdx = parseInt(parts[0]) - 1;
    const state = await store.getJSON<DealCopilotState>(key);
    contractAddr = state?.draft?.lastContractAddress || "";
  }

  if (isNaN(milestoneIdx) || milestoneIdx < 0) {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: "Format: `/withdraw 0x<contract> <milestone#>`\nExample: `/withdraw 0xAbC...123 1`",
        parseMode: "Markdown",
      },
    });
    return;
  }

  if (!looksLikeEthAddress(contractAddr)) {
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: `⚠️ **Contract address required**\n\nPlease include the contract address:\n\`/withdraw 0x<contractAddress> ${milestoneIdx + 1}\`\n\nFind it with \`/mycontracts 0x<yourWallet>\`.`,
        parseMode: "Markdown",
      },
    });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);
  await telegramSendMessage({ token, chatId, reply: { text: `⏳ Releasing milestone ${milestoneIdx + 1} payment...` } });

  const result = await releaseMilestonePayment(pk, contractAddr, milestoneIdx);
  if (result.success) {
    const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
    await telegramSendMessage({
      token,
      chatId,
      reply: {
        text: `💰 **Milestone ${milestoneIdx + 1} Payment Released!**\n\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\``,
        buttons,
        parseMode: "Markdown",
      },
    });
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `❌ **Withdrawal failed**\n\n${result.error}`, parseMode: "Markdown" },
    });
  }
}

async function handleDisputeCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number,
  text: string,
  key: string
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  let contractAddr = text.replace(/^\/dispute\s*/i, "").trim();
  if (!contractAddr) {
    const state = await store.getJSON<DealCopilotState>(key);
    contractAddr = state?.draft?.lastContractAddress || "";
  }

  if (!looksLikeEthAddress(contractAddr)) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: "Format: `/dispute 0x<contractAddress>`", parseMode: "Markdown" },
    });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);
  await telegramSendMessage({ token, chatId, reply: { text: "⏳ Initiating dispute..." } });

  const result = await initiateDispute(pk, contractAddr);
  if (result.success) {
    const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `🔴 **Dispute Initiated**\n\n📋 \`${contractAddr.slice(0, 10)}…${contractAddr.slice(-8)}\`\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\``, buttons, parseMode: "Markdown" },
    });
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `❌ **Dispute failed**\n\n${result.error}`, parseMode: "Markdown" },
    });
  }
}

async function handleCancelCommand(
  store: JsonStore,
  token: string,
  chatId: string,
  fromId: number,
  text: string,
  key: string
): Promise<void> {
  if (!isWalletEnabled()) {
    await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
    return;
  }

  let contractAddr = text.replace(/^\/cancel\s*/i, "").trim();
  if (!contractAddr) {
    const state = await store.getJSON<DealCopilotState>(key);
    contractAddr = state?.draft?.lastContractAddress || "";
  }

  if (!looksLikeEthAddress(contractAddr)) {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: "Format: `/cancel 0x<contractAddress>`", parseMode: "Markdown" },
    });
    return;
  }

  const wallet = await getWallet(store, fromId);
  if (!wallet) {
    await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
    return;
  }

  const pk = getPrivateKey(wallet, fromId);
  await telegramSendMessage({ token, chatId, reply: { text: "⏳ Cancelling contract..." } });

  const result = await cancelContract(pk, contractAddr);
  if (result.success) {
    const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `⚪ **Contract Cancelled**\n\n📋 \`${contractAddr.slice(0, 10)}…${contractAddr.slice(-8)}\`\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\``, buttons, parseMode: "Markdown" },
    });
  } else {
    await telegramSendMessage({
      token,
      chatId,
      reply: { text: `❌ **Cancel failed**\n\n${result.error}`, parseMode: "Markdown" },
    });
  }
}

/* ------------------------------------------------------------------ */
/* POST handler                                                        */
/* ------------------------------------------------------------------ */

const recentUpdateIds = new Set<number>();

export async function POST(req: Request) {
  const token = getTelegramToken();
  const expectedSecret = getWebhookSecret();

  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });
  }

  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: "Missing TELEGRAM_WEBHOOK_SECRET" }, { status: 500 });
  }

  const gotSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (gotSecret !== expectedSecret) {
    console.error("[dealCopilot] webhook secret mismatch");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate | null = null;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch (e) {
    console.error("[dealCopilot] invalid JSON body", e);
    return NextResponse.json({ ok: true });
  }

  // Deduplication: reject the same update_id within 60s
  const updateId = update?.update_id;
  if (updateId && recentUpdateIds.has(updateId)) {
    return NextResponse.json({ ok: true });
  }
  if (updateId) {
    recentUpdateIds.add(updateId);
    setTimeout(() => recentUpdateIds.delete(updateId), 60_000);
  }

  const store = getJsonStore();

  /* ── Handle callback queries (inline button taps) ── */
  if (update?.callback_query) {
    const cbq = update.callback_query;
    const chatIdNum = cbq.message?.chat?.id;
    const callbackData = cbq.data || "";
    const callbackQueryId = cbq.id;

    if (!chatIdNum || !callbackData) {
      await telegramAnswerCallbackQuery({ token, callbackQueryId }).catch(() => { });
      return NextResponse.json({ ok: true });
    }

    const chatId = String(chatIdNum);
    const key = storeKey(chatId);

    try {
      const existing = await store.getJSON<DealCopilotState>(key);
      let state = existing ?? null;

      // Handle currency picker callbacks
      if (callbackData === "pick_usdc" || callbackData === "pick_eurc") {
        if (state && state.stage === "collect_payout_currency") {
          const currency = callbackData === "pick_eurc" ? "EURC" : "USDC";
          const { nextState, reply } = handleMessage(state, chatId, cbq.from.id, currency);
          if (nextState) await store.setJSON(key, nextState, getDealTtlSeconds());
          else await store.del(key);
          await telegramAnswerCallbackQuery({ token, callbackQueryId, text: `Selected ${currency}` }).catch(() => { });
          await telegramSendMessage({ token, chatId, reply });
          return NextResponse.json({ ok: true });
        }
      }

      // Handle "create_escrow" callback → deploy on-chain
      if (callbackData === "create_escrow") {
        await telegramAnswerCallbackQuery({ token, callbackQueryId, text: "Creating contract..." }).catch(() => { });
        after(async () => {
          try { await handleCreateContract(store, token, chatId, cbq.from.id, key); }
          catch (e) {
            console.error("[dealCopilot] create_escrow failed", e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            await telegramSendMessage({ token, chatId, reply: { text: `❌ Contract creation failed: ${msg.slice(0, 200)}` } }).catch(() => { });
          }
        });
        return NextResponse.json({ ok: true });
      }

      // Handle "deploy_agent" callback → deploy agent on-chain
      if (callbackData === "deploy_agent") {
        await telegramAnswerCallbackQuery({ token, callbackQueryId, text: "Deploying Agent..." }).catch(() => { });
        after(async () => {
          try {
            if (!isWalletEnabled()) {
              await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
              return;
            }
            const wallet = await getWallet(store, cbq.from.id);
            if (!wallet) {
              await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
              return;
            }
            const pk = getPrivateKey(wallet, cbq.from.id);

            const s = await store.getJSON<DealCopilotState>(key);
            const agentReg = s?.draft?.agentRegistration;
            if (!agentReg || !agentReg.name || !agentReg.skill || agentReg.fee == null) {
              await telegramSendMessage({ token, chatId, reply: { text: "❌ Agent draft is incomplete.", parseMode: "Markdown" } });
              return;
            }

            const toolName = agentReg.tool || "None";
            await telegramSendMessage({ token, chatId, reply: { text: "⏳ Minting AI Agent on-chain..." } });

            const result = await deployAgent(pk, agentReg.name, agentReg.skill, toolName, agentReg.fee);

          if (result.success) {
              const agentId = result.contractAddress;
              
              // Save off-chain metadata (System Prompt, API key) to the JSON store securely
              if (agentId) {
                await store.setJSON(`agent_meta:${agentId}`, {
                  systemPrompt: agentReg.systemPrompt || "You are a helpful AI assistant.",
                  toolApiKey: agentReg.toolApiKey || "",
                  creatorId: cbq.from.id,
                  ownerWallet: wallet.address
                }, 60 * 60 * 24 * 365);
              }

              const buttons = result.explorerUrl ? [[{ text: "🔗 View NFT Transaction", url: result.explorerUrl }]] : [];
              await telegramSendMessage({
                token,
                chatId,
                reply: {
                  text: `🎉 **Agent Successfully Registered!**\n\nYour agent **${agentReg.name}** (Token ID: ${agentId}) is now live on the Arc Network!\n\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\``,
                  buttons,
                  parseMode: "Markdown"
                }
              });
              await store.del(key); // Clear draft
            } else {
              await telegramSendMessage({ token, chatId, reply: { text: `❌ Agent deployment failed: ${result.error}` } });
            }
          }
          catch (e) {
            console.error("[dealCopilot] deploy_agent failed", e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            await telegramSendMessage({ token, chatId, reply: { text: `❌ Agent deployment failed: ${msg.slice(0, 200)}` } }).catch(() => { });
          }
        });
        return NextResponse.json({ ok: true });
      }

      // Handle action buttons from /status (action_fund_0x..., action_approve_0x..._0, etc.)
      if (callbackData.startsWith("action_")) {
        const fromId = cbq.from.id;
        await telegramAnswerCallbackQuery({ token, callbackQueryId, text: "Processing..." }).catch(() => { });

        after(async () => {
          try {
            if (!isWalletEnabled()) {
              await telegramSendMessage({ token, chatId, reply: { text: "❌ Wallet not enabled." } });
              return;
            }
            const wallet = await getWallet(store, fromId);
            if (!wallet) {
              await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
              return;
            }
            const pk = getPrivateKey(wallet, fromId);

            if (callbackData.startsWith("action_fund_")) {
              const contractAddr = callbackData.replace("action_fund_", "");
              await telegramSendMessage({ token, chatId, reply: { text: "⏳ Funding contract..." } });
              const result = await fundContract(pk, contractAddr);
              if (result.success) {
                const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
                await telegramSendMessage({ token, chatId, reply: { text: `✅ **Contract Funded!**\n\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\``, buttons, parseMode: "Markdown" } });
              } else {
                await telegramSendMessage({ token, chatId, reply: { text: `❌ Funding failed: ${result.error}` } });
              }
            } else if (callbackData.startsWith("action_approve_")) {
              const rest = callbackData.replace("action_approve_", "");
              const lastUnderscore = rest.lastIndexOf("_");
              const contractAddr = rest.slice(0, lastUnderscore);
              const milestoneIdx = parseInt(rest.slice(lastUnderscore + 1));
              await telegramSendMessage({ token, chatId, reply: { text: `⏳ Approving milestone ${milestoneIdx + 1}...` } });
              const result = await approveMilestone(pk, contractAddr, milestoneIdx);
              if (result.success) {
                await telegramSendMessage({ token, chatId, reply: { text: `✅ Approved! Now releasing payment...` } });
                const releaseResult = await releaseMilestonePayment(pk, contractAddr, milestoneIdx);
                if (releaseResult.success) {
                  const buttons = releaseResult.explorerUrl ? [[{ text: "🔗 View Transaction", url: releaseResult.explorerUrl }]] : [];
                  await telegramSendMessage({ token, chatId, reply: { text: `💰 **Milestone ${milestoneIdx + 1} Approved & Paid!**\n\n✅ Tx: \`${result.hash?.slice(0, 14)}…\`\n💸 Tx: \`${releaseResult.hash?.slice(0, 14)}…\``, buttons, parseMode: "Markdown" } });
                } else {
                  await telegramSendMessage({ token, chatId, reply: { text: `✅ Approved but payment release failed. Use \`/withdraw ${milestoneIdx + 1}\` to retry.`, parseMode: "Markdown" } });
                }
              } else {
                await telegramSendMessage({ token, chatId, reply: { text: `❌ Approval failed: ${result.error}` } });
              }
            } else if (callbackData.startsWith("action_submit_")) {
              const rest = callbackData.replace("action_submit_", "");
              const lastUnderscore = rest.lastIndexOf("_");
              const contractAddr = rest.slice(0, lastUnderscore);
              const milestoneIdx = parseInt(rest.slice(lastUnderscore + 1));
              // Save pending state and ask for deliverable URL
              const draftState = await store.getJSON<DealCopilotState>(key);
              const draft = draftState?.draft ?? { id: "", chatId, createdAt: Date.now(), updatedAt: Date.now(), payoutCurrency: "USDC" as const, totalAmount: 0, freelancerAddress: "", milestones: [] };
              const updatedDraft = { ...draft, pendingSubmitContract: contractAddr, pendingSubmitMilestone: milestoneIdx, updatedAt: Date.now() };
              await store.setJSON(key, { stage: "awaiting_submit_uri" as const, draft: updatedDraft }, getDealTtlSeconds());
              await telegramSendMessage({ token, chatId, reply: { text: `📤 Send the deliverable URL/link for milestone ${milestoneIdx + 1}:` } });
            } else if (callbackData.startsWith("action_withdraw_")) {
              const rest = callbackData.replace("action_withdraw_", "");
              const lastUnderscore = rest.lastIndexOf("_");
              const contractAddr = rest.slice(0, lastUnderscore);
              const milestoneIdx = parseInt(rest.slice(lastUnderscore + 1));
              await telegramSendMessage({ token, chatId, reply: { text: `⏳ Releasing milestone ${milestoneIdx + 1} payment...` } });
              const result = await releaseMilestonePayment(pk, contractAddr, milestoneIdx);
              if (result.success) {
                const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
                await telegramSendMessage({ token, chatId, reply: { text: `💰 **Payment Released!**\n\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\``, buttons, parseMode: "Markdown" } });
              } else {
                await telegramSendMessage({ token, chatId, reply: { text: `❌ Release failed: ${result.error}` } });
              }
            }
          } catch (e) {
            console.error("[dealCopilot] action callback failed", e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            await telegramSendMessage({ token, chatId, reply: { text: `❌ Action failed: ${msg.slice(0, 200)}` } }).catch(() => { });
          }
        });
        return NextResponse.json({ ok: true });
      }

      // Handle AI agent confirmation/cancellation callbacks
      if (callbackData === "agent_confirm" || callbackData === "agent_cancel") {
        const confirmed = callbackData === "agent_confirm";
        await telegramAnswerCallbackQuery({ token, callbackQueryId, text: confirmed ? "Confirming..." : "Cancelled" }).catch(() => { });
        after(async () => {
          try {
            const reply = await handleAgentConfirmation(store, chatId, cbq.from.id, confirmed);
            await telegramSendMessage({ token, chatId, reply });
          } catch (e) {
            console.error("[dealCopilot] agent confirmation failed", e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            await telegramSendMessage({ token, chatId, reply: { text: `❌ Action failed: ${msg.slice(0, 200)}` } }).catch(() => { });
          }
        });
        return NextResponse.json({ ok: true });
      }

      const { nextState, reply } = handleCallbackQuery(state, chatId, callbackData);
      if (nextState) await store.setJSON(key, nextState, getDealTtlSeconds());
      else await store.del(key);

      await telegramAnswerCallbackQuery({ token, callbackQueryId }).catch(() => { });
      await telegramSendMessage({ token, chatId, reply });
    } catch (e) {
      console.error("[dealCopilot] callback handler failed", e);
      await telegramAnswerCallbackQuery({ token, callbackQueryId, text: "Error" }).catch(() => { });
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  /* ── Handle regular messages ── */
  const msg = update?.message;
  const chatIdNum = msg?.chat?.id;
  const fromId = msg?.from?.id;
  const text = msg?.text;

  if (!chatIdNum || !fromId || !text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(chatIdNum);
  const key = storeKey(chatId);
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();

  try {
    /* ── Wallet commands ── */
    if (lowerText === "/wallet" || lowerText === "/start") {
      await handleWalletCommand(store, token, chatId, fromId);
      return NextResponse.json({ ok: true });
    }
    if (lowerText === "/balance" || lowerText === "/bal") {
      await handleBalanceCommand(store, token, chatId, fromId);
      return NextResponse.json({ ok: true });
    }
    /* ── BYOK: /setkey and /removekey ── */
    if (/^\/setkey\b/i.test(trimmedText)) {
      const rawKey = trimmedText.substring("/setkey".length).trim();
      const key = rawKey.replace(/\s+/g, "");
      if (!key || (!key.startsWith("gsk_") && !key.startsWith("nvapi-") && !key.startsWith("sk-or-"))) {
        await telegramSendMessage({ token, chatId, reply: { text: "Usage: `/setkey sk-or-v1-...`\n\nGet a free OpenRouter key at https://openrouter.ai/keys", parseMode: "Markdown" } });
      } else {
        await saveUserApiKey(store, fromId, key);
        await telegramSendMessage({ token, chatId, reply: { text: "✅ **API Key saved!**\n\nYour OpenRouter key is stored securely. The AI agent will now use your personal key.\n\n_Use `/removekey` to delete it._", parseMode: "Markdown" } });
      }
      return NextResponse.json({ ok: true });
    }
    if (lowerText === "/removekey") {
      await deleteUserApiKey(store, fromId);
      await telegramSendMessage({ token, chatId, reply: { text: "🗑️ API key removed. The agent will fall back to the shared server key if configured.", parseMode: "Markdown" } });
      return NextResponse.json({ ok: true });
    }
    if (lowerText === "/deposit") {
      await handleDepositCommand(store, token, chatId, fromId);
      return NextResponse.json({ ok: true });
    }
    if (lowerText === "/export") {
      await handleExportCommand(store, token, chatId, fromId);
      return NextResponse.json({ ok: true });
    }

    /* ── Transaction commands (return 200 immediately, process async) ── */
    if (/^\/fund\b/i.test(trimmedText)) {
      after(async () => {
        try { await handleFundCommand(store, token, chatId, fromId, trimmedText, key); }
        catch (e) {
          console.error("[dealCopilot] /fund failed", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          await telegramSendMessage({ token, chatId, reply: { text: `❌ Fund failed: ${msg.slice(0, 200)}` } }).catch(() => { });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (/^\/submit\b/i.test(trimmedText)) {
      after(async () => {
        try { await handleSubmitCommand(store, token, chatId, fromId, trimmedText, key); }
        catch (e) {
          console.error("[dealCopilot] /submit failed", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          await telegramSendMessage({ token, chatId, reply: { text: `❌ Submit failed: ${msg.slice(0, 200)}` } }).catch(() => { });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (/^\/approve\b/i.test(trimmedText)) {
      after(async () => {
        try { await handleApproveCommand(store, token, chatId, fromId, trimmedText, key); }
        catch (e) {
          console.error("[dealCopilot] /approve failed", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          await telegramSendMessage({ token, chatId, reply: { text: `❌ Approve failed: ${msg.slice(0, 200)}` } }).catch(() => { });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (/^\/withdraw\b/i.test(trimmedText)) {
      after(async () => {
        try { await handleWithdrawCommand(store, token, chatId, fromId, trimmedText, key); }
        catch (e) {
          console.error("[dealCopilot] /withdraw failed", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          await telegramSendMessage({ token, chatId, reply: { text: `❌ Withdraw failed: ${msg.slice(0, 200)}` } }).catch(() => { });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (/^\/dispute\b/i.test(trimmedText)) {
      after(async () => {
        try { await handleDisputeCommand(store, token, chatId, fromId, trimmedText, key); }
        catch (e) {
          console.error("[dealCopilot] /dispute failed", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          await telegramSendMessage({ token, chatId, reply: { text: `❌ Dispute failed: ${msg.slice(0, 200)}` } }).catch(() => { });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (/^\/cancel\b/i.test(trimmedText)) {
      after(async () => {
        try { await handleCancelCommand(store, token, chatId, fromId, trimmedText, key); }
        catch (e) {
          console.error("[dealCopilot] /cancel failed", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          await telegramSendMessage({ token, chatId, reply: { text: `❌ Cancel failed: ${msg.slice(0, 200)}` } }).catch(() => { });
        }
      });
      return NextResponse.json({ ok: true });
    }

    /* ── On-chain read commands (async) ── */
    if (/^\/status\b/i.test(trimmedText)) {
      after(async () => {
        try {
          const reply = await handleStatusCommand(trimmedText);
          await telegramSendMessage({ token, chatId, reply });
        } catch (e) { console.error("[dealCopilot] /status failed", e); }
      });
      return NextResponse.json({ ok: true });
    }

    if (/^\/createagent\b/i.test(trimmedText)) {
      after(async () => {
        try {
          // Format expected: /createagent <AgentName> | <skills,comma,separated> | <Custom System Prompt>
          const parts = trimmedText.replace(/^\/createagent\s*/i, "").split("|").map(s => s.trim());
          if (parts.length < 3) {
            await telegramSendMessage({
              token, chatId, reply: {
                text: "❌ **Invalid Format**\n\nPlease use exactly this format:\n`/createagent AgentName | skill1,skill2 | Your custom instructions`\n\n_Example:_\n`/createagent DeFiAuditor | auditor, researcher | You are a DeFi expert`",
                parseMode: "Markdown"
              }
            });
            return;
          }

          const [agentName, skillsStr, systemPrompt] = parts;
          const skills = skillsStr.split(",").map(s => s.trim().toLowerCase());
          
          // Generate a pseudo-random ID for telegram users
          const agentId = Math.floor(Math.random() * 1000000);
          
          const brainData = {
            name: agentName,
            systemPrompt,
            skills,
            creatorId: fromId,
            ownerWallet: "telegram-user",
            createdAt: Date.now()
          };

          await store.setJSON(`agent_meta:${agentId}`, brainData, 60 * 60 * 24 * 365); // 1 year TTL
          
          await telegramSendMessage({
            token, chatId, reply: {
              text: `✅ **Agent Created: ${agentName}**\n\n🆔 **Agent ID**: \`${agentId}\`\n🧠 **Skills**: ${skills.join(", ")}\n\n_You can now assign tasks to this agent!_`,
              parseMode: "Markdown"
            }
          });
        } catch (e) { 
          console.error("[dealCopilot] /createagent failed", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          await telegramSendMessage({ token, chatId, reply: { text: `❌ Agent creation failed: ${msg.slice(0, 200)}` } }).catch(() => { });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (/^\/mycontracts\b/i.test(trimmedText)) {
      after(async () => {
        try {
          let cmdText = trimmedText;
          // If no address provided, auto-use the user's bot wallet
          const explicitAddr = trimmedText.replace(/^\/mycontracts\s*/i, "").trim();
          if (!explicitAddr && isWalletEnabled()) {
            const wallet = await getWallet(store, fromId);
            if (wallet) {
              cmdText = `/mycontracts ${wallet.address}`;
            }
          }
          const reply = await handleMyContractsCommand(cmdText);
          await telegramSendMessage({ token, chatId, reply });
        } catch (e) { console.error("[dealCopilot] /mycontracts failed", e); }
      });
      return NextResponse.json({ ok: true });
    }

    /* ── Deal-drafting conversation (engine) ── */
    const existing = await store.getJSON<DealCopilotState>(key);
    const state = existing ?? null;

    // Handle awaiting_submit_uri stage
    if (state?.stage === "awaiting_submit_uri" && state.draft.pendingSubmitContract && state.draft.pendingSubmitMilestone != null) {
      const contractAddr = state.draft.pendingSubmitContract;
      const milestoneIdx = state.draft.pendingSubmitMilestone;
      const uri = trimmedText;

      // Clear pending state
      const draft = { ...state.draft, pendingSubmitContract: undefined, pendingSubmitMilestone: undefined, updatedAt: Date.now() };
      await store.setJSON(key, { stage: "review" as const, draft }, getDealTtlSeconds());

      // Execute submit
      const wallet = await getWallet(store, fromId);
      if (!wallet) {
        await telegramSendMessage({ token, chatId, reply: { text: "No wallet. Send `/wallet` first.", parseMode: "Markdown" } });
        return NextResponse.json({ ok: true });
      }
      const pk = getPrivateKey(wallet, fromId);
      await telegramSendMessage({ token, chatId, reply: { text: `⏳ Submitting milestone ${milestoneIdx + 1}...` } });
      const result = await submitMilestone(pk, contractAddr, milestoneIdx, uri);
      if (result.success) {
        const buttons = result.explorerUrl ? [[{ text: "🔗 View Transaction", url: result.explorerUrl }]] : [];
        await telegramSendMessage({
          token,
          chatId,
          reply: { text: `✅ **Milestone ${milestoneIdx + 1} Submitted!**\n\n📎 ${escapeMarkdown(uri)}\n🔗 Tx: \`${result.hash?.slice(0, 14)}…\``, buttons, parseMode: "Markdown" },
        });
      } else {
        await telegramSendMessage({ token, chatId, reply: { text: `❌ **Submit failed**\n\n${result.error}`, parseMode: "Markdown" } });
      }
      return NextResponse.json({ ok: true });
    }

    // Start deal implicitly
    const normalized = trimmedText.toLowerCase();
    const effectiveState = !state && (normalized === "start" || normalized === "startdeal")
      ? initialState(chatId)
      : state;

    const { nextState, reply, isAsync } = handleMessage(effectiveState, chatId, fromId, trimmedText);

    // Handle /create → deploy on-chain (engine returns isAsync for /create too now)
    if (lowerText === "/create" && state) {
      await handleCreateContract(store, token, chatId, fromId, key);
      return NextResponse.json({ ok: true });
    }

    // ── AI Agent fallthrough ──
    // If no active deal-drafting state, not a slash command, and the engine
    // returned the default "I don't understand" response, route to AI agent.
    const isSlashCommand = trimmedText.startsWith("/");
    const isActiveConversation = state && state.stage !== "idle" && state.stage.startsWith("collect_");
    const isDealStart = normalized === "start" || normalized === "startdeal" || normalized === "/startdeal";

    if (normalized === "debug agent") {
      const dbg = `**Debug Agent**\n\n- GroqKey length: ${process.env.GROQ_API_KEY?.length || 0}\n- isSlashCmd: ${isSlashCommand}\n- isActiveConv: ${isActiveConversation}\n- State: ${state ? state.stage : 'null'}\n- isDealStart: ${isDealStart}\n- isAgentEnabled(): ${isAgentEnabled()}`;
      await telegramSendMessage({ token, chatId, reply: { text: dbg, parseMode: "Markdown" } });
      return NextResponse.json({ ok: true });
    }

    // User explicitly invoking a custom agent
    const agentMatch = trimmedText.match(/^\/agent\s+(\d+)\s+(.*)/i);
    if (agentMatch && isWorkerEnabled()) {
      try {
        const agentId = agentMatch[1];
        const taskText = agentMatch[2];
        const meta = await store.getJSON<any>(`agent_meta:${agentId}`);
        if (!meta) {
          await telegramSendMessage({ token, chatId, reply: { text: `❌ **Agent ${agentId} not found**`, parseMode: "Markdown" } });
          return NextResponse.json({ ok: true });
        }

        await telegramSendMessage({ token, chatId, reply: { text: `🤖 **Dispatching to ${meta.name || "Custom Agent"}**...\n\n_Agent is booting up its skills to process your task._`, parseMode: "Markdown" } });
        const workerResponse = await dispatchToWorker(taskText, chatId, fromId, store, agentId);
        await telegramSendMessage({ token, chatId, reply: { text: workerResponse } });
      } catch (e) {
        console.error("[dealCopilot] specific agent dispatch failed", e);
      }
      return NextResponse.json({ ok: true });
    }

    if (!isSlashCommand && !isActiveConversation && !isDealStart) {
      // Check if this is a heavy task that should go to the OpenClaw worker
      if (isHeavyTask(trimmedText) && isWorkerEnabled()) {
        try {
          await telegramSendMessage({ token, chatId, reply: { text: "🦞 Dispatching to OpenClaw Worker...\n\n_Your task is being processed by a persistent AI agent with access to Foundry, Slither, and terminal tools._", parseMode: "Markdown" } });
          const workerResponse = await dispatchToWorker(trimmedText, chatId, fromId, store);
          await telegramSendMessage({ token, chatId, reply: { text: workerResponse } });
        } catch (e) {
          console.error("[dealCopilot] OpenClaw dispatch failed, falling back to local agent", e);
          // Fall through to local agent on worker failure
          const apiKey = await resolveApiKey(store, fromId);
          if (apiKey) {
            try {
              const agentResult = await runAgentLoop(store, chatId, fromId, trimmedText, apiKey);
              await telegramSendMessage({ token, chatId, reply: agentResult.reply });
            } catch (innerErr) {
              const msg = innerErr instanceof Error ? innerErr.message : "Unknown error";
              await telegramSendMessage({ token, chatId, reply: { text: `⚠️ AI agent error: ${msg.slice(0, 200)}`, parseMode: "Markdown" } }).catch(() => {});
            }
          }
        }
        return NextResponse.json({ ok: true });
      }

      // Route to local AI agent for light natural language processing
      const apiKey = await resolveApiKey(store, fromId);
      if (!apiKey) {
        await telegramSendMessage({ token, chatId, reply: { text: "🤖 AI agent needs an API key.\n\nRun `/setkey sk-or-v1-...` with a free key from https://openrouter.ai/keys", parseMode: "Markdown" } });
        return NextResponse.json({ ok: true });
      }
      try {
        const agentResult = await runAgentLoop(store, chatId, fromId, trimmedText, apiKey);
        await telegramSendMessage({ token, chatId, reply: agentResult.reply });
      } catch (e) {
        console.error("[dealCopilot] agent failed", e);
        const msg = e instanceof Error ? e.message : "Unknown error";
        await telegramSendMessage({
          token,
          chatId,
          reply: { text: `⚠️ AI agent error: ${msg.slice(0, 200)}\n\nUse \`/help\` for manual commands.`, parseMode: "Markdown" },
        }).catch(() => { });
      }
      return NextResponse.json({ ok: true });
    }

    if (nextState) {
      await store.setJSON(key, nextState, getDealTtlSeconds());
    } else {
      await store.del(key);
    }

    await telegramSendMessage({ token, chatId, reply });
  } catch (e) {
    console.error("[dealCopilot] handler failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
