import { createPublicClient, http, type Address, type PublicClient } from 'viem';
import { CONTRACTS, REGISTRY_ABI } from '@/lib/contracts';
import type { OnchainAgent } from './types';

const ARC_TESTNET_CHAIN = {
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: { decimals: 18, name: 'USDC', symbol: 'USDC' },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() || 'https://rpc.testnet.arc.network'],
        },
    },
    testnet: true,
} as const;

let _client: PublicClient | null = null;

function getClient(): PublicClient {
    if (!_client) {
        _client = createPublicClient({
            chain: ARC_TESTNET_CHAIN as Parameters<typeof createPublicClient>[0]['chain'],
            transport: http(ARC_TESTNET_CHAIN.rpcUrls.default.http[0]),
        });
    }
    return _client;
}

async function readAgentAtId(client: PublicClient, id: number): Promise<OnchainAgent | null> {
    try {
        const data = await client.readContract({
            address: CONTRACTS.REGISTRY as Address,
            abi: REGISTRY_ABI,
            functionName: 'agents',
            args: [BigInt(id)],
        }) as [string, string, string, bigint, boolean];

        const [name, skill, toolName, taskFee, isActive] = data;
        if (!name) return null;

        const ownerAddress = await client.readContract({
            address: CONTRACTS.REGISTRY as Address,
            abi: REGISTRY_ABI,
            functionName: 'ownerOf',
            args: [BigInt(id)],
        }) as string;

        return {
            id,
            name,
            skill,
            toolName,
            taskFee: Number(taskFee) / 1e6,
            isActive,
            ownerAddress,
        };
    } catch {
        return null;
    }
}

export async function fetchRegisteredAgents(): Promise<OnchainAgent[]> {
    const client = getClient();
    const agents: OnchainAgent[] = [];

    for (let i = 1; i < 100; i++) {
        const agent = await readAgentAtId(client, i);
        if (!agent) break;
        agents.push(agent);
    }

    return agents;
}

export async function fetchAgentById(id: number): Promise<OnchainAgent | null> {
    return readAgentAtId(getClient(), id);
}

export async function fetchAgentsByOwner(ownerAddress: string): Promise<OnchainAgent[]> {
    const all = await fetchRegisteredAgents();
    return all.filter(
        (a) => a.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()
    );
}

export async function verifyAgentOwner(agentId: number, walletAddress: string): Promise<boolean> {
    const agent = await fetchAgentById(agentId);
    if (!agent) return false;
    return agent.ownerAddress.toLowerCase() === walletAddress.toLowerCase();
}
