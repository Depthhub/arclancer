'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';
import { CONTRACTS, ERC20_ABI } from '@/lib/contracts';
import { parseUSDC } from '@/lib/utils';

export interface TaskMessage {
    role: 'user' | 'agent';
    content: string;
}

export function useAgentTask(agentId: number | string) {
    const { address } = useWallet();
    const [messages, setMessages] = useState<TaskMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [paywall, setPaywall] = useState<{ price: number; ownerWallet: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingTask, setPendingTask] = useState<string | null>(null);

    const { writeContractAsync, data: payTxHash } = useWriteContract();
    const { isLoading: isPayConfirming } = useWaitForTransactionReceipt({ hash: payTxHash });

    const runTask = useCallback(
        async (taskText: string, paymentTxHash?: string) => {
            if (!address) {
                setError('Connect wallet first');
                return;
            }
            setIsRunning(true);
            setError(null);
            setMessages((m) => [...m, { role: 'user', content: taskText }]);

            try {
                const res = await fetch(`/api/agents/${agentId}/run`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        taskText,
                        payerAddress: address,
                        paymentTxHash,
                    }),
                });
                const json = await res.json();

                if (res.status === 402 && json.requiresPayment) {
                    setPaywall({ price: json.price, ownerWallet: json.ownerWallet });
                    setPendingTask(taskText);
                    setMessages((m) => m.slice(0, -1));
                    return;
                }

                if (!json.ok) {
                    throw new Error(json.error || 'Task failed');
                }

                setPaywall(null);
                setPendingTask(null);
                setMessages((m) => [...m, { role: 'agent', content: json.response || 'Task queued.' }]);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Task failed');
            } finally {
                setIsRunning(false);
            }
        },
        [address, agentId]
    );

    const payAndRun = useCallback(async () => {
        if (!address || !paywall || !pendingTask) return;
        setError(null);
        try {
            const amount = parseUSDC(String(paywall.price));
            const hash = await writeContractAsync({
                address: CONTRACTS.USDC,
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [paywall.ownerWallet as `0x${string}`, amount],
            });

            const { waitForTransactionReceipt } = await import('wagmi/actions');
            const { wagmiConfig } = await import('@/lib/wagmi');
            await waitForTransactionReceipt(wagmiConfig, { hash, timeout: 60_000 });

            await fetch(`/api/agents/${agentId}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payerAddress: address, paymentTxHash: hash }),
            });

            await runTask(pendingTask, hash);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Payment failed');
        }
    }, [address, paywall, pendingTask, agentId, writeContractAsync, runTask]);

    return {
        messages,
        isRunning,
        paywall,
        error,
        runTask,
        payAndRun,
        isPayConfirming,
        clearPaywall: () => {
            setPaywall(null);
            setPendingTask(null);
        },
    };
}
