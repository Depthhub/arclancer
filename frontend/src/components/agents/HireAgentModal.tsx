'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AgentListing } from '@/lib/agents/types';
import { X } from 'lucide-react';

interface HireAgentModalProps {
    agent: AgentListing;
    isOpen: boolean;
    onClose: () => void;
}

export function HireAgentModal({ agent, isOpen, onClose }: HireAgentModalProps) {
    const router = useRouter();
    const [amount, setAmount] = useState(String(agent.taskFeeUsdc || 10));
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleHire = () => {
        const params = new URLSearchParams({
            freelancer: agent.ownerAddress,
            agentId: String(agent.id),
            agentName: agent.name,
            totalAmount: amount,
            milestone0: description || `Task for ${agent.name}`,
            milestone0Amount: amount,
        });
        router.push(`/create?${params.toString()}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <Card variant="elevated" className="relative w-full max-w-md z-10">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Hire {agent.name}</CardTitle>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-neutral-600">
                        Creates a milestone escrow with the agent owner ({agent.ownerAddress.slice(0, 8)}…) as freelancer.
                    </p>
                    <Input label="Total USDC" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-[0.5px] mb-2">
                            Milestone description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                            placeholder="Describe the task for this agent..."
                        />
                    </div>
                    <Button className="w-full" onClick={handleHire}>Continue to Create Contract</Button>
                </CardContent>
            </Card>
        </div>
    );
}
