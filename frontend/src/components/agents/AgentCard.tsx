'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AgentListing } from '@/lib/agents/types';
import { formatDollars } from '@/lib/utils';
import { Bot, ArrowRight } from 'lucide-react';

interface AgentCardProps {
    agent: AgentListing;
}

export function AgentCard({ agent }: AgentCardProps) {
    return (
        <Card variant="default" className="h-full hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-violet-50">
                            <Bot className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900">{agent.name}</h3>
                            <p className="text-xs text-neutral-500">Agent #{agent.id}</p>
                        </div>
                    </div>
                    <Badge variant={agent.isActive ? 'success' : 'default'} size="sm">
                        {agent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>

                <p className="text-sm text-neutral-600 mb-1">
                    <span className="font-medium">{agent.skill}</span>
                    {agent.toolName && agent.toolName !== 'None' && (
                        <span className="text-neutral-400"> · {agent.toolName}</span>
                    )}
                </p>
                {agent.description && (
                    <p className="text-sm text-neutral-500 line-clamp-2 mb-4 flex-1">{agent.description}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-neutral-100">
                    <span className="text-sm font-medium text-neutral-900">
                        {formatDollars(agent.taskFeeUsdc)} USDC / task
                    </span>
                    <Link href={`/agents/${agent.id}`}>
                        <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                            View
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
