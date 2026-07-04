'use client';

import type { AgentListing } from '@/lib/agents/types';
import { AgentCard } from './AgentCard';

interface AgentListProps {
    agents: AgentListing[];
    emptyMessage?: string;
}

export function AgentList({ agents, emptyMessage = 'No agents found.' }: AgentListProps) {
    if (agents.length === 0) {
        return (
            <div className="text-center py-12 text-neutral-500">{emptyMessage}</div>
        );
    }

    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
            ))}
        </div>
    );
}
