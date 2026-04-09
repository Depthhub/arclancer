// Contract Types
export interface Milestone {
    amount: bigint;
    description: string;
    deliverableURI: string;
    submitted: boolean;
    approved: boolean;
    paid: boolean;
    submittedAt: bigint;
    approvedAt: bigint;
}

export interface MilestoneInput {
    amount: number;
    description: string;
}

export enum ContractStatus {
    ACTIVE = 0,
    COMPLETED = 1,
    DISPUTED = 2,
    CANCELLED = 3,
}

export interface ContractDetails {
    address: `0x${string}`;
    client: `0x${string}`;
    freelancer: `0x${string}`;
    totalAmount: bigint;
    totalPaid: bigint;
    status: ContractStatus;
    milestoneCount: number;
    funded: boolean;
    milestones?: Milestone[];
}

export interface ContractEvent {
    type: 'CREATED' | 'FUNDED' | 'MILESTONE_SUBMITTED' | 'MILESTONE_APPROVED' | 'PAYMENT_RELEASED' | 'COMPLETED' | 'DISPUTED';
    timestamp: number;
    actor?: string;
    milestoneIndex?: number;
    amount?: number;
}

// Form Types
export interface CreateContractForm {
    freelancerAddress: string;
    totalAmount: number;
    payoutCurrency: string;
    milestones: MilestoneInput[];
}

// UI Types
export type UserRole = 'client' | 'freelancer' | 'viewer';

export interface Currency {
    code: string;
    name: string;
    flag: string;
    address: string;
}

// StableFX Types
export interface FXQuote {
    fromToken: string;
    toToken: string;
    inputAmount: bigint;
    outputAmount: bigint;
    rate: bigint;
    fee: bigint;
    validUntil: bigint;
}

export interface FXRate {
    rate: number;
    outputAmount: number;
    fee: number;
    feePercentage: number;
}
