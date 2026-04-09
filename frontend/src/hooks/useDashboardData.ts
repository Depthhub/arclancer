'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useUserContracts, useContractDetails } from './useContracts';
import { ContractStatus } from '@/types';

export interface DashboardStats {
    totalContracts: number;
    activeContracts: number;
    inEscrow: number;
    available: number;
    pendingActions: number;
    activeDisputes: number;
    completedContracts: number;
    avgPayoutDays: number;
    recentPayout: {
        amount: number;
        currency: string;
    } | null;
}

/**
 * Simplified hook to fetch dashboard stats
 * Uses individual contract hooks for each contract
 */
export function useDashboardData() {
    const { address } = useAccount();
    const { contracts, isLoading: contractsLoading } = useUserContracts();
    const [stats, setStats] = useState<DashboardStats>({
        totalContracts: 0,
        activeContracts: 0,
        inEscrow: 0,
        available: 0,
        pendingActions: 0,
        activeDisputes: 0,
        completedContracts: 0,
        avgPayoutDays: 2.4,
        recentPayout: null,
    });

    // Debug info for troubleshooting
    const [debugInfo, setDebugInfo] = useState<string[]>([]);

    // Fetch and calculate stats from all contracts
    useEffect(() => {
        if (!contracts || contracts.length === 0 || !address) {
            setStats({
                totalContracts: 0,
                activeContracts: 0,
                inEscrow: 0,
                available: 0,
                pendingActions: 0,
                activeDisputes: 0,
                completedContracts: 0,
                avgPayoutDays: 2.4,
                recentPayout: null,
            });
            return;
        }

        const fetchContractStats = async () => {
            let totalInEscrow = 0;
            let totalAvailable = 0;
            let activeCount = 0;
            let disputeCount = 0;
            let completedCount = 0;
            const debugLines: string[] = [];

            // Import readContract from wagmi/actions
            const { readContract } = await import('wagmi/actions');
            const { wagmiConfig } = await import('@/lib/wagmi');
            const { ESCROW_ABI } = await import('@/lib/contracts');

            // Fetch ALL contract details in parallel instead of serial
            const detailsResults = await Promise.allSettled(
                contracts.map(contractAddr =>
                    readContract(wagmiConfig, {
                        address: contractAddr as `0x${string}`,
                        abi: ESCROW_ABI,
                        functionName: 'getContractDetails',
                    }).then(details => ({ contractAddr, details }))
                )
            );

            // Process results and fetch milestones in parallel
            const milestonePromises: Promise<void>[] = [];

            for (const result of detailsResults) {
                if (result.status !== 'fulfilled') continue;

                const { contractAddr, details } = result.value;
                const [client, freelancer, totalAmount, totalPaid, status, milestoneCount, funded] = details as readonly [string, string, bigint, bigint, number, bigint, boolean];

                const isUserFreelancer = freelancer.toLowerCase() === address.toLowerCase();
                debugLines.push(`Contract ${contractAddr.slice(0, 8)}...: Freelancer=${freelancer.slice(0, 8)}..., You=${isUserFreelancer ? 'YES' : 'NO'}, Milestones=${milestoneCount.toString()}, Funded=${funded}`);

                // Count by status
                if (status === 0) activeCount++; // ACTIVE
                if (status === 2) disputeCount++; // DISPUTED
                if (status === 3) completedCount++; // COMPLETED

                // Calculate in escrow (funded but not paid)
                if (funded) {
                    const remaining = totalAmount - totalPaid;
                    totalInEscrow += Number(remaining) / 1e6;
                }

                // Fetch milestones in parallel per contract
                const count = Number(milestoneCount);
                if (count > 0 && isUserFreelancer) {
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

                            debugLines.push(`  └─ M${index}: Submitted=${submitted}, Approved=${approved}, Paid=${paid}, Amount=${Number(amount) / 1e6} USDC`);

                            // If milestone is approved but not paid
                            if (approved && !paid) {
                                totalAvailable += Number(amount) / 1e6;
                            }
                        }
                    });

                    milestonePromises.push(milestonePromise);
                }
            }

            // Wait for all milestone fetches to complete
            await Promise.allSettled(milestonePromises);

            setStats({
                totalContracts: contracts.length,
                activeContracts: activeCount,
                inEscrow: totalInEscrow,
                available: totalAvailable,
                pendingActions: 0,
                activeDisputes: disputeCount,
                completedContracts: completedCount,
                avgPayoutDays: 2.4,
                recentPayout: totalAvailable > 0 ? { amount: totalAvailable, currency: 'USDC' } : null,
            });

            setDebugInfo(debugLines);
        };

        fetchContractStats();
    }, [contracts, address]);

    return {
        stats,
        debugInfo,
        contractsData: [], // Will be populated by individual contract cards
        isLoading: contractsLoading,
    };
}

