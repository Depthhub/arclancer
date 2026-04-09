/**
 * ERC-8004 Agent Identity & Reputation + ERC-8183 Agentic Commerce
 * Server-side helpers for Arc Network's AI agent infrastructure.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  parseAbiItem,
  keccak256,
  toHex,
  formatUnits,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

/* ------------------------------------------------------------------ */
/* Chain config (reuse Arc Testnet)                                     */
/* ------------------------------------------------------------------ */

function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() || "https://rpc.testnet.arc.network";
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

function getPublicClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(getRpcUrl()),
  });
}

function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(getRpcUrl()),
  });
}

const EXPLORER = "https://testnet.arcscan.app";

/* ================================================================== */
/* ERC-8004: Agent Identity Registry                                   */
/* ================================================================== */

export const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address;
export const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address;
export const VALIDATION_REGISTRY = "0x8004Cb1BF31DAf7788923b405b754f57acEB4272" as Address;

const IDENTITY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadataURI", type: "string" }],
    outputs: [],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const REPUTATION_ABI = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "score", type: "int128" },
      { name: "feedbackType", type: "uint8" },
      { name: "tag", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "evidenceURI", type: "string" },
      { name: "comment", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

export interface AgentRegistrationResult {
  success: boolean;
  agentId?: string;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

export interface ReputationResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

/**
 * Register an AI agent on-chain with ERC-8004.
 * The metadataURI should point to a JSON file with agent details.
 * For simplicity, we encode the metadata as a data URI.
 */
export async function registerAgentIdentity(
  privateKey: `0x${string}`,
  metadata: {
    name: string;
    description: string;
    agent_type?: string;
    capabilities?: string[];
    version?: string;
  }
): Promise<AgentRegistrationResult> {
  try {
    const wallet = getWalletClient(privateKey);
    const pub = getPublicClient();
    const account = privateKeyToAccount(privateKey);

    // Encode metadata as a data URI (no IPFS dependency)
    const metadataJson = JSON.stringify({
      name: metadata.name,
      description: metadata.description,
      image: "",
      agent_type: metadata.agent_type || "escrow",
      capabilities: metadata.capabilities || ["deal_creation", "escrow_management"],
      version: metadata.version || "1.0.0",
    });
    const metadataURI = `data:application/json;base64,${Buffer.from(metadataJson).toString("base64")}`;

    const hash = await wallet.writeContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: "register",
      args: [metadataURI],
    });

    const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });

    // Extract agent ID from Transfer event
    let agentId: string | undefined;
    const transferLogs = await pub.getLogs({
      address: IDENTITY_REGISTRY,
      event: parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
      ),
      args: { to: account.address },
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    if (transferLogs.length > 0) {
      agentId = transferLogs[transferLogs.length - 1].args.tokenId?.toString();
    }

    return {
      success: true,
      agentId,
      txHash: hash,
      explorerUrl: `${EXPLORER}/tx/${hash}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg.slice(0, 300) };
  }
}

/**
 * Record reputation feedback for an agent via ERC-8004.
 */
export async function recordReputation(
  privateKey: `0x${string}`,
  agentId: string,
  score: number,
  tag: string,
  comment?: string
): Promise<ReputationResult> {
  try {
    const wallet = getWalletClient(privateKey);
    const pub = getPublicClient();

    const feedbackHash = keccak256(toHex(tag));

    const hash = await wallet.writeContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_ABI,
      functionName: "giveFeedback",
      args: [
        BigInt(agentId),
        BigInt(score),
        0,
        tag,
        "",
        "",
        comment || "",
        feedbackHash,
      ],
    });

    await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });

    return {
      success: true,
      txHash: hash,
      explorerUrl: `${EXPLORER}/tx/${hash}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg.slice(0, 300) };
  }
}

/**
 * Look up an agent's identity and basic info.
 */
