'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AgentListing } from '@/lib/agents/types';
import { formatDollars, truncateAddress } from '@/lib/utils';
import { Bot, Briefcase, Play } from 'lucide-react';

interface AgentProfileHeaderProps {
    agent: AgentListing;
    onHire?: () => void;
    onRunTask?: () => void;
    isOwner?: boolean;
}

export function AgentProfileHeader({ agent, onHire, onRunTask, isOwner }: AgentProfileHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="p-4 rounded-2xl bg-violet-50 shrink-0">
                <Bot className="w-12 h-12 text-violet-600" />
            </div>
            <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-neutral-900">{agent.name}</h1>
                    <Badge variant={agent.isActive ? 'success' : 'default'}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="default">#{agent.id}</Badge>
                </div>
                <p className="text-neutral-600 mb-1">
                    <strong>{agent.skill}</strong>
                    {agent.toolName && agent.toolName !== 'None' && ` · Tool: ${agent.toolName}`}
                </p>
                <p className="text-sm text-neutral-500 mb-4">
                    Owner: {truncateAddress(agent.ownerAddress, 6)}
                </p>
                {agent.description && (
                    <p className="text-neutral-700 mb-4">{agent.description}</p>
                )}
                <p className="text-lg font-semibold text-neutral-900 mb-4">
                    {formatDollars(agent.taskFeeUsdc)} USDC per task
                </p>
                <div className="flex flex-wrap gap-3">
                    {onHire && (
                        <Button onClick={onHire} leftIcon={<Briefcase className="w-4 h-4" />}>
                            Hire via Escrow
                        </Button>
                    )}
                    {onRunTask && agent.isActive && (
                        <Button variant="outline" onClick={onRunTask} leftIcon={<Play className="w-4 h-4" />}>
                            Run Task
                        </Button>
                    )}
                    {isOwner && (
                        <Badge variant="default">You own this agent</Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
