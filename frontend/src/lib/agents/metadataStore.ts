import { getJsonStore } from '@/lib/dealCopilot/storage';
import type { AgentMeta } from './types';

const META_TTL = 60 * 60 * 24 * 365;

function metaKey(agentId: number | string): string {
    return `agent_meta:${agentId}`;
}

function pointerOnlyMeta(meta: AgentMeta): AgentMeta {
    return {
        name: meta.name,
        skill_uri: meta.skill_uri,
        content_hash: meta.content_hash,
        execution_mode: meta.execution_mode,
        mcp_endpoint: meta.mcp_endpoint,
        skills: meta.skills,
        price: meta.price,
        description: meta.description,
        creatorId: meta.creatorId,
        ownerWallet: meta.ownerWallet,
        createdAt: meta.createdAt,
    };
}

export async function getAgentMeta(agentId: number | string): Promise<AgentMeta | null> {
    const store = getJsonStore();
    const raw = await store.getJSON<AgentMeta & Record<string, unknown>>(metaKey(agentId));
    if (!raw) return null;
    const safe = pointerOnlyMeta(raw);
    if ('systemPrompt' in raw || 'toolApiKey' in raw) {
        await store.setJSON(metaKey(agentId), safe, META_TTL);
    }
    return safe;
}

export async function setAgentMeta(agentId: number | string, meta: AgentMeta): Promise<void> {
    const store = getJsonStore();
    await store.setJSON(metaKey(agentId), pointerOnlyMeta(meta), META_TTL);
}

export async function mergeAgentMeta(
    agentId: number | string,
    patch: Partial<AgentMeta>
): Promise<AgentMeta> {
    const existing = (await getAgentMeta(agentId)) ?? {};
    const merged = { ...existing, ...patch };
    await setAgentMeta(agentId, merged);
    return merged;
}
