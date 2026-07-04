'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AgentProfileHeader } from '@/components/agents/AgentProfileHeader';
import { AgentTaskChat } from '@/components/agents/AgentTaskChat';
import { Agent8183JobPanel } from '@/components/agents/Agent8183JobPanel';
import { HireAgentModal } from '@/components/agents/HireAgentModal';
import { useAgent } from '@/hooks/useAgent';
import { isAgentsUiEnabled } from '@/lib/agents/featureFlag';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function AgentProfilePage() {
    const params = useParams();
    const id = params.id as string;
    const agentId = Number(id);
    const { address } = useAccount();
    const { data: agent, isLoading, error } = useAgent(agentId);
    const [hireOpen, setHireOpen] = useState(false);
    const [tab, setTab] = useState<'task' | 'jobs'>('task');

    if (!isAgentsUiEnabled()) {
        return <div className="p-8 text-center text-neutral-500">Agent marketplace is not enabled.</div>;
    }

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (error || !agent) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-neutral-600 mb-4">Agent not found</p>
                        <Link href="/agents"><Button variant="outline">Back to marketplace</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isOwner = address?.toLowerCase() === agent.ownerAddress.toLowerCase();

    return (
        <div className="min-h-screen py-8 bg-neutral-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/agents" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Marketplace
                </Link>

                <Card variant="default" className="mb-8">
                    <CardContent className="p-6">
                        <AgentProfileHeader
                            agent={agent}
                            isOwner={isOwner}
                            onHire={() => setHireOpen(true)}
                            onRunTask={() => setTab('task')}
                        />
                    </CardContent>
                </Card>

                {agent.systemPrompt && (
                    <Card variant="default" className="mb-8">
                        <CardContent className="p-6">
                            <h2 className="font-semibold mb-2">Capabilities</h2>
                            <p className="text-sm text-neutral-600 whitespace-pre-wrap line-clamp-6">
                                {agent.systemPrompt}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <div className="flex gap-2 mb-4">
                    <button
                        type="button"
                        onClick={() => setTab('task')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'task' ? 'bg-violet-600 text-white' : 'bg-white border border-neutral-200'}`}
                    >
                        Run Task
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('jobs')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'jobs' ? 'bg-violet-600 text-white' : 'bg-white border border-neutral-200'}`}
                    >
                        ERC-8183 Jobs
                    </button>
                </div>

                {tab === 'task' && <AgentTaskChat agentId={agent.id} agentName={agent.name} />}
                {tab === 'jobs' && <Agent8183JobPanel agent={agent} />}

                <HireAgentModal agent={agent} isOpen={hireOpen} onClose={() => setHireOpen(false)} />
            </div>
        </div>
    );
}
