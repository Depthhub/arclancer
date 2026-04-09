/**
 * Server-side chain reader for the Telegram Deal Copilot.
 * Uses viem directly (no wagmi hooks — those are client-only).
 */
import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { CONTRACTS, ESCROW_ABI, FACTORY_ABI, REGISTRY_ABI } from "@/lib/contracts";
import { formatDollars } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Chain client (lazy singleton)                                       */
/* ------------------------------------------------------------------ */

const ARC_TESTNET_CHAIN = {
    id: 5042002,
    name: "Arc Testnet",
    nativeCurrency: { decimals: 18, name: "USDC", symbol: "USDC" },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() || "https://rpc.testnet.arc.network"],
        },
    },
    testnet: true,
} as const;

let _client: PublicClient | null = null;
function getClient(): PublicClient {
    if (!_client) {
        _client = createPublicClient({
            chain: ARC_TESTNET_CHAIN as Parameters<typeof createPublicClient>[0]["chain"],
            transport: http(ARC_TESTNET_CHAIN.rpcUrls.default.http[0]),
        });
    }
    return _client;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

const CONTRACT_STATUS_LABELS: Record<number, string> = {
    0: "🟢 Active",
    1: "✅ Completed",
    2: "🔴 Disputed",
    3: "⚪ Cancelled",
};

export interface OnchainContractSummary {
    address: string;
    client: string;
    freelancer: string;
    totalAmount: number;     // dollars
    totalPaid: number;       // dollars
    status: number;
    statusLabel: string;
    milestoneCount: number;
    funded: boolean;
    milestones: OnchainMilestone[];
}

export interface OnchainMilestone {
    index: number;
    amount: number;       // dollars
    description: string;
    deliverableURI: string;
    submitted: boolean;
    approved: boolean;
    paid: boolean;
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

/* ------------------------------------------------------------------ */
/* Public helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fetch full contract details + milestones from on-chain.
 */
export async function fetchContractDetails(contractAddress: string): Promise<OnchainContractSummary> {
    const client = getClient();
    const addr = contractAddress as Address;

    const details = await client.readContract({
        address: addr,
        abi: ESCROW_ABI,
        functionName: "getContractDetails",
    }) as [string, string, bigint, bigint, number, bigint, boolean];

    const [_client, _freelancer, _totalAmount, _totalPaid, _status, _milestoneCount, _funded] = details;

    const milestoneCount = Number(_milestoneCount);
    const milestones: OnchainMilestone[] = [];

    if (milestoneCount > 0) {
        const rawMilestones = await client.readContract({
            address: addr,
            abi: ESCROW_ABI,
            functionName: "getAllMilestones",
        }) as Array<{
            amount: bigint;
            description: string;
            deliverableURI: string;
            submitted: boolean;
            approved: boolean;
            paid: boolean;
            submittedAt: bigint;
            approvedAt: bigint;
        }>;

        for (let i = 0; i < rawMilestones.length; i++) {
            const m = rawMilestones[i];
            milestones.push({
                index: i,
                amount: Number(m.amount) / 1e6,
                description: m.description,
                deliverableURI: m.deliverableURI,
                submitted: m.submitted,
                approved: m.approved,
                paid: m.paid,
            });
        }
    }

    return {
        address: contractAddress,
        client: _client,
        freelancer: _freelancer,
        totalAmount: Number(_totalAmount) / 1e6,
        totalPaid: Number(_totalPaid) / 1e6,
        status: _status,
        statusLabel: CONTRACT_STATUS_LABELS[_status] ?? `Unknown (${_status})`,
        milestoneCount,
        funded: _funded,
        milestones,
    };
}

/**
 * Fetch all contract addresses belonging to a wallet.
 */
export async function fetchUserContracts(walletAddress: string): Promise<string[]> {
    const client = getClient();
    const result = await client.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "getUserContracts",
        args: [walletAddress as Address],
    }) as string[];
    return result;
}

/**
 * Fetch all registered AI agents from the AgentRegistry contract.
 */
