'use client';

import { useQuery } from '@tanstack/react-query';
import type { AgentListing } from '@/lib/agents/types';

export function useAgent(agentId: number | string | undefined) {
    return useQuery({
        queryKey: ['agent', agentId],
        queryFn: async (): Promise<AgentListing> => {
            const res = await fetch(`/api/agents/${agentId}`);
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || 'Agent not found');
            return json.agent as AgentListing;
        },
        enabled: agentId !== undefined && agentId !== '',
        staleTime: 30_000,
    });
}
