/**
 * Server-side transaction executor for ArcLancer escrow contracts.
 * Uses viem wallet client to sign and send transactions on behalf of bot users.
 */
import {
    createWalletClient,
    createPublicClient,
    http,
    type Address,
    type Hash,
    decodeEventLog,
    defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACTS, FACTORY_ABI, ESCROW_ABI, ERC20_ABI, REGISTRY_ABI } from "@/lib/contracts";
import type { DealDraft } from "@/lib/dealCopilot/types";

/* ------------------------------------------------------------------ */
/* Chain config                                                        */
/* ------------------------------------------------------------------ */

function getRpcUrl(): string {
    return (
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() ||
        "https://rpc.testnet.arc.network"
    );
}

const arcTestnet = defineChain({
    id: 5042002,
    name: "Arc Testnet",
    nativeCurrency: { decimals: 18, name: "USDC", symbol: "USDC" },
    rpcUrls: {
        default: {
            http: [getRpcUrl()],
        },
    },
    testnet: true,
});

function getWalletClient(privateKey: `0x${string}`) {
    const account = privateKeyToAccount(privateKey);
    return createWalletClient({
        account,
        chain: arcTestnet,
        transport: http(getRpcUrl()),
    });
}

function getPublicClient() {
    return createPublicClient({
        chain: arcTestnet,
        transport: http(getRpcUrl()),
    });
}

const EXPLORER_BASE = "https://testnet.arcscan.app";

/* ------------------------------------------------------------------ */
/* Result type                                                         */
/* ------------------------------------------------------------------ */

export interface TxResult {
    success: boolean;
    hash?: string;
    contractAddress?: string;
    explorerUrl?: string;
    error?: string;
}

function explorerTxUrl(hash: string): string {
    return `${EXPLORER_BASE}/tx/${hash}`;
}

/* ------------------------------------------------------------------ */
/* Balance & Allowance                                                 */
/* ------------------------------------------------------------------ */

export async function checkBalance(address: string): Promise<number> {
    const client = getPublicClient();
    try {
        const balance = await client.readContract({
            address: CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Address],
        });
        return Number(balance) / 1e6;
    } catch {
        // On Arc, USDC might be native. Try getBalance as fallback.
        try {
            const nativeBal = await client.getBalance({ address: address as Address });
            return Number(nativeBal) / 1e6;
        } catch {
            return 0;
        }
    }
}

async function checkAllowance(owner: string, spender: string): Promise<number> {
    const client = getPublicClient();
    try {
        const allowance = await client.readContract({
            address: CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [owner as Address, spender as Address],
        });
        return Number(allowance) / 1e6;
    } catch {
        return 0;
    }
}

async function approveUSDC(
    privateKey: `0x${string}`,
    spender: string,
    amountDollars: number
): Promise<Hash> {
    const wallet = getWalletClient(privateKey);
    const pub = getPublicClient();
    // Approve 10% extra to avoid rounding issues
    const amount = BigInt(Math.ceil(amountDollars * 1.1 * 1e6));

    const hash = await wallet.writeContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender as Address, amount],
    });

    await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
    return hash;
}

/* ------------------------------------------------------------------ */
/* Direct Transfers                                                    */
/* ------------------------------------------------------------------ */

export async function executeUsdcTransfer(
    privateKey: `0x${string}`,
    to: string,
    amountUsdc: number
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const publicClient = getPublicClient();
        const amount = BigInt(Math.floor(amountUsdc * 1e6));

        const { request } = await publicClient.simulateContract({
            account: wallet.account,
            address: CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [to as Address, amount],
        });

        const hash = await wallet.writeContract(request);
        return {
            success: true,
            hash,
            explorerUrl: explorerTxUrl(hash),
        };
    } catch (e) {
        console.error("executeUsdcTransfer error:", e);
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
}

/* ------------------------------------------------------------------ */
/* Create Escrow Contract                                              */
/* ------------------------------------------------------------------ */

export async function createEscrowContract(
    privateKey: `0x${string}`,
    draft: DealDraft
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();
        const account = privateKeyToAccount(privateKey);

        // Calculate fee (2%)
        const fee = draft.totalAmount * 0.02;

        // Check balance
        const balance = await checkBalance(account.address);
        if (balance < fee) {
            return {
                success: false,
                error: `Insufficient USDC for fee. Need $${fee.toFixed(2)}, have $${balance.toFixed(2)}. Send USDC to your bot wallet first.`,
            };
        }

        // Approve factory for fee
        const allowance = await checkAllowance(account.address, CONTRACTS.FACTORY);
        if (allowance < fee) {
            await approveUSDC(privateKey, CONTRACTS.FACTORY, fee);
        }

        // Payout currency address
        const payoutCurrencyAddr =
            draft.payoutCurrency === "EURC" ? CONTRACTS.EURC : CONTRACTS.USDC;

        // Prepare milestones (convert dollars → micro-units)
        const milestones = draft.milestones.map((m) => ({
            amount: BigInt(Math.floor(m.amount * 1e6)),
            description: m.description,
        }));

        // Create contract
        const hash = await wallet.writeContract({
            address: CONTRACTS.FACTORY,
            abi: FACTORY_ABI,
            functionName: "createEscrowContract",
            args: [
                draft.freelancerAddress as Address,
                BigInt(Math.floor(draft.totalAmount * 1e6)),
                payoutCurrencyAddr,
                milestones,
            ],
        });

        const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        if (receipt.status !== "success") {
            throw new Error("Transaction reverted on the blockchain.");
        }

        // Extract created contract address from ContractCreated event
        let contractAddress: string | undefined;
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: FACTORY_ABI,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ContractCreated") {
                    // contractAddress is the first indexed param
                    contractAddress = (decoded.args as { contractAddress?: string })?.contractAddress;
                    break;
                }
            } catch {
                // Not this event, skip
            }
        }

        // Fallback: extract from first topic if event decoding failed
        if (!contractAddress && receipt.logs.length > 0) {
            const firstLog = receipt.logs[0];
            if (firstLog.topics[1]) {
                contractAddress = `0x${firstLog.topics[1].slice(26)}`;
            }
        }

        return {
            success: true,
            hash,
            contractAddress,
            explorerUrl: explorerTxUrl(hash),
        };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        // Shorten error for Telegram
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}