export async function fetchRegisteredAgents(): Promise<OnchainAgent[]> {
    const client = getClient();
    const agents: OnchainAgent[] = [];
    
    // We try querying until we hit an empty string for the name
    for (let i = 1; i < 50; i++) { // cap at 50 for safety
        try {
            const data = await client.readContract({
                address: CONTRACTS.REGISTRY as Address,
                abi: REGISTRY_ABI,
                functionName: "agents",
                args: [BigInt(i)],
            }) as [string, string, string, bigint, boolean];
            
            const [name, skill, toolName, taskFee, isActive] = data;
            if (!name) break; // if name is empty, we reached the end
            
            const ownerAddress = await client.readContract({
                address: CONTRACTS.REGISTRY as Address,
                abi: REGISTRY_ABI,
                functionName: "ownerOf",
                args: [BigInt(i)],
            }) as string;
            
            agents.push({
                id: i,
                name,
                skill,
                toolName,
                taskFee: Number(taskFee) / 1e6,
                isActive,
                ownerAddress
            });
        } catch {
            break; // EVM revert or bounds error
        }
    }
    return agents;
}

/* ------------------------------------------------------------------ */
/* Formatters for Telegram messages                                    */
/* ------------------------------------------------------------------ */

function milestoneStatusEmoji(m: OnchainMilestone): string {
    if (m.paid) return "💰";
    if (m.approved) return "✅";
    if (m.submitted) return "📤";
    return "⏳";
}

export function formatContractSummary(c: OnchainContractSummary): string {
    const lines = [
        `📋 **Contract Status**`,
        ``,
        `📍 \`${c.address.slice(0, 8)}…${c.address.slice(-6)}\``,
        `Status: ${c.statusLabel}`,
        `Funded: ${c.funded ? "✅ Yes" : "❌ No"}`,
        ``,
        `👤 Client: \`${c.client.slice(0, 8)}…${c.client.slice(-6)}\``,
        `👷 Freelancer: \`${c.freelancer.slice(0, 8)}…${c.freelancer.slice(-6)}\``,
        ``,
        `💵 Total: ${formatDollars(c.totalAmount)}`,
        `💸 Paid: ${formatDollars(c.totalPaid)}`,
        `📊 Progress: ${formatDollars(c.totalPaid)} / ${formatDollars(c.totalAmount)}`,
        ``,
        `**Milestones** (${c.milestones.length})`,
    ];

    for (const m of c.milestones) {
        const emoji = milestoneStatusEmoji(m);
        const statusTag = m.paid ? "PAID" : m.approved ? "APPROVED" : m.submitted ? "SUBMITTED" : "PENDING";
        lines.push(`${emoji} ${m.index + 1}. ${m.description || "(no description)"} — ${formatDollars(m.amount)} [${statusTag}]`);
    }

    return lines.join("\n");
}

export function formatContractList(walletAddress: string, contracts: string[]): string {
    if (contracts.length === 0) {
        return `No contracts found for \`${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}\`.`;
    }
    const lines = [
        `📂 **Contracts for** \`${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}\``,
        ``,
        `Found **${contracts.length}** contract${contracts.length === 1 ? "" : "s"}:`,
        ``,
    ];
    contracts.forEach((addr, i) => {
        lines.push(`${i + 1}. \`${addr.slice(0, 10)}…${addr.slice(-8)}\``);
    });
    lines.push(``, `Use \`/status 0x…\` to inspect any contract.`);
    return lines.join("\n");
}

/**
 * Build action buttons for a contract based on its state.
 */
export function contractActionButtons(c: OnchainContractSummary): Array<Array<{ text: string; url: string }>> {
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://arclancer.vercel.app";
    const buttons: Array<Array<{ text: string; url: string }>> = [];

    // Always show "View Contract" link
    buttons.push([{ text: "🔗 View Contract", url: `${base}/contract/${c.address}` }]);

    if (!c.funded && c.status === 0) {
        buttons.push([{ text: "💰 Fund Contract", url: `${base}/contract/${c.address}?action=fund` }]);
    }

    // Find next actionable milestone
    const nextSubmittable = c.milestones.find((m) => !m.submitted && !m.paid);
    const nextApprovable = c.milestones.find((m) => m.submitted && !m.approved && !m.paid);

    if (nextSubmittable && c.funded) {
        buttons.push([
            {
                text: `📤 Submit Milestone ${nextSubmittable.index + 1}`,
                url: `${base}/contract/${c.address}?action=submit&milestone=${nextSubmittable.index}`,
            },
        ]);
    }

    if (nextApprovable) {
        buttons.push([
            {
                text: `✅ Approve Milestone ${nextApprovable.index + 1}`,
                url: `${base}/contract/${c.address}?action=approve&milestone=${nextApprovable.index}`,
            },
        ]);
    }

    return buttons;
}
