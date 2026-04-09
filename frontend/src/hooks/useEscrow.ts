'use client';

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi';
import { ESCROW_ABI, ERC20_ABI, CONTRACTS } from '@/lib/contracts';

/**
 * Hook for escrow contract write operations
 */
export function useEscrow(contractAddress: `0x${string}` | undefined) {
    const { address } = useAccount();

    const {
        writeContract,
        data: hash,
        isPending,
        error,
        reset,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    // Check if contract is funded
    const { data: isFunded, refetch: refetchFunded } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'funded',
        query: { enabled: !!contractAddress },
    });

    // Get contract total amount
    const { data: totalAmount } = useReadContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'totalAmount',
        query: { enabled: !!contractAddress },
    });

    /**
     * Approve USDC spending for funding the contract
     */
    const approveForFunding = async (amount: bigint) => {
        if (!contractAddress || !address) return;

        writeContract({
            address: CONTRACTS.USDC as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddress, amount],
        });
    };

    /**
     * Fund the contract with USDC (must approve first)
     */
    const fundContract = async (amount: bigint) => {
        if (!contractAddress || !address) return;

        // Note: This now calls approve. The UI should handle the two-step flow.
        writeContract({
            address: CONTRACTS.USDC as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddress, amount],
        });
    };

    /**
     * Execute fund after approval
     */
    const executeFund = async () => {
        if (!contractAddress) return;

        writeContract({
            address: contractAddress,
            abi: ESCROW_ABI,
            functionName: 'fundContract',
        });
    };

    /**
     * Submit a milestone deliverable
     */
    const submitMilestone = async (milestoneIndex: number, deliverableURI: string) => {
        if (!contractAddress) return;

        writeContract({
            address: contractAddress,
            abi: ESCROW_ABI,
            functionName: 'submitMilestone',
            args: [BigInt(milestoneIndex), deliverableURI],
        });
    };

    /**
     * Approve a submitted milestone
     */
    const approveMilestone = async (milestoneIndex: number) => {
        if (!contractAddress) return;

        writeContract({
            address: contractAddress,
            abi: ESCROW_ABI,
            functionName: 'approveMilestone',
            args: [BigInt(milestoneIndex)],
        });
    };

    /**
     * Auto-approve a milestone (after 7 days)
     */
    const autoApproveMilestone = async (milestoneIndex: number) => {
        if (!contractAddress) return;

        writeContract({
            address: contractAddress,
            abi: ESCROW_ABI,
            functionName: 'autoApproveMilestone',
            args: [BigInt(milestoneIndex)],
        });
    };

    /**
     * Release payment for an approved milestone
     */
    const releaseMilestonePayment = async (milestoneIndex: number) => {
        if (!contractAddress) return;

        writeContract({
            address: contractAddress,
            abi: ESCROW_ABI,
            functionName: 'releaseMilestonePayment',
            args: [BigInt(milestoneIndex)],
        });
    };

    /**
     * Initiate a dispute
     */
    const initiateDispute = async () => {
        if (!contractAddress) return;

        writeContract({
            address: contractAddress,
            abi: ESCROW_ABI,
            functionName: 'initiateDispute',
        });
    };

    /**
     * Cancel the contract
     */
    const cancelContract = async () => {
        if (!contractAddress) return;

        writeContract({
            address: contractAddress,
            abi: ESCROW_ABI,
            functionName: 'cancelContract',
        });
    };

    return {
        // Actions
        fundContract,
        executeFund,
        approveForFunding,
        submitMilestone,
        approveMilestone,
        autoApproveMilestone,
        releaseMilestonePayment,
        initiateDispute,
        cancelContract,

        // Contract State
        isFunded,
        totalAmount,
        refetchFunded,

        // Transaction State
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        reset,
    };
}

/**
 * Hook for approving USDC spending
 */
export function useApproveUSDC() {
    const {
        writeContract,
        data: hash,
        isPending,
        error,
        reset,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const approve = async (spender: `0x${string}`, amount: bigint) => {
        writeContract({
            address: CONTRACTS.USDC as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spender, amount],
        });
    };

    return {
        approve,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        reset,
    };
}
