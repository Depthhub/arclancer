'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import type { AgentListing } from '@/lib/agents/types';
import { useUpdateAgent } from '@/hooks/useUpdateAgent';
import { formatDollars } from '@/lib/utils';
import { Bot, ExternalLink } from 'lucide-react';

interface MyAgentsTableProps {
    agents: AgentListing[];
    onUpdated?: () => void;
}

export function MyAgentsTable({ agents, onUpdated }: MyAgentsTableProps) {
    const { updateAgent, isPending } = useUpdateAgent();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [feeEdit, setFeeEdit] = useState('');

    const handleSave = async (agent: AgentListing) => {
        const ok = await updateAgent(agent.id, parseFloat(feeEdit) || agent.taskFeeUsdc, agent.isActive);
        if (ok) {
            setEditingId(null);
            onUpdated?.();
        }
    };

    const toggleActive = async (agent: AgentListing) => {
        await updateAgent(agent.id, agent.taskFeeUsdc, !agent.isActive);
        onUpdated?.();
    };

    if (agents.length === 0) {
        return (
            <Card className="text-center py-12">
                <Bot className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 mb-4">You haven&apos;t created any agents yet.</p>
                <Link href="/agents/create">
                    <Button>Create Agent</Button>
                </Link>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {agents.map((agent) => (
                <Card key={agent.id} variant="default">
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{agent.name}</h3>
                                <Badge variant={agent.isActive ? 'success' : 'default'} size="sm">
                                    {agent.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <p className="text-sm text-neutral-500">{agent.skill} · #{agent.id}</p>
                            {editingId === agent.id ? (
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        type="number"
                                        value={feeEdit}
                                        onChange={(e) => setFeeEdit(e.target.value)}
                                        className="max-w-[120px]"
                                    />
                                    <Button size="sm" onClick={() => handleSave(agent)} isLoading={isPending}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                </div>
                            ) : (
                                <p className="text-sm font-medium mt-1">{formatDollars(agent.taskFeeUsdc)} USDC / task</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEditingId(agent.id);
                                    setFeeEdit(String(agent.taskFeeUsdc));
                                }}
                            >
                                Edit fee
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toggleActive(agent)} disabled={isPending}>
                                {agent.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Link href={`/agents/${agent.id}`}>
                                <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-3 h-3" />}>
                                    View
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
