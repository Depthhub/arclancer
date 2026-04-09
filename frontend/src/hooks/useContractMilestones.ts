'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { ESCROW_ABI } from '@/lib/contracts';

export interface MilestoneWithContract {
    contractAddress: string;
    milestoneIndex: number;
    description: string;
    amount: bigint;
    submitted: boolean;
    approved: boolean;
    paid: boolean;
    submittedAt: bigint;
    approvedAt: bigint;
    deliverableURI: string;
}

// Shape returned by the contract's getAllMilestones()
interface RawMilestone {
    amount: bigint;
    description: string;
    deliverableURI: string;
    submitted: boolean;
    approved: boolean;
    paid: boolean;
    submittedAt: bigint;
    approvedAt: bigint;
}

/**
 * Hook to fetch all milestones for a single contract using getAllMilestones()
 */
export function useContractMilestonesDetailed(contractAddress: `0x${string}` | undefined) {
    const { data: rawMilestones, isLoading, refetch, error } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'getAllMilestones',
        query: {
            enabled: !!contractAddress,
            refetchInterval: 30000,
            staleTime: 15000,
        },
    });

    const milestones: MilestoneWithContract[] = rawMilestones
        ? (rawMilestones as readonly RawMilestone[]).map((m, index) => ({
            contractAddress: contractAddress || '',
            milestoneIndex: index,
            description: m.description,
            amount: m.amount,
            submitted: m.submitted,
            approved: m.approved,
            paid: m.paid,
            submittedAt: m.submittedAt,
            approvedAt: m.approvedAt,
            deliverableURI: m.deliverableURI,
        }))
        : [];

    return {
        milestones,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to get all approved-but-unpaid milestones across multiple contracts (available to withdraw).
 * Fetches getAllMilestones + getContractDetails for each contract in parallel.
 */
export function useAvailableWithdrawals(
    userAddress: `0x${string}` | undefined,
    contracts: `0x${string}`[] | undefined
) {
    const [availableMilestones, setAvailableMilestones] = useState<MilestoneWithContract[]>([]);
    const [totalAvailable, setTotalAvailable] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!userAddress || !contracts || contracts.length === 0) {
            setAvailableMilestones([]);
            setTotalAvailable(0);
            setIsLoading(false);
            return;
        }

        const fetchAvailable = async () => {
            setIsLoading(true);
            try {
                const { readContract } = await import('wagmi/actions');
                const { wagmiConfig } = await import('@/lib/wagmi');

                // Fetch details + milestones for all contracts in parallel
                const results = await Promise.allSettled(
                    contracts.map(async (contractAddr) => {
                        const [details, milestones] = await Promise.all([
                            readContract(wagmiConfig, {
                                address: contractAddr,
                                abi: ESCROW_ABI,
                                functionName: 'getContractDetails',
                            }),
                            readContract(wagmiConfig, {
                                address: contractAddr,
                                abi: ESCROW_ABI,
                                functionName: 'getAllMilestones',
                            }),
                        ]);
                        return { contractAddr, details, milestones };
                    })
                );

                const available: MilestoneWithContract[] = [];

                for (const result of results) {
                    if (result.status !== 'fulfilled') continue;

                    const { contractAddr, details, milestones } = result.value;
                    const [, freelancer] = details as readonly [string, string, bigint, bigint, number, bigint, boolean];

                    // Only include contracts where the user is the freelancer
                    if (freelancer.toLowerCase() !== userAddress.toLowerCase()) continue;

                    const rawMilestones = milestones as readonly RawMilestone[];
                    for (let i = 0; i < rawMilestones.length; i++) {
                        const m = rawMilestones[i];
                        // Approved but not yet paid = available to withdraw
                        if (m.approved && !m.paid) {
                            available.push({
                                contractAddress: contractAddr,
                                milestoneIndex: i,
                                description: m.description,
                                amount: m.amount,
                                submitted: m.submitted,
                                approved: m.approved,
                                paid: m.paid,
                                submittedAt: m.submittedAt,
                                approvedAt: m.approvedAt,
                                deliverableURI: m.deliverableURI,
                            });
                        }
                    }
                }

                setAvailableMilestones(available);
                setTotalAvailable(available.reduce((sum, m) => sum + Number(m.amount), 0));
            } catch (err) {
                console.error('Failed to fetch available withdrawals:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAvailable();
    }, [userAddress, contracts]);

    return {
        availableMilestones,
        totalAvailable,
        isLoading,
    };
}
