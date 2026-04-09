'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useStableFXRate } from '@/hooks/useStableFX';
import { ArrowRight, RefreshCw, Loader2 } from 'lucide-react';

interface StableFXRateProps {
    fromCurrency: string;
    toCurrency: string;
    amount: number;
    showFee?: boolean;
}

export function StableFXRate({ fromCurrency, toCurrency, amount, showFee = true }: StableFXRateProps) {
    const { rate, isLoading, error } = useStableFXRate(fromCurrency, toCurrency, amount);

    if (fromCurrency === toCurrency) {
        return null;
    }

    if (isLoading) {
        return (
            <Card variant="elevated" padding="sm">
                <div className="flex items-center justify-center gap-2 text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Fetching exchange rate...</span>
                </div>
            </Card>
        );
    }

    if (error || !rate) {
        return (
            <Card variant="elevated" padding="sm">
                <p className="text-sm text-red-500">Failed to fetch exchange rate</p>
            </Card>
        );
    }

    return (
        <Card variant="elevated" padding="sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">{fromCurrency}</span>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">You pay</p>
                            <p className="text-sm font-medium text-neutral-900">{amount.toLocaleString()} {fromCurrency}</p>
                        </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-neutral-400" />

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-600">{toCurrency}</span>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">Freelancer receives</p>
                            <p className="text-sm font-medium text-neutral-900">
                                ~{rate.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {toCurrency}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs text-neutral-500">Rate</p>
                    <p className="text-sm text-neutral-700">1 {fromCurrency} = {rate.rate.toFixed(4)} {toCurrency}</p>
                    {showFee && (
                        <p className="text-xs text-neutral-500 mt-1">
                            Fee: {rate.feePercentage}% (~{rate.fee.toFixed(2)} {fromCurrency})
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-neutral-100">
                <RefreshCw className="w-3 h-3 text-neutral-400" />
                <span className="text-xs text-neutral-500">Rate updates every 30 seconds</span>
            </div>
        </Card>
    );
}
