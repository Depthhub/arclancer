import type { AgentListing, AgentMeta, OnchainAgent } from './types';
import { getAgentMeta } from './metadataStore';

export function mergeAgent(onchain: OnchainAgent, meta: AgentMeta | null): AgentListing {
    return {
        ...onchain,
        taskFeeUsdc: onchain.taskFee,
        systemPrompt: meta?.systemPrompt,
        skills: meta?.skills,
        price: meta?.price ?? onchain.taskFee,
        description: meta?.description,
        creatorWallet: meta?.ownerWallet ?? onchain.ownerAddress,
    };
}

export async function getAgentListing(id: number): Promise<AgentListing | null> {
    const { fetchAgentById } = await import('./registry');
    const onchain = await fetchAgentById(id);
    if (!onchain) return null;
    const meta = await getAgentMeta(id);
    return mergeAgent(onchain, meta);
}

export async function listAgentListings(activeOnly = false): Promise<AgentListing[]> {
    const { fetchRegisteredAgents } = await import('./registry');
    const onchain = await fetchRegisteredAgents();
    const filtered = activeOnly ? onchain.filter((a) => a.isActive) : onchain;

    const listings = await Promise.all(
        filtered.map(async (agent) => {
            const meta = await getAgentMeta(agent.id);
            return mergeAgent(agent, meta);
        })
    );

    return listings;
}
