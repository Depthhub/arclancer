'use client';

import { useQuery } from '@tanstack/react-query';
import { useReadContract, useAccount } from 'wagmi';
import { CONTRACTS, FACTORY_ABI, ESCROW_ABI } from '@/lib/contracts';
import type { ContractDetails, Milestone, ContractStatus } from '@/types';
import { useEffect, useState } from 'react';

/**
 * Hook to fetch all contracts for the current user
 */
export function useUserContracts() {
    const { address } = useAccount();

    const { data: contractAddresses, isLoading, error, refetch } = useReadContract({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getUserContracts',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
            refetchInterval: 30000, // Refetch every 30 seconds
            refetchOnWindowFocus: true,
            staleTime: 15000, // Consider data fresh for 15 seconds
        },
    });



    return {
        contracts: contractAddresses as `0x${string}`[] | undefined,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to fetch details for all user contracts
 */
export function useAllContractDetails() {
    const { contracts, isLoading: contractsLoading } = useUserContracts();
    const [allDetails, setAllDetails] = useState<ContractDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!contracts || contracts.length === 0) {
            setAllDetails([]);
            setLoading(false);
            return;
        }

        const fetchAll = async () => {
            setLoading(true);
            try {
                const { readContract } = await import('wagmi/actions');
                const { wagmiConfig } = await import('@/lib/wagmi');

                const results = await Promise.allSettled(
                    contracts.map((addr) =>
                        readContract(wagmiConfig, {
                            address: addr as `0x${string}`,
                            abi: ESCROW_ABI,
                            functionName: 'getContractDetails',
                        }).then((data) => ({ addr, data }))
                    )
                );

                const details: ContractDetails[] = [];
                for (const result of results) {
                    if (result.status !== 'fulfilled') continue;
                    const { addr, data } = result.value;
                    const [client, freelancer, totalAmount, totalPaid, status, milestoneCount, funded] =
                        data as readonly [string, string, bigint, bigint, number, bigint, boolean];
                    details.push({
                        address: addr as `0x${string}`,
                        client: client as `0x${string}`,
                        freelancer: freelancer as `0x${string}`,
                        totalAmount,
                        totalPaid,
                        status: Number(status),
                        milestoneCount: Number(milestoneCount),
                        funded,
                    });
                }

                setAllDetails(details);
            } catch (err) {
                console.error('Failed to fetch contract details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [contracts]);

    return {
        contracts: allDetails,
        isLoading: contractsLoading || loading,
    };
}

/**
 * Hook to fetch contract details by address
 */
export function useContractDetails(contractAddress: `0x${string}` | undefined) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'getContractDetails',
        query: {
            enabled: !!contractAddress,
        },
    });

    const result = data as readonly [string, string, bigint, bigint, number, bigint, boolean] | undefined;
    const details: ContractDetails | undefined = result
        ? {
            address: contractAddress!,
            client: result[0] as `0x${string}`,
            freelancer: result[1] as `0x${string}`,
            totalAmount: result[2],
            totalPaid: result[3],
            status: Number(result[4]) as ContractStatus,
            milestoneCount: Number(result[5]),
            funded: result[6],
        }
        : undefined;

    return {
        details,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to fetch all milestones for a contract
 */
export function useContractMilestones(contractAddress: `0x${string}` | undefined) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'getAllMilestones',
        query: {
            enabled: !!contractAddress,
        },
    });

    const milestones: Milestone[] | undefined = data
        ? (data as Milestone[]).map((m) => ({
            amount: m.amount,
            description: m.description,
            deliverableURI: m.deliverableURI,
            submitted: m.submitted,
            approved: m.approved,
            paid: m.paid,
            submittedAt: m.submittedAt,
            approvedAt: m.approvedAt,
        }))
        : undefined;

    return {
        milestones,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to get platform fee from factory
 */
export function usePlatformFee() {
    const { data, isLoading, error } = useReadContract({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'platformFeePercentage',
    });

    return {
        feePercentage: data ? Number(data) / 100 : 2, // Convert basis points to percent
        isLoading,
        error,
    };
}

/**
 * Hook to calculate fee for an amount
 * @param amount - Amount in dollars (e.g., 5000 for $5,000)
 * @returns fee and netAmount in dollars
 */
export function useCalculateFee(amount: number) {
    const isContractDeployed = (CONTRACTS.FACTORY as string) !== '0x0000000000000000000000000000000000000000';

    const { data, isLoading, error } = useReadContract({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'calculateFee',
        args: [BigInt(Math.floor(amount * 1e6))],
        query: {
            enabled: amount > 0 && isContractDeployed,
        },
    });

    const result = data as readonly [bigint, bigint] | undefined;

    // If contract not available or not deployed, calculate locally (2% fee)
    if (!result && amount > 0) {
        const feePercent = 2;
        const calculatedFee = amount * (feePercent / 100);
        return {
            fee: calculatedFee,
            netAmount: amount - calculatedFee,
            isLoading: false,
            error: null,
        };
    }

    return {
        fee: result ? Number(result[0]) / 1e6 : 0,
        netAmount: result ? Number(result[1]) / 1e6 : 0,
        isLoading,
        error,
    };
}

/**
 * Hook to check if a milestone can be auto-approved
 */
export function useCanAutoApprove(contractAddress: `0x${string}` | undefined, milestoneIndex: number) {
    const { data, isLoading, error } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'canAutoApprove',
        args: [BigInt(milestoneIndex)],
        query: {
            enabled: !!contractAddress,
        },
    });

    return {
        canAutoApprove: !!data,
        isLoading,
        error,
    };
}
