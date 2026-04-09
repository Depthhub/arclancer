'use client';

import { useQuery } from '@tanstack/react-query';
import type { FXRate } from '@/types';
import { CONTRACTS } from '@/lib/contracts';

// Fallback rates used when StableFX contract is not deployed on the current chain.
// When a contract address is provided, the hook first tries on-chain previewConversion().
// Docs: https://developers.circle.com/stablefx
const MOCK_RATES: Record<string, number> = {
    'USDC-USDC': 1.0,
    'USDC-EURC': 0.92,
    'USDC-BRLA': 5.80,
    'USDC-MXNB': 18.50,
    'USDC-QCAD': 1.36,
    'USDC-AUDF': 1.55,
    'USDC-JPYC': 154.50,
    'USDC-KRW1': 1340.0,
    'USDC-PHPC': 58.50,
};

/**
 * Hook to get StableFX exchange rate
 */
export function useStableFXRate(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    contractAddress?: `0x${string}`
): { rate: FXRate | undefined; isLoading: boolean; error: Error | null } {
    const { data, isLoading, error } = useQuery({
        queryKey: ['stablefx-rate', fromCurrency, toCurrency, amount, contractAddress],
        queryFn: async (): Promise<FXRate> => {
            // Try on-chain if we have a contract address
            if (contractAddress) {
                try {
                    const { readContract } = await import('wagmi/actions');
                    const { wagmiConfig } = await import('@/lib/wagmi');
                    const { ESCROW_ABI } = await import('@/lib/contracts');

                    // Use previewConversion for milestone 0 as a rate indicator
                    const result = await readContract(wagmiConfig, {
                        address: contractAddress,
                        abi: ESCROW_ABI,
                        functionName: 'previewConversion',
                        args: [BigInt(0)],
                    });

                    const [outputAmount, rate, fee] = result as unknown as readonly [bigint, bigint, bigint];

                    const rateNumber = Number(rate) / 1e18;
                    const feeNumber = Number(fee) / 1e6;
                    const outputNumber = Number(outputAmount) / 1e6;

                    return {
                        rate: rateNumber,
                        outputAmount: outputNumber,
                        fee: feeNumber,
                        feePercentage: amount > 0 ? (feeNumber / amount) * 100 : 0,
                    };
                } catch {
                    // Fall through to mock rates
                }
            }

            // Mock fallback for development / when StableFX isn't deployed
            const pairKey = `${fromCurrency}-${toCurrency}`;
            const rate = MOCK_RATES[pairKey] || 1.0;

            const feePercentage = 0.2; // 0.2% StableFX fee
            const feeAmount = amount * (feePercentage / 100);
            const netAmount = amount - feeAmount;
            const outputAmount = netAmount * rate;

            return {
                rate,
                outputAmount,
                fee: feeAmount,
                feePercentage,
            };
        },
        refetchInterval: 30000,
        enabled: amount > 0 && fromCurrency !== toCurrency,
        staleTime: 25000,
    });

    return {
        rate: data,
        isLoading,
        error: error as Error | null,
    };
}

/**
 * Hook to get all supported currency rates
 */
export function useAllFXRates() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['all-fx-rates'],
        queryFn: async () => {
            // Return all mock rates
            return MOCK_RATES;
        },
        refetchInterval: 60000, // Refresh every minute
        staleTime: 55000,
    });

    return {
        rates: data,
        isLoading,
        error: error as Error | null,
    };
}

/**
 * Get currency address by code
 */
export function getCurrencyAddress(code: string): `0x${string}` {
    const addresses: Record<string, string> = {
        'USDC': CONTRACTS.USDC,
        'EURC': CONTRACTS.EURC,
        'BRLA': '0x0000000000000000000000000000000000000001',
        'MXNB': '0x0000000000000000000000000000000000000002',
        'QCAD': '0x0000000000000000000000000000000000000003',
        'AUDF': '0x0000000000000000000000000000000000000004',
        'JPYC': '0x0000000000000000000000000000000000000005',
        'KRW1': '0x0000000000000000000000000000000000000006',
        'PHPC': '0x0000000000000000000000000000000000000007',
    };
    return (addresses[code] || CONTRACTS.USDC) as `0x${string}`;
}
