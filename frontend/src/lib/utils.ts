import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
    if (!address) return '';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format USDC amount to display string
 * @param amount - If bigint: micro-units (6 decimals). If number: also treated as micro-units for consistency.
 * @param decimals - Number of decimals (default 6 for USDC)
 */
export function formatUSDC(amount: bigint | number, decimals = 6): string {
    const value = typeof amount === 'bigint'
        ? Number(amount) / 10 ** decimals
        : amount / 10 ** decimals;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Format a dollar amount (already in dollars, not micro-units)
 * @param amount - Amount in dollars (e.g., 5000 for $5000)
 */
export function formatDollars(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
}

export function parseUSDC(amount: string | number): bigint {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return BigInt(Math.floor(value * 1e6));
}

export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp * 1000;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

export function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const CONTRACT_STATUS = {
    0: { label: 'Active', color: 'blue' },
    1: { label: 'Completed', color: 'green' },
    2: { label: 'Disputed', color: 'red' },
    3: { label: 'Cancelled', color: 'gray' },
} as const;

export type ContractStatusType = keyof typeof CONTRACT_STATUS;
