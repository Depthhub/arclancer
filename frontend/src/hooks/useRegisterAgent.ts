'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';
import { CONTRACTS, REGISTRY_ABI } from '@/lib/contracts';
import { parseUSDC } from '@/lib/utils';
import type { AgentExecutionMode } from '@/lib/agents/types';

export type RegisterAgentStep = 'idle' | 'registering' | 'saving_meta' | 'success' | 'error';

export interface RegisterAgentInput {
    name: string;
    skill: string;
    toolName: string;
    taskFeeUsdc: number;
    skillUri: string;
    contentHash?: string;
    executionMode: AgentExecutionMode;
    mcpEndpoint?: string;
    description?: string;
    skills?: string[];
}

export function useRegisterAgent() {
    const { address, mode, executeContract } = useWallet();
    const [step, setStep] = useState<RegisterAgentStep>('idle');
    const [error, setError] = useState<string | null>(null);
    const [agentId, setAgentId] = useState<number | null>(null);

    const { writeContractAsync, data: txHash } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

    const register = useCallback(
        async (input: RegisterAgentInput) => {
            if (!address) {
                setError('Connect wallet first');
                setStep('error');
                return null;
            }

            setStep('registering');
            setError(null);

            try {
                const taskFee = parseUSDC(String(input.taskFeeUsdc));
                let mintedId: number | null = null;
                if (mode === 'circle' && executeContract) {
                    const beforeResponse = await fetch(`/api/agents?owner=${address}`);
                    const beforeJson = await beforeResponse.json();
                    const existingIds = new Set<number>(
                        ((beforeJson.agents ?? []) as { id: number }[]).map((agent) => agent.id)
                    );

                    await executeContract({
                        contractAddress: CONTRACTS.REGISTRY,
                        abiFunctionSignature: 'registerAgent(string,string,string,uint256)',
                        abiParameters: [
                            input.name,
                            input.skill,
                            input.toolName || 'None',
                            taskFee.toString(),
                        ],
                    });
                    setStep('saving_meta');

                    for (let attempt = 0; attempt < 10 && !mintedId; attempt += 1) {
                        if (attempt > 0) {
                            await new Promise((resolve) => window.setTimeout(resolve, 2000));
                        }
                        const response = await fetch(`/api/agents?owner=${address}`, {
                            cache: 'no-store',
                        });
                        const json = await response.json();
                        const created = ((json.agents ?? []) as { id: number; name?: string }[])
                            .filter((agent) => !existingIds.has(agent.id))
                            .sort((a, b) => b.id - a.id)[0];
                        mintedId = created?.id ?? null;
                    }
                } else {
                    const hash = await writeContractAsync({
                        address: CONTRACTS.REGISTRY,
                        abi: REGISTRY_ABI,
                        functionName: 'registerAgent',
                        args: [input.name, input.skill, input.toolName || 'None', taskFee],
                    });

                    setStep('saving_meta');
                    const { waitForTransactionReceipt } = await import('wagmi/actions');
                    const { wagmiConfig } = await import('@/lib/wagmi');
                    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, timeout: 60_000 });

                    for (const log of receipt.logs) {
                        if (log.topics[1]) {
                            mintedId = Number(BigInt(log.topics[1] as string));
                            break;
                        }
                    }
                }

                if (!mintedId && mode !== 'circle') {
                    // Fallback: scan recent ids
                    const listRes = await fetch(`/api/agents?owner=${address}`);
                    const listJson = await listRes.json();
                    const mine = listJson.agents as { id: number }[];
                    mintedId = mine.sort((a, b) => b.id - a.id)[0]?.id ?? null;
                }

                if (!mintedId) {
                    throw new Error('Could not determine agent ID after mint');
                }

                const metaRes = await fetch(`/api/agents/${mintedId}/meta`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ownerAddress: address,
                        name: input.name,
                        skill_uri: input.skillUri,
                        content_hash: input.contentHash,
                        execution_mode: input.executionMode,
                        mcp_endpoint: input.executionMode === 'creator_mcp' ? input.mcpEndpoint : undefined,
                        description: input.description,
                        skills: input.skills,
                        price: input.taskFeeUsdc,
                        ownerWallet: address,
                        createdAt: new Date().toISOString(),
                    }),
                });
                const metaJson = await metaRes.json();
                if (!metaJson.ok) {
                    throw new Error(metaJson.error || 'Failed to save agent metadata');
                }

                setAgentId(mintedId);
                setStep('success');
                return mintedId;
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Registration failed';
                setError(msg);
                setStep('error');
                return null;
            }
        },
        [address, mode, executeContract, writeContractAsync]
    );

    return {
        register,
        step,
        error,
        agentId,
        isConfirming,
        isConfirmed,
        reset: () => {
            setStep('idle');
            setError(null);
            setAgentId(null);
        },
    };
}
