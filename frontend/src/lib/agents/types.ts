export interface AgentMeta {
    name?: string;
    systemPrompt?: string;
    skills?: string[];
    price?: number;
    description?: string;
    creatorId?: number;
    ownerWallet?: string;
    createdAt?: string;
    toolApiKey?: string;
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
    systemPrompt?: string;
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
    error?: string;
}

export interface Agent8183JobRequest {
    providerAddress: string;
    description: string;
    budgetUsdc: number;
    expiryHours?: number;
}
