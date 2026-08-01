'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';
import { ESCROW_ABI, ERC20_ABI, CONTRACTS } from '@/lib/contracts';

/**
 * Hook for escrow contract write operations
 */
export function useEscrow(contractAddress: `0x${string}` | undefined) {
    const { address, mode, executeContract } = useWallet();
    const [circlePending, setCirclePending] = useState(false);
    const [circleSuccess, setCircleSuccess] = useState(false);
    const [circleError, setCircleError] = useState<Error | null>(null);

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

    const executeCircle = async (abiFunctionSignature: string, abiParameters: unknown[] = []) => {
        if (!contractAddress || !executeContract) return false;
        setCirclePending(true);
        setCircleSuccess(false);
        setCircleError(null);
        try {
            await executeContract({
                contractAddress,
                abiFunctionSignature,
                abiParameters,
            });
            setCircleSuccess(true);
            return true;
        } catch (err) {
            setCircleError(err instanceof Error ? err : new Error('Circle transaction failed'));
            throw err;
        } finally {
            setCirclePending(false);
        }
    };

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

        if (mode === 'circle' && executeContract) {
            setCirclePending(true);
            setCircleSuccess(false);
            setCircleError(null);
            try {
                await executeContract({
                    contractAddress: CONTRACTS.USDC,
                    abiFunctionSignature: 'approve(address,uint256)',
                    abiParameters: [contractAddress, amount.toString()],
                });
                setCircleSuccess(true);
            } catch (err) {
                setCircleError(err instanceof Error ? err : new Error('Circle approval failed'));
                throw err;
            } finally {
                setCirclePending(false);
            }
            return;
        }

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

        await approveForFunding(amount);
    };

    /**
     * Execute fund after approval
     */
    const executeFund = async () => {
        if (!contractAddress) return;

        if (mode === 'circle') {
            await executeCircle('fundContract()');
            return;
        }
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

        if (mode === 'circle') {
            await executeCircle('submitMilestone(uint256,string)', [
                String(milestoneIndex),
                deliverableURI,
            ]);
            return;
        }
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

        if (mode === 'circle') {
            await executeCircle('approveMilestone(uint256)', [String(milestoneIndex)]);
            return;
        }
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

        if (mode === 'circle') {
            await executeCircle('autoApproveMilestone(uint256)', [String(milestoneIndex)]);
            return;
        }
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

        if (mode === 'circle') {
            await executeCircle('releaseMilestonePayment(uint256)', [String(milestoneIndex)]);
            return;
        }
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

        if (mode === 'circle') {
            await executeCircle('initiateDispute()');
            return;
        }
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

        if (mode === 'circle') {
            await executeCircle('cancelContract()');
            return;
        }
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
        isPending: mode === 'circle' ? circlePending : isPending,
        isConfirming: mode === 'circle' ? circlePending : isConfirming,
        isSuccess: mode === 'circle' ? circleSuccess : isSuccess,
        error: mode === 'circle' ? circleError : error,
        reset: mode === 'circle'
            ? () => {
                setCircleSuccess(false);
                setCircleError(null);
            }
            : reset,
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
