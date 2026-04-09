'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useUserContracts } from './useContracts';
import { ESCROW_ABI } from '@/lib/contracts';

export interface ApprovedMilestone {
    contractAddress: string;
    milestoneIndex: number;
    description: string;
    amount: bigint;
    contractTitle?: string;
}

/**
 * Hook to fetch all approved but unpaid milestones for the current user
 */
export function useApprovedMilestones() {
    const { address } = useAccount();
    const { contracts } = useUserContracts();
    const [approvedMilestones, setApprovedMilestones] = useState<ApprovedMilestone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalAvailable, setTotalAvailable] = useState(0);

    useEffect(() => {
        if (!address || !contracts || contracts.length === 0) {
            setApprovedMilestones([]);
            setTotalAvailable(0);
            setIsLoading(false);
            return;
        }

        const fetchApprovedMilestones = async () => {
            setIsLoading(true);
            const allApproved: ApprovedMilestone[] = [];
            let total = 0;

            // Import readContract from wagmi/actions
            const { readContract } = await import('wagmi/actions');
            const { wagmiConfig } = await import('@/lib/wagmi');
            const { ESCROW_ABI } = await import('@/lib/contracts');

            // Fetch all contract details in parallel
            const detailsResults = await Promise.allSettled(
                contracts.map(contractAddr =>
                    readContract(wagmiConfig, {
                        address: contractAddr as `0x${string}`,
                        abi: ESCROW_ABI,
                        functionName: 'getContractDetails',
                    }).then(details => ({ contractAddr, details }))
                )
            );

            // For each contract where user is freelancer, fetch milestones in parallel
            const milestonePromises: Promise<void>[] = [];

            for (const result of detailsResults) {
                if (result.status !== 'fulfilled') continue;

                const { contractAddr, details } = result.value;
                const [client, freelancer, totalAmount, totalPaid, status, milestoneCount, funded] = details as readonly [string, string, bigint, bigint, number, bigint, boolean];

                // Only process if user is freelancer
                if (freelancer.toLowerCase() !== address.toLowerCase()) continue;

                const count = Number(milestoneCount);
                if (count === 0) continue;

                const milestonePromise = Promise.allSettled(
                    Array.from({ length: count }, (_, i) =>
                        readContract(wagmiConfig, {
                            address: contractAddr as `0x${string}`,
                            abi: ESCROW_ABI,
                            functionName: 'getMilestone',
                            args: [BigInt(i)],
                        }).then(milestone => ({ index: i, milestone }))
                    )
                ).then(milestoneResults => {
                    for (const mResult of milestoneResults) {
                        if (mResult.status !== 'fulfilled') continue;

                        const { index, milestone } = mResult.value;
                        const { amount, description, submitted, approved, paid } = milestone as any;

                        // Add if approved and not paid
                        if (approved && !paid) {
                            allApproved.push({
                                contractAddress: contractAddr,
                                milestoneIndex: index,
                                description,
                                amount,
                            });
                            total += Number(amount);
                        }
                    }
                });

                milestonePromises.push(milestonePromise);
            }

            await Promise.allSettled(milestonePromises);

            setApprovedMilestones(allApproved);
            setTotalAvailable(total / 1e6); // Convert from USDC decimals
            setIsLoading(false);
        };

        fetchApprovedMilestones();
    }, [address, contracts]);

    return {
        approvedMilestones,
        totalAvailable,
        isLoading,
        refetch: () => {
            // Trigger refetch
            setIsLoading(true);
        },
    };
}

/**
 * Hook to fetch approved milestones for a specific contract
 */
export function useContractApprovedMilestones(contractAddress: `0x${string}` | undefined) {
    const { address } = useAccount();
    const [milestones, setMilestones] = useState<ApprovedMilestone[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch contract details
    const { data: detailsData } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'getContractDetails',
        query: {
            enabled: !!contractAddress,
        },
    });

    useEffect(() => {
        if (!contractAddress || !detailsData || !address) {
            setMilestones([]);
            setIsLoading(false);
            return;
        }

        const fetchMilestones = async () => {
            setIsLoading(true);
            const details = detailsData as readonly [string, string, bigint, bigint, number, bigint, boolean];
            const freelancer = details[1];

            // Only fetch if user is the freelancer
            if (freelancer.toLowerCase() !== address.toLowerCase()) {
                setMilestones([]);
                setIsLoading(false);
                return;
            }

            try {
                const { readContract } = await import('wagmi/actions');
                const { wagmiConfig } = await import('@/lib/wagmi');

                const rawMilestones = await readContract(wagmiConfig, {
                    address: contractAddress,
                    abi: ESCROW_ABI,
                    functionName: 'getAllMilestones',
                });

                const allMilestones = rawMilestones as readonly any[];
                const approved: ApprovedMilestone[] = [];

                for (let i = 0; i < allMilestones.length; i++) {
                    const m = allMilestones[i];
                    if (m.approved && !m.paid) {
                        approved.push({
                            contractAddress: contractAddress,
                            milestoneIndex: i,
                            description: m.description,
                            amount: m.amount,
                        });
                    }
                }

                setMilestones(approved);
            } catch (err) {
                console.error('Failed to fetch contract milestones:', err);
                setMilestones([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMilestones();
    }, [contractAddress, detailsData, address]);

    return {
        milestones,
        isLoading,
    };
}
