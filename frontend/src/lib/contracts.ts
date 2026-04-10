// Contract Addresses
// Arc Testnet official addresses: https://docs.arc.network/arc/references/contract-addresses
export const CONTRACTS = {
    FACTORY: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS?.trim() || '0x9b48008e55232E9b61886417b79a881f0A71568F') as `0x${string}`,
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS?.trim() || '0x3600000000000000000000000000000000000000') as `0x${string}`,
    EURC: (process.env.NEXT_PUBLIC_EURC_ADDRESS?.trim() || '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a') as `0x${string}`,
    STABLEFX: (process.env.NEXT_PUBLIC_STABLEFX_ADDRESS?.trim() || '0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1') as `0x${string}`,
    REGISTRY: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS?.trim().toLowerCase() || '0x28c87a31a6e608dbf90839d10567ed44e7e3bbd1') as `0x${string}`,
} as const;

// AgentRegistry ABI
export const REGISTRY_ABI = [
    {
        type: 'function',
        name: 'registerAgent',
        inputs: [
            { name: 'name', type: 'string' },
            { name: 'skill', type: 'string' },
            { name: 'toolName', type: 'string' },
            { name: 'taskFee', type: 'uint256' },
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'ownerOf',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: 'owner', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'agents',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [
            { name: 'name', type: 'string' },
            { name: 'skill', type: 'string' },
            { name: 'toolName', type: 'string' },
            { name: 'taskFee', type: 'uint256' },
            { name: 'isActive', type: 'bool' }
        ],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'AgentRegistered',
        inputs: [
            { name: 'agentId', type: 'uint256', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
            { name: 'name', type: 'string', indexed: false },
            { name: 'skill', type: 'string', indexed: false },
            { name: 'taskFee', type: 'uint256', indexed: false },
        ],
    },
] as const;

// EscrowFactory ABI
export const FACTORY_ABI = [
    {
        type: 'constructor',
        inputs: [
            { name: '_usdcToken', type: 'address' },
            { name: '_stableFX', type: 'address' },
            { name: '_feeCollector', type: 'address' },
            { name: '_initialOwner', type: 'address' },
        ],
    },
    {
        type: 'function',
        name: 'createEscrowContract',
        inputs: [
            { name: 'freelancer', type: 'address' },
            { name: 'totalAmount', type: 'uint256' },
            { name: 'payoutCurrency', type: 'address' },
            {
                name: 'milestones',
                type: 'tuple[]',
                components: [
                    { name: 'amount', type: 'uint256' },
                    { name: 'description', type: 'string' },
                ],
            },
        ],
        outputs: [{ type: 'address' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getUserContracts',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ type: 'address[]' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'platformFeePercentage',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'calculateFee',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [
            { name: 'fee', type: 'uint256' },
            { name: 'netAmount', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'contractCount',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'ContractCreated',
        inputs: [
            { name: 'contractAddress', type: 'address', indexed: true },
            { name: 'client', type: 'address', indexed: true },
            { name: 'freelancer', type: 'address', indexed: true },
            { name: 'totalAmount', type: 'uint256', indexed: false },
            { name: 'feeAmount', type: 'uint256', indexed: false },
            { name: 'milestoneCount', type: 'uint256', indexed: false },
        ],
    },
] as const;

// EscrowContract ABI
export const ESCROW_ABI = [
    {
        type: 'function',
        name: 'client',
        inputs: [],
        outputs: [{ type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'freelancer',
        inputs: [],
        outputs: [{ type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'totalAmount',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'totalPaid',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'funded',
        inputs: [],
        outputs: [{ type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getContractDetails',
        inputs: [],
        outputs: [
            { name: '_client', type: 'address' },
            { name: '_freelancer', type: 'address' },
            { name: '_totalAmount', type: 'uint256' },
            { name: '_totalPaid', type: 'uint256' },
            { name: '_status', type: 'uint8' },
            { name: '_milestoneCount', type: 'uint256' },
            { name: '_funded', type: 'bool' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'status',
        inputs: [],
        outputs: [{ type: 'uint8' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getMilestoneCount',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getMilestone',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [
            {
                type: 'tuple',
                components: [
                    { name: 'amount', type: 'uint256' },
                    { name: 'description', type: 'string' },
                    { name: 'deliverableURI', type: 'string' },
                    { name: 'submitted', type: 'bool' },
                    { name: 'approved', type: 'bool' },
                    { name: 'paid', type: 'bool' },
                    { name: 'submittedAt', type: 'uint256' },
                    { name: 'approvedAt', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getAllMilestones',
        inputs: [],
        outputs: [
            {
                type: 'tuple[]',
                components: [
                    { name: 'amount', type: 'uint256' },
                    { name: 'description', type: 'string' },
                    { name: 'deliverableURI', type: 'string' },
                    { name: 'submitted', type: 'bool' },
                    { name: 'approved', type: 'bool' },
                    { name: 'paid', type: 'bool' },
                    { name: 'submittedAt', type: 'uint256' },
                    { name: 'approvedAt', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getContractDetails',
        inputs: [],
        outputs: [
            { name: '_client', type: 'address' },
            { name: '_freelancer', type: 'address' },
            { name: '_totalAmount', type: 'uint256' },
            { name: '_totalPaid', type: 'uint256' },
            { name: '_status', type: 'uint8' },
            { name: '_milestoneCount', type: 'uint256' },
            { name: '_funded', type: 'bool' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'canAutoApprove',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [{ type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'fundContract',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'submitMilestone',
        inputs: [
            { name: 'milestoneIndex', type: 'uint256' },
            { name: 'deliverableURI', type: 'string' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'approveMilestone',
        inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'autoApproveMilestone',
        inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'releaseMilestonePayment',
        inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'initiateDispute',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'cancelContract',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'setPayoutCurrency',
        inputs: [{ name: '_newPayoutCurrency', type: 'address' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'event',
        name: 'ContractFunded',
        inputs: [
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'MilestoneSubmitted',
        inputs: [
            { name: 'milestoneIndex', type: 'uint256', indexed: true },
            { name: 'deliverableURI', type: 'string', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'MilestoneApproved',
        inputs: [
            { name: 'milestoneIndex', type: 'uint256', indexed: true },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'PaymentReleased',
        inputs: [
            { name: 'milestoneIndex', type: 'uint256', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'currency', type: 'address', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'function',
        name: 'previewConversion',
        inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
        outputs: [
            { name: 'outputAmount', type: 'uint256' },
            { name: 'rate', type: 'uint256' },
            { name: 'fee', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'payoutCurrency',
        inputs: [],
        outputs: [{ type: 'address' }],
        stateMutability: 'view',
    },
] as const;

// ERC20 ABI (for USDC approval)
export const ERC20_ABI = [
    {
        type: 'function',
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'allowance',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'decimals',
        inputs: [],
        outputs: [{ type: 'uint8' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'transfer',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable',
    },
] as const;

// Supported currencies for StableFX
// Docs: https://docs.arc.network/arc/references/contract-addresses
export const SUPPORTED_CURRENCIES = [
    { code: 'USDC', name: 'US Dollar', flag: '🇺🇸', address: CONTRACTS.USDC },
    { code: 'EURC', name: 'Euro', flag: '🇪🇺', address: CONTRACTS.EURC },
    { code: 'BRLA', name: 'Brazilian Real', flag: '🇧🇷', address: '0x0000000000000000000000000000000000000001' },
    { code: 'MXNB', name: 'Mexican Peso', flag: '🇲🇽', address: '0x0000000000000000000000000000000000000002' },
    { code: 'QCAD', name: 'Canadian Dollar', flag: '🇨🇦', address: '0x0000000000000000000000000000000000000003' },
    { code: 'AUDF', name: 'Australian Dollar', flag: '🇦🇺', address: '0x0000000000000000000000000000000000000004' },
    { code: 'JPYC', name: 'Japanese Yen', flag: '🇯🇵', address: '0x0000000000000000000000000000000000000005' },
    { code: 'KRW1', name: 'Korean Won', flag: '🇰🇷', address: '0x0000000000000000000000000000000000000006' },
    { code: 'PHPC', name: 'Philippine Peso', flag: '🇵🇭', address: '0x0000000000000000000000000000000000000007' },
] as const;