export async function lookupAgentIdentity(agentIdOrAddress: string): Promise<{
  found: boolean;
  agentId?: string;
  owner?: string;
  metadataURI?: string;
  error?: string;
}> {
  try {
    const pub = getPublicClient();

    // If it looks like an address, search for Transfer events
    if (/^0x[a-fA-F0-9]{40}$/.test(agentIdOrAddress)) {
      const latestBlock = await pub.getBlockNumber();
      // Reduce the block scan range to avoid HTTP 413 Payload Too Large from public RPC
      const fromBlock = latestBlock > BigInt(4999) ? latestBlock - BigInt(4999) : BigInt(0);
      try {
        const logs = await pub.getLogs({
          address: IDENTITY_REGISTRY,
          event: parseAbiItem(
            "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
          ),
          args: { to: agentIdOrAddress as Address },
          fromBlock,
          toBlock: latestBlock,
        });
        if (logs.length === 0) return { found: false, error: "No agent NFTs found for this address in recent blocks. Please use the exact Agent Token ID." };
        
        const tokenId = logs[logs.length - 1].args.tokenId!;
        const owner = await pub.readContract({
          address: IDENTITY_REGISTRY,
          abi: IDENTITY_ABI,
          functionName: "ownerOf",
          args: [tokenId],
        });
        const uri = await pub.readContract({
          address: IDENTITY_REGISTRY,
          abi: IDENTITY_ABI,
          functionName: "tokenURI",
          args: [tokenId],
        });
        return { found: true, agentId: tokenId.toString(), owner, metadataURI: uri };
      } catch (err) {
        return { found: false, error: "Network error while scanning for agent address. Please provide the exact numbered Agent ID." };
      }
    }

    // Treat as agent ID (number)
    const tokenId = BigInt(agentIdOrAddress);
    const owner = await pub.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: "ownerOf",
      args: [tokenId],
    });
    const uri = await pub.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: "tokenURI",
      args: [tokenId],
    });
    return { found: true, agentId: agentIdOrAddress, owner, metadataURI: uri };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { found: false, error: msg.slice(0, 200) };
  }
}

/* ================================================================== */
/* ERC-8183: Agentic Commerce                                          */
/* ================================================================== */

export const AGENTIC_COMMERCE_CONTRACT = "0x0747EEf0706327138c69792bF28Cd525089e4583" as Address;
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as Address;

const AGENTIC_COMMERCE_ABI = [
  {
    name: "createJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    name: "setBudget",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "fund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "submit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliverable", type: "bytes32" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "complete",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "reason", type: "bytes32" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "getJob",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "client", type: "address" },
          { name: "provider", type: "address" },
          { name: "evaluator", type: "address" },
          { name: "description", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "expiredAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "hook", type: "address" },
        ],
      },
    ],
  },
  {
    name: "JobCreated",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: true, name: "provider", type: "address" },
      { indexed: false, name: "evaluator", type: "address" },
      { indexed: false, name: "expiredAt", type: "uint256" },
      { indexed: false, name: "hook", type: "address" },
    ],
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const JOB_STATUS_NAMES = ["Open", "Funded", "Submitted", "Completed", "Rejected", "Expired"];

