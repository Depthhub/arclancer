export type DealRole = "client" | "freelancer";

export type DealCopilotStage =
  | "idle"
  | "collect_roles"
  | "collect_payout_currency"
  | "collect_total_amount"
  | "collect_freelancer_address"
  | "collect_milestones_count"
  | "collect_milestone_item"
  | "review"
  | "editing_field"
  | "awaiting_submit_uri"
  | "agent_confirming"
  | "collect_agent_name"
  | "collect_agent_skill"
  | "collect_agent_tool"
  | "collect_agent_tool_key"
  | "collect_agent_system_prompt"
  | "collect_agent_fee"
  | "review_agent";

export type SupportedPayoutCurrency = "USDC" | "EURC";

export interface DealMilestoneDraft {
  amount: number; // dollars (not micro-units)
  description: string;
}

export interface DealDraft {
  id: string;
  chatId: string;
  createdAt: number;
  updatedAt: number;

  clientTelegramId?: number;
  freelancerTelegramId?: number;

  payoutCurrency: SupportedPayoutCurrency;
  totalAmount: number; // dollars (gross)

  freelancerAddress: string;

  milestones: DealMilestoneDraft[];

  // Internal collection helpers
  desiredMilestonesCount?: number;
  collectingMilestoneIndex?: number;

  // Editing helpers
  editingField?: "currency" | "total" | "address" | "milestone";
  editingMilestoneIndex?: number;

  // Contract tracking (after on-chain deployment)
  lastContractAddress?: string;
  pendingSubmitContract?: string;
  pendingSubmitMilestone?: number;

  // Agent pending action (awaiting user confirmation)
  pendingAction?: AgentPendingAction;

  // Agent Registration Draft
  agentRegistration?: AgentRegistrationDraft;
}

export interface AgentRegistrationDraft {
  name?: string;
  skill?: string;
  tool?: string;
  toolApiKey?: string;
  systemPrompt?: string;
  fee?: number;
}

export interface DealCopilotState {
  stage: DealCopilotStage;
  draft: DealDraft;
}

export interface BotButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface BotReply {
  text: string;
  buttons?: BotButton[][];
  parseMode?: "Markdown" | "HTML";
}

/* ------------------------------------------------------------------ */
/* AI Agent types                                                      */
/* ------------------------------------------------------------------ */

export interface AgentToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: AgentToolCall[];
  tool_call_id?: string;
}

export interface AgentConversation {
  messages: AgentMessage[];
  lastUpdated: number;
}

export type AgentPendingActionType =
  | "deploy_contract"
  | "fund_contract"
  | "submit_milestone"
  | "approve_milestone"
  | "release_payment"
  | "initiate_dispute"
  | "cancel_contract"
  | "register_agent"
  | "create_erc8183_job"
  | "fund_erc8183_job"
  | "submit_erc8183_deliverable"
  | "complete_erc8183_job";

export interface AgentPendingAction {
  type: AgentPendingActionType;
  params: Record<string, unknown>;
  description: string; // Human-readable description for confirmation
}