/* ------------------------------------------------------------------ */
/* Fund Contract                                                       */
/* ------------------------------------------------------------------ */

export async function fundContract(
    privateKey: `0x${string}`,
    contractAddress: string
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();
        const account = privateKeyToAccount(privateKey);

        // Read total amount from contract
        const totalAmount = await pub.readContract({
            address: contractAddress as Address,
            abi: ESCROW_ABI,
            functionName: "totalAmount",
        });
        const amountDollars = Number(totalAmount) / 1e6;

        // Check balance
        const balance = await checkBalance(account.address);
        if (balance < amountDollars) {
            return {
                success: false,
                error: `Insufficient USDC. Need $${amountDollars.toFixed(2)} to fund, have $${balance.toFixed(2)}.`,
            };
        }

        // Approve contract to spend USDC
        const allowance = await checkAllowance(account.address, contractAddress);
        if (allowance < amountDollars) {
            await approveUSDC(privateKey, contractAddress, amountDollars);
        }

        // Fund
        const hash = await wallet.writeContract({
            address: contractAddress as Address,
            abi: ESCROW_ABI,
            functionName: "fundContract",
        });

        await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        return { success: true, hash, explorerUrl: explorerTxUrl(hash) };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}

/* ------------------------------------------------------------------ */
/* Submit Milestone                                                    */
/* ------------------------------------------------------------------ */

export async function submitMilestone(
    privateKey: `0x${string}`,
    contractAddress: string,
    milestoneIndex: number,
    deliverableURI: string
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();

        const hash = await wallet.writeContract({
            address: contractAddress as Address,
            abi: ESCROW_ABI,
            functionName: "submitMilestone",
            args: [BigInt(milestoneIndex), deliverableURI],
        });

        await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        return { success: true, hash, explorerUrl: explorerTxUrl(hash) };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}

/* ------------------------------------------------------------------ */
/* Approve Milestone                                                   */
/* ------------------------------------------------------------------ */

export async function approveMilestone(
    privateKey: `0x${string}`,
    contractAddress: string,
    milestoneIndex: number
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();

        const hash = await wallet.writeContract({
            address: contractAddress as Address,
            abi: ESCROW_ABI,
            functionName: "approveMilestone",
            args: [BigInt(milestoneIndex)],
        });

        await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        return { success: true, hash, explorerUrl: explorerTxUrl(hash) };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}

/* ------------------------------------------------------------------ */
/* Release Milestone Payment                                           */
/* ------------------------------------------------------------------ */

export async function releaseMilestonePayment(
    privateKey: `0x${string}`,
    contractAddress: string,
    milestoneIndex: number
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();

        const hash = await wallet.writeContract({
            address: contractAddress as Address,
            abi: ESCROW_ABI,
            functionName: "releaseMilestonePayment",
            args: [BigInt(milestoneIndex)],
        });

        await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        return { success: true, hash, explorerUrl: explorerTxUrl(hash) };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}

/* ------------------------------------------------------------------ */
/* Initiate Dispute                                                    */
/* ------------------------------------------------------------------ */

export async function initiateDispute(
    privateKey: `0x${string}`,
    contractAddress: string
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();

        const hash = await wallet.writeContract({
            address: contractAddress as Address,
            abi: ESCROW_ABI,
            functionName: "initiateDispute",
        });

        await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        return { success: true, hash, explorerUrl: explorerTxUrl(hash) };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}

/* ------------------------------------------------------------------ */
/* Cancel Contract                                                     */
/* ------------------------------------------------------------------ */

export async function cancelContract(
    privateKey: `0x${string}`,
    contractAddress: string
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();

        const hash = await wallet.writeContract({
            address: contractAddress as Address,
            abi: ESCROW_ABI,
            functionName: "cancelContract",
        });

        await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        return { success: true, hash, explorerUrl: explorerTxUrl(hash) };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}

/* ------------------------------------------------------------------ */
/* Register Agent                                                      */
/* ------------------------------------------------------------------ */

export async function deployAgent(
    privateKey: `0x${string}`,
    name: string,
    skill: string,
    toolName: string,
    taskFeeDollars: number
): Promise<TxResult> {
    try {
        const wallet = getWalletClient(privateKey);
        const pub = getPublicClient();

        const taskFee = BigInt(Math.floor(taskFeeDollars * 1e6));

        const hash = await wallet.writeContract({
            address: CONTRACTS.REGISTRY,
            abi: REGISTRY_ABI,
            functionName: "registerAgent",
            args: [
                name,
                skill,
                toolName,
                taskFee,
            ],
        });

        const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
        if (receipt.status !== "success") {
            throw new Error("Transaction reverted on the blockchain. Check ArcScan for details.");
        }
        
        let agentId: string | undefined;
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: REGISTRY_ABI,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "AgentRegistered") {
                    agentId = (decoded.args as { agentId: bigint }).agentId.toString();
                    break;
                }
            } catch {
                // Not this event
            }
        }

        return { success: true, hash, contractAddress: agentId, explorerUrl: explorerTxUrl(hash) };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        const short = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
        return { success: false, error: short };
    }
}
