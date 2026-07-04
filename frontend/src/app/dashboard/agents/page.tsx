'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MyAgentsTable } from '@/components/agents/MyAgentsTable';
import { useMyAgents } from '@/hooks/useMyAgents';
import { isAgentsUiEnabled } from '@/lib/agents/featureFlag';
import { ArrowLeft, Bot, Plus, RefreshCw } from 'lucide-react';

export default function DashboardAgentsPage() {
    const { isConnected } = useAccount();
    const { data: agents, isLoading, refetch } = useMyAgents();

    if (!isAgentsUiEnabled()) {
        return <div className="p-8 text-center text-neutral-500">Agent marketplace is not enabled.</div>;
    }

    if (!isConnected) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-neutral-50">
                <Card className="max-w-md text-center p-8">
                    <Bot className="w-12 h-12 text-violet-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
                    <p className="text-neutral-500 mb-6">View agents you created on Arc.</p>
                    <ConnectButton />
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 bg-neutral-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-neutral-100">
                            <ArrowLeft className="w-5 h-5 text-neutral-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">Agents I Created</h1>
                            <p className="text-neutral-500">Manage your registered AI agents</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
                            Refresh
                        </Button>
                        <Link href="/agents/create">
                            <Button leftIcon={<Plus className="w-4 h-4" />}>Create Agent</Button>
                        </Link>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-24 bg-neutral-200 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <MyAgentsTable agents={agents ?? []} onUpdated={() => refetch()} />
                )}
            </div>
        </div>
    );
}
