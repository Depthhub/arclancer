'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AgentListing } from '@/lib/agents/types';
import { AGENTIC_COMMERCE_CONTRACT, AGENTIC_COMMERCE_ABI } from '@/lib/dealCopilot/arcAgent';
import { CONTRACTS, ERC20_ABI } from '@/lib/contracts';
import { parseUSDC } from '@/lib/utils';
import { keccak256, stringToHex } from 'viem';

interface Agent8183JobPanelProps {
    agent: AgentListing;
}

export function Agent8183JobPanel({ agent }: Agent8183JobPanelProps) {
    const { address } = useWallet();
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState(String(agent.taskFeeUsdc || 10));
    const [jobId, setJobId] = useState<string | null>(null);
    const [deliverable, setDeliverable] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { writeContractAsync, data: txHash } = useWriteContract();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

    const { data: jobData } = useReadContract({
        address: AGENTIC_COMMERCE_CONTRACT,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'getJob',
        args: jobId ? [BigInt(jobId)] : undefined,
        query: { enabled: !!jobId },
    });

    const handleCreate = async () => {
        if (!address || !description) return;
        setError(null);
        try {
            const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 86400);
            await writeContractAsync({
                address: AGENTIC_COMMERCE_CONTRACT,
                abi: AGENTIC_COMMERCE_ABI,
                functionName: 'createJob',
                args: [
                    agent.ownerAddress as `0x${string}`,
                    address,
                    expiredAt,
                    description,
                    '0x0000000000000000000000000000000000000000',
                ],
            });
            // Job ID parsed after receipt — user can enter manually or refresh
            setError('Job created — check wallet receipt for job ID, then enter below to fund.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Create failed');
        }
    };

    const handleFund = async () => {
        if (!jobId) return;
        setError(null);
        try {
            const amount = parseUSDC(budget);
            await writeContractAsync({
                address: CONTRACTS.USDC,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [AGENTIC_COMMERCE_CONTRACT, amount],
            });
            await writeContractAsync({
                address: AGENTIC_COMMERCE_CONTRACT,
                abi: AGENTIC_COMMERCE_ABI,
                functionName: 'setBudget',
                args: [BigInt(jobId), amount, '0x'],
            });
            await writeContractAsync({
                address: AGENTIC_COMMERCE_CONTRACT,
                abi: AGENTIC_COMMERCE_ABI,
                functionName: 'fund',
                args: [BigInt(jobId), '0x'],
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Fund failed');
        }
    };

    const handleSubmit = async () => {
        if (!jobId || !deliverable) return;
        try {
            const hash = keccak256(stringToHex(deliverable));
            await writeContractAsync({
                address: AGENTIC_COMMERCE_CONTRACT,
                abi: AGENTIC_COMMERCE_ABI,
                functionName: 'submit',
                args: [BigInt(jobId), hash, '0x'],
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Submit failed');
        }
    };

    const handleComplete = async () => {
        if (!jobId) return;
        try {
            await writeContractAsync({
                address: AGENTIC_COMMERCE_CONTRACT,
                abi: AGENTIC_COMMERCE_ABI,
                functionName: 'complete',
                args: [BigInt(jobId), keccak256(stringToHex('approved')), '0x'],
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Complete failed');
        }
    };

    return (
        <Card variant="default">
            <CardHeader>
                <CardTitle className="text-lg">ERC-8183 Agentic Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-neutral-600">
                    Circle agentic commerce on Arc Testnet. Provider: {agent.ownerAddress.slice(0, 10)}…
                </p>
                <Input label="Job description" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Input label="Budget (USDC)" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
                <Input label="Job ID (after create)" value={jobId ?? ''} onChange={(e) => setJobId(e.target.value || null)} />
                {error && <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">{error}</p>}
                {jobData && (
                    <pre className="text-xs bg-neutral-50 p-3 rounded-lg overflow-auto max-h-32">
                        {JSON.stringify(jobData, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)}
                    </pre>
                )}
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCreate} isLoading={isConfirming} disabled={!address || !description}>
                        1. Create
                    </Button>
                    <Button variant="outline" onClick={handleFund} isLoading={isConfirming} disabled={!jobId}>
                        2. Fund
                    </Button>
                </div>
                <Input label="Deliverable text" value={deliverable} onChange={(e) => setDeliverable(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleSubmit} disabled={!jobId || !deliverable}>
                        3. Submit
                    </Button>
                    <Button variant="outline" onClick={handleComplete} disabled={!jobId}>
                        4. Complete
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
