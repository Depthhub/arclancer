'use client';

import { useQuery } from '@tanstack/react-query';
import type { AgentListing } from '@/lib/agents/types';

async function fetchAgents(params?: { active?: boolean; owner?: string }): Promise<AgentListing[]> {
    const sp = new URLSearchParams();
    if (params?.active) sp.set('active', 'true');
    if (params?.owner) sp.set('owner', params.owner);
    const qs = sp.toString();
    const res = await fetch(`/api/agents${qs ? `?${qs}` : ''}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to load agents');
    return json.agents as AgentListing[];
}

export function useAgents(params?: { active?: boolean; owner?: string }) {
    return useQuery({
        queryKey: ['agents', params?.active, params?.owner],
        queryFn: () => fetchAgents(params),
        staleTime: 30_000,
    });
}
