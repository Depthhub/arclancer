'use client';

import Link from 'next/link';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Button } from '@/components/ui/Button';
import { AgentList } from '@/components/agents/AgentList';
import { useAgents } from '@/hooks/useAgents';
import { isAgentsUiEnabled } from '@/lib/agents/featureFlag';
import { Bot, Plus, RefreshCw } from 'lucide-react';

export default function AgentsMarketplacePage() {
    const { data: agents, isLoading, refetch } = useAgents({ active: false });

    if (!isAgentsUiEnabled()) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-neutral-500">Agent marketplace is not enabled.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 bg-neutral-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-violet-50">
                                <Bot className="w-7 h-7 text-violet-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-neutral-900">Agent Marketplace</h1>
                        </div>
                        <p className="text-neutral-500">
                            Browse and hire AI agents registered on Arc Testnet
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ConnectWalletButton />
                        <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
                            Refresh
                        </Button>
                        <Link href="/agents/create">
                            <Button leftIcon={<Plus className="w-4 h-4" />}>Create Agent</Button>
                        </Link>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-neutral-200 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <AgentList
                        agents={agents ?? []}
                        emptyMessage="No agents registered yet. Be the first to create one."
                    />
                )}
            </div>
        </div>
    );
}
