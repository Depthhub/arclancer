'use client';

import React, { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { ESCROW_ABI } from '@/lib/contracts';
import type { ContractDetails } from '@/types';
import { ActiveContract } from '@/components/dashboard';
import { ContractStatus } from '@/types';
import { formatUSDC } from '@/lib/utils';

interface UseContractCardDataProps {
    contractAddress: `0x${string}`;
}

/**
 * Hook to fetch contract data for dashboard cards
 */
export function useContractCardData(contractAddress: `0x${string}`) {
    const { data, isLoading } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'getContractDetails',
        query: {
            enabled: !!contractAddress,
            refetchInterval: 30000, // Refetch every 30 seconds
            staleTime: 15000, // Consider data fresh for 15 seconds
        },
    });

    const result = data as readonly [string, string, bigint, bigint, number, bigint, boolean] | undefined;

    const contractData: ActiveContract | null = result
        ? {
            id: contractAddress,
            title: `${result[0].slice(0, 6)}...${result[0].slice(-4)} → ${result[1].slice(0, 6)}...${result[1].slice(-4)}`,
            client: `${result[0].slice(0, 6)}...${result[0].slice(-4)}`,
            status: result[6] ? ContractStatus.ACTIVE : ContractStatus.ACTIVE,
            funded: result[6] ? Number(result[2]) / 1e6 : undefined, // Convert from USDC decimals
        }
        : null;

    return {
        data: contractData,
        isLoading,
    };
}

/**
 * Component wrapper to fetch contract details
 */
export function ContractCardDataFetcher(props: {
    contractAddress: `0x${string}`;
    children: (data: ActiveContract | null, isLoading: boolean) => React.ReactNode;
}): React.ReactNode {
    const { data, isLoading } = useContractCardData(props.contractAddress);
    return props.children(data, isLoading);
}