export interface JobResult {
  success: boolean;
  jobId?: string;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

export interface JobInfo {
  id: string;
  client: string;
  provider: string;
  evaluator: string;
  description: string;
  budget: string;
  expiredAt: string;
  status: string;
  statusLabel: string;
  hook: string;
}

/**
 * Create an ERC-8183 agentic commerce job.
 */
export async function createAgenticJob(
  privateKey: `0x${string}`,
  params: {
    providerAddress: string;
    description: string;
    budgetUsdc: number;
    expiryHours?: number;
  }
): Promise<JobResult> {
  try {
    const wallet = getWalletClient(privateKey);
    const pub = getPublicClient();
    const account = privateKeyToAccount(privateKey);

    // Calculate expiry
    const block = await pub.getBlock();
    const expirySeconds = (params.expiryHours || 24) * 3600;
    const expiredAt = block.timestamp + BigInt(expirySeconds);
    const budgetMicro = BigInt(Math.floor(params.budgetUsdc * 1e6));

    // Create job (evaluator = client = self)
    const createHash = await wallet.writeContract({
      address: AGENTIC_COMMERCE_CONTRACT,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: "createJob",
      args: [
        params.providerAddress as Address,
        account.address, // evaluator = client
        expiredAt,
        params.description,
        "0x0000000000000000000000000000000000000000" as Address, // no hook
      ],
    });

    const createReceipt = await pub.waitForTransactionReceipt({ hash: createHash, timeout: 60_000 });

    // Extract job ID from event
    let jobId: string | undefined;
    for (const log of createReceipt.logs) {
      try {
        const decoded = pub.chain
          ? undefined // Skip if we can't decode — fallback below
          : undefined;
        // Use topics directly
        if (log.topics[0] && log.address.toLowerCase() === AGENTIC_COMMERCE_CONTRACT.toLowerCase()) {
          // JobCreated event — jobId is first indexed param
          if (log.topics[1]) {
            jobId = BigInt(log.topics[1]).toString();
            break;
          }
        }
      } catch {
        continue;
      }
    }

    return {
      success: true,
      jobId,
      txHash: createHash,
      explorerUrl: `${EXPLORER}/tx/${createHash}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg.slice(0, 300) };
  }
}

/**
 * Fund an ERC-8183 job (approve USDC + fund escrow).
 */
export async function fundAgenticJob(
  privateKey: `0x${string}`,
  jobId: string,
  budgetUsdc: number
): Promise<JobResult> {
  try {
    const wallet = getWalletClient(privateKey);
    const pub = getPublicClient();
    const budgetMicro = BigInt(Math.floor(budgetUsdc * 1e6));

    // Approve USDC
    await wallet.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [AGENTIC_COMMERCE_CONTRACT, budgetMicro],
    });

    // Set budget (provider does this normally, but for our bot we handle both sides)
    // Fund escrow
    const fundHash = await wallet.writeContract({
      address: AGENTIC_COMMERCE_CONTRACT,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: "fund",
      args: [BigInt(jobId), "0x" as `0x${string}`],
    });

    await pub.waitForTransactionReceipt({ hash: fundHash, timeout: 60_000 });

    return {
      success: true,
      jobId,
      txHash: fundHash,
      explorerUrl: `${EXPLORER}/tx/${fundHash}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg.slice(0, 300) };
  }
}

/**
 * Submit a deliverable for an ERC-8183 job.
 */
export async function submitAgenticDeliverable(
  privateKey: `0x${string}`,
  jobId: string,
  deliverableContent: string
): Promise<JobResult> {
  try {
    const wallet = getWalletClient(privateKey);
    const pub = getPublicClient();

    const deliverableHash = keccak256(toHex(deliverableContent));

    const hash = await wallet.writeContract({
      address: AGENTIC_COMMERCE_CONTRACT,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: "submit",
      args: [BigInt(jobId), deliverableHash, "0x" as `0x${string}`],
    });

    await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });

    return {
      success: true,
      jobId,
      txHash: hash,
      explorerUrl: `${EXPLORER}/tx/${hash}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg.slice(0, 300) };
  }
}

/**
 * Complete an ERC-8183 job (evaluator approves).
 */
export async function completeAgenticJob(
  privateKey: `0x${string}`,
  jobId: string,
  reason?: string
): Promise<JobResult> {
  try {
    const wallet = getWalletClient(privateKey);
    const pub = getPublicClient();

    const reasonHash = keccak256(toHex(reason || "work-approved"));

    const hash = await wallet.writeContract({
      address: AGENTIC_COMMERCE_CONTRACT,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: "complete",
      args: [BigInt(jobId), reasonHash, "0x" as `0x${string}`],
    });

    await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });

    return {
      success: true,
      jobId,
      txHash: hash,
      explorerUrl: `${EXPLORER}/tx/${hash}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg.slice(0, 300) };
  }
}

/**
 * Get ERC-8183 job details.
 */
export async function getAgenticJobInfo(jobId: string): Promise<{
  found: boolean;
  job?: JobInfo;
  error?: string;
}> {
  try {
    const pub = getPublicClient();

    const job = await pub.readContract({
      address: AGENTIC_COMMERCE_CONTRACT,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: "getJob",
      args: [BigInt(jobId)],
    }) as {
      id: bigint;
      client: string;
      provider: string;
      evaluator: string;
      description: string;
      budget: bigint;
      expiredAt: bigint;
      status: number;
      hook: string;
    };

    return {
      found: true,
      job: {
        id: job.id.toString(),
        client: job.client,
        provider: job.provider,
        evaluator: job.evaluator,
        description: job.description,
        budget: formatUnits(job.budget, 6),
        expiredAt: new Date(Number(job.expiredAt) * 1000).toISOString(),
        status: job.status.toString(),
        statusLabel: JOB_STATUS_NAMES[job.status] ?? `Unknown(${job.status})`,
        hook: job.hook,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { found: false, error: msg.slice(0, 200) };
  }
}
