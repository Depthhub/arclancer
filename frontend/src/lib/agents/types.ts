export type AgentExecutionMode = 'inbox' | 'creator_mcp';

export interface AgentMeta {
    name?: string;
    skill_uri?: string;
    content_hash?: string;
    execution_mode?: AgentExecutionMode;
    mcp_endpoint?: string;
    skills?: string[];
    price?: number;
    description?: string;
    creatorId?: number;
    ownerWallet?: string;
    createdAt?: string;
}

export interface OnchainAgent {
    id: number;
    name: string;
    skill: string;
    toolName: string;
    taskFee: number;
    isActive: boolean;
    ownerAddress: string;
}

export interface AgentListing extends OnchainAgent {
    taskFeeUsdc: number;
    skillUri?: string;
    contentHash?: string;
    executionMode: AgentExecutionMode;
    mcpEndpoint?: string;
    skills?: string[];
    price?: number;
    description?: string;
    creatorWallet?: string;
}

export interface AgentRunRequest {
    taskText: string;
    payerAddress: string;
    paymentTxHash?: string;
    skipPayment?: boolean;
}

export interface AgentRunResponse {
    ok: boolean;
    requiresPayment?: boolean;
    price?: number;
    ownerWallet?: string;
    response?: string;
    taskId?: string;
    routing?: AgentTaskRouting;
    error?: string;
}

export interface AgentTaskRouting {
    executionMode: AgentExecutionMode;
    skillUri?: string;
    contentHash?: string;
    mcpEndpoint?: string;
    message: string;
}

export interface Agent8183JobRequest {
    providerAddress: string;
    description: string;
    budgetUsdc: number;
    expiryHours?: number;
}
