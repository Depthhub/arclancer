'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUserContracts } from './useContracts';
import type { PendingAction } from '@/components/dashboard/PendingActionsCard';

/**
 * Hook that computes real pending actions from on-chain contract state.
 *
 * For the connected wallet it checks every contract and milestone:
 *  - Client needs to fund   → type "sign"
 *  - Client needs to review → type "review"  (milestone submitted, not yet approved)
 *  - Freelancer needs to submit → type "submit" (un-submitted milestone on a funded contract)
 *  - Either party has withdrawable milestones → type "approve"
 */
export function usePendingActions() {
    const { address } = useAccount();
    const { contracts } = useUserContracts();
    const [actions, setActions] = useState<PendingAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!address || !contracts || contracts.length === 0) {
            setActions([]);
            setIsLoading(false);
            return;
        }

        const compute = async () => {
            setIsLoading(true);
            const pending: PendingAction[] = [];

            try {
                const { readContract } = await import('wagmi/actions');
                const { wagmiConfig } = await import('@/lib/wagmi');
                const { ESCROW_ABI } = await import('@/lib/contracts');

                // Fetch all contract details in parallel
                const detailResults = await Promise.allSettled(
                    contracts.map((addr) =>
                        readContract(wagmiConfig, {
                            address: addr as `0x${string}`,
                            abi: ESCROW_ABI,
                            functionName: 'getContractDetails',
                        }).then((d) => ({ addr, details: d }))
                    )
                );

                // For each contract fetch milestones in parallel
                const milestoneJobs: Promise<void>[] = [];

                for (const result of detailResults) {
                    if (result.status !== 'fulfilled') continue;

                    const { addr, details } = result.value;
                    const [client, freelancer, totalAmount, , status, milestoneCount, funded] =
                        details as readonly [string, string, bigint, bigint, number, bigint, boolean];

                    const isClient = client.toLowerCase() === address.toLowerCase();
                    const isFreelancer = freelancer.toLowerCase() === address.toLowerCase();

                    // Skip non-active contracts
                    if (status !== 0) continue; // 0 = ACTIVE

                    // Client needs to fund
                    if (isClient && !funded) {
                        pending.push({
                            id: `fund-${addr}`,
                            type: 'sign',
                            title: 'Fund Contract',
                            subtitle: `${(Number(totalAmount) / 1e6).toFixed(2)} USDC`,
                            urgency: 'high',
                            contractId: addr,
                        });
                    }

                    // Only inspect milestones for funded contracts
                    if (!funded) continue;

                    const count = Number(milestoneCount);
                    if (count === 0) continue;

                    const job = readContract(wagmiConfig, {
                        address: addr as `0x${string}`,
                        abi: ESCROW_ABI,
                        functionName: 'getAllMilestones',
                    }).then((rawMilestones) => {
                        const ms = rawMilestones as readonly any[];

                        for (let i = 0; i < ms.length; i++) {
                            const m = ms[i];

                            // Freelancer: un-submitted milestone → needs to submit work
                            if (isFreelancer && !m.submitted) {
                                pending.push({
                                    id: `submit-${addr}-${i}`,
                                    type: 'submit',
                                    title: `Submit Milestone ${i + 1}`,
                                    subtitle: m.description?.slice(0, 40) || `Milestone ${i + 1}`,
                                    urgency: 'normal',
                                    contractId: addr,
                                });
                                break; // Only prompt for the next un-submitted one
                            }

                            // Client: submitted but not approved → needs review
                            if (isClient && m.submitted && !m.approved) {
                                pending.push({
                                    id: `review-${addr}-${i}`,
                                    type: 'review',
                                    title: `Review Milestone ${i + 1}`,
                                    subtitle: m.description?.slice(0, 40) || `Milestone ${i + 1}`,
                                    urgency: 'high',
                                    contractId: addr,
                                });
                            }

                            // Freelancer: approved but not paid → can withdraw
                            if (isFreelancer && m.approved && !m.paid) {
                                pending.push({
                                    id: `withdraw-${addr}-${i}`,
                                    type: 'approve',
                                    title: `Withdraw Milestone ${i + 1}`,
                                    subtitle: `${(Number(m.amount) / 1e6).toFixed(2)} USDC available`,
                                    urgency: 'normal',
                                    contractId: addr,
                                });
                            }
                        }
                    });

                    milestoneJobs.push(job.catch(() => { })); // swallow per-contract errors
                }

                await Promise.allSettled(milestoneJobs);
            } catch (err) {
                console.error('[usePendingActions] Error:', err);
            }

            setActions(pending);
            setIsLoading(false);
        };

        compute();
    }, [address, contracts]);

    return { actions, isLoading };
}
