'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, REGISTRY_ABI } from '@/lib/contracts';
import { parseUSDC } from '@/lib/utils';

export function useUpdateAgent() {
    const { address } = useAccount();
    const [error, setError] = useState<string | null>(null);

    const { writeContractAsync, data: txHash, isPending } = useWriteContract();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

    const updateAgent = useCallback(
        async (agentId: number, newFeeUsdc: number, isActive: boolean) => {
            if (!address) {
                setError('Connect wallet first');
                return false;
            }
            setError(null);
            try {
                await writeContractAsync({
                    address: CONTRACTS.REGISTRY,
                    abi: REGISTRY_ABI,
                    functionName: 'updateAgent',
                    args: [BigInt(agentId), parseUSDC(String(newFeeUsdc)), isActive],
                });
                return true;
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Update failed');
                return false;
            }
        },
        [address, writeContractAsync]
    );

    return { updateAgent, error, isPending, isConfirming };
}
