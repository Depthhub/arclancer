'use client';

import { useEffect } from 'react';
import { useContractDetails, useContractMilestones } from '@/hooks/useContracts';

interface ContractDataFetcherProps {
    contractAddress: `0x${string}`;
    onDataFetched: (data: any) => void;
}

/**
 * Component that fetches contract data and passes it to parent
 * This is a workaround since we can't use hooks in loops
 */
export function ContractDataFetcher({ contractAddress, onDataFetched }: ContractDataFetcherProps) {
    const { details, isLoading: detailsLoading } = useContractDetails(contractAddress);
    const { milestones, isLoading: milestonesLoading } = useContractMilestones(contractAddress);

    useEffect(() => {
        if (!detailsLoading && !milestonesLoading && details) {
            onDataFetched({
                contractAddress: contractAddress,
                ...details,
                milestones: milestones || [],
            });
        }
    }, [details, milestones, detailsLoading, milestonesLoading, contractAddress, onDataFetched]);

    return null; // This component doesn't render anything
}
