'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface TransactionToastOptions {
    /** Hash of the pending transaction */
    hash: `0x${string}` | undefined;
    /** Whether the transaction is waiting for user signature */
    isPending: boolean;
    /** Whether the transaction is being confirmed onchain */
    isConfirming: boolean;
    /** Whether the transaction was confirmed successfully */
    isSuccess: boolean;
    /** Error from the transaction */
    error: Error | null;
    /** Label for what action is being performed (e.g. "Funding contract") */
    actionLabel?: string;
}

/**
 * Hook that watches wagmi transaction state and shows toast notifications.
 * Drop this into any component that uses useWriteContract + useWaitForTransactionReceipt.
 *
 * Usage:
 *   const { writeContract, data: hash, isPending, error } = useWriteContract();
 *   const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
 *   useTransactionToast({ hash, isPending, isConfirming, isSuccess, error, actionLabel: 'Funding' });
 */
export function useTransactionToast({
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    actionLabel = 'Transaction',
}: TransactionToastOptions) {
    // Track the toast ID so we can update it
    const toastIdRef = useRef<string | undefined>(undefined);
    // Track previous hash to detect new transactions
    const prevHashRef = useRef<`0x${string}` | undefined>(undefined);

    // When user is signing (wallet popup)
    useEffect(() => {
        if (isPending && !hash) {
            toastIdRef.current = toast.loading(
                `${actionLabel}: Waiting for wallet signature...`,
                { id: toastIdRef.current }
            );
        }
    }, [isPending, hash, actionLabel]);

    // When transaction is submitted and confirming
    useEffect(() => {
        if (hash && hash !== prevHashRef.current) {
            prevHashRef.current = hash;
            const shortHash = `${hash.slice(0, 6)}…${hash.slice(-4)}`;
            toastIdRef.current = toast.loading(
                `${actionLabel}: Confirming (${shortHash})...`,
                { id: toastIdRef.current }
            );
        }
    }, [hash, actionLabel]);

    // When confirmed
    useEffect(() => {
        if (isSuccess && hash) {
            toast.success(`${actionLabel} confirmed!`, {
                id: toastIdRef.current,
                duration: 5000,
            });
            toastIdRef.current = undefined;
        }
    }, [isSuccess, hash, actionLabel]);

    // When failed
    useEffect(() => {
        if (error) {
            const message = parseTransactionError(error);
            toast.error(`${actionLabel} failed: ${message}`, {
                id: toastIdRef.current,
                duration: 8000,
            });
            toastIdRef.current = undefined;
        }
    }, [error, actionLabel]);
}

/**
 * Parse wagmi/viem errors into user-friendly messages
 */
function parseTransactionError(error: Error): string {
    const msg = error.message || 'Unknown error';

    // User rejected in wallet
    if (msg.includes('User rejected') || msg.includes('user rejected')) {
        return 'Transaction was rejected in your wallet';
    }

    // Insufficient funds
    if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
        return 'Insufficient balance for this transaction';
    }

    // Gas estimation failed (usually a contract revert)
    if (msg.includes('gas') && msg.includes('estimation')) {
        return 'Transaction would fail — check contract conditions';
    }

    // Contract revert with reason
    const revertMatch = msg.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) {
        return revertMatch[1];
    }

    // Custom error
    const customMatch = msg.match(/reverted with custom error '(.+?)'/);
    if (customMatch) {
        return customMatch[1];
    }

    // Network error
    if (msg.includes('network') || msg.includes('timeout')) {
        return 'Network error — please try again';
    }

    // Truncate long messages
    if (msg.length > 100) {
        return msg.slice(0, 100) + '…';
    }

    return msg;
}

/**
 * Standalone toast helpers for non-transaction notifications
 */
export const txToast = {
    success: (message: string) => toast.success(message, { duration: 5000 }),
    error: (message: string) => toast.error(message, { duration: 8000 }),
    info: (message: string) => toast(message, { duration: 4000, icon: 'ℹ️' }),
    loading: (message: string) => toast.loading(message),
    dismiss: (id?: string) => toast.dismiss(id),
};