/**
 * Hook to fetch and aggregate stats from multiple contract details
 */
export function useAggregatedStats(contractAddresses: `0x${string}`[] | undefined) {
    const { address } = useAccount();
    const [aggregatedStats, setAggregatedStats] = useState({
        inEscrow: 0,
        available: 0,
        pendingActions: 0,
        activeDisputes: 0,
        completedContracts: 0,
    });

    useEffect(() => {
        if (!contractAddresses || contractAddresses.length === 0 || !address) {
            setAggregatedStats({
                inEscrow: 0,
                available: 0,
                pendingActions: 0,
                activeDisputes: 0,
                completedContracts: 0,
            });
            return;
        }

        const fetchStats = async () => {
            let inEscrow = 0;
            let available = 0;
            let pendingActions = 0;
            let activeDisputes = 0;
            let completedContracts = 0;

            try {
                const { readContract } = await import('wagmi/actions');
                const { wagmiConfig } = await import('@/lib/wagmi');
                const { ESCROW_ABI } = await import('@/lib/contracts');

                const results = await Promise.allSettled(
                    contractAddresses.map((addr) =>
                        readContract(wagmiConfig, {
                            address: addr,
                            abi: ESCROW_ABI,
                            functionName: 'getContractDetails',
                        }).then((d) => ({ addr, details: d }))
                    )
                );

                const milestoneJobs: Promise<void>[] = [];

                for (const result of results) {
                    if (result.status !== 'fulfilled') continue;
                    const { addr, details } = result.value;
                    const [client, freelancer, totalAmount, totalPaid, status, milestoneCount, funded] =
                        details as readonly [string, string, bigint, bigint, number, bigint, boolean];

                    if (status === 2) activeDisputes++;
                    if (status === 1) completedContracts++;

                    if (funded) {
                        inEscrow += Number(totalAmount - totalPaid) / 1e6;
                    }

                    // Fetch milestones to compute available + pending
                    const isFreelancer = freelancer.toLowerCase() === address.toLowerCase();
                    const isClient = client.toLowerCase() === address.toLowerCase();
                    if (status === 0 && funded && Number(milestoneCount) > 0) {
                        const job = readContract(wagmiConfig, {
                            address: addr,
                            abi: ESCROW_ABI,
                            functionName: 'getAllMilestones',
                        }).then((raw) => {
                            const ms = raw as readonly any[];
                            for (const m of ms) {
                                if (isFreelancer && m.approved && !m.paid) {
                                    available += Number(m.amount) / 1e6;
                                }
                                if (isClient && m.submitted && !m.approved) {
                                    pendingActions++;
                                }
                                if (isFreelancer && !m.submitted) {
                                    pendingActions++;
                                }
                            }
                        });
                        milestoneJobs.push(job.catch(() => { }));
                    }
                }

                await Promise.allSettled(milestoneJobs);
            } catch (err) {
                console.error('[useAggregatedStats] Error:', err);
            }

            setAggregatedStats({ inEscrow, available, pendingActions, activeDisputes, completedContracts });
        };

        fetchStats();
    }, [contractAddresses, address]);

    return aggregatedStats;
}
