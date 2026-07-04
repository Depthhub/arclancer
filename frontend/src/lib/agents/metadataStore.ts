import { getJsonStore } from '@/lib/dealCopilot/storage';
import type { AgentMeta } from './types';

const META_TTL = 60 * 60 * 24 * 365;

function metaKey(agentId: number | string): string {
    return `agent_meta:${agentId}`;
}

export async function getAgentMeta(agentId: number | string): Promise<AgentMeta | null> {
    const store = getJsonStore();
    return store.getJSON<AgentMeta>(metaKey(agentId));
}

export async function setAgentMeta(agentId: number | string, meta: AgentMeta): Promise<void> {
    const store = getJsonStore();
    await store.setJSON(metaKey(agentId), meta, META_TTL);
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
