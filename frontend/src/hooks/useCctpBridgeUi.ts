'use client';

import { useCallback, useState } from 'react';
import { defaultFromChain, defaultToChain } from '@/lib/cctp/chains';
import { EstimateBridge, ExecuteBridge } from '@/lib/cctp/Bridge';
import type {
    BridgeDirection,
    BridgeFeeEstimate,
    BridgeProgressStep,
    BridgeResult,
    BridgeUiPhase,
    TransferSpeed,
} from '@/lib/cctp/types';

export interface UseCctpBridgeUiOptions {
    mode: BridgeDirection;
    suggestedAmount?: number;
}

export function useCctpBridgeUi({ mode, suggestedAmount }: UseCctpBridgeUiOptions) {
    const [phase, setPhase] = useState<BridgeUiPhase>('configure');
    const [fromChainId, setFromChainId] = useState(() => defaultFromChain(mode));
    const [toChainId, setToChainId] = useState(() => defaultToChain(mode));
    const [amount, setAmount] = useState(() =>
        suggestedAmount && suggestedAmount > 0 ? String(suggestedAmount) : ''
    );
    const [transferSpeed, setTransferSpeed] = useState<TransferSpeed>('SLOW');
    const [estimate, setEstimate] = useState<BridgeFeeEstimate | null>(null);
    const [progressStep, setProgressStep] = useState<BridgeProgressStep | null>(null);
    const [result, setResult] = useState<BridgeResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const parsedAmount = parseFloat(amount) || 0;

    const reset = useCallback(() => {
        setPhase('configure');
        setFromChainId(defaultFromChain(mode));
        setToChainId(defaultToChain(mode));
        setAmount(suggestedAmount && suggestedAmount > 0 ? String(suggestedAmount) : '');
        setTransferSpeed('SLOW');
        setEstimate(null);
        setProgressStep(null);
        setResult(null);
        setErrorMessage(null);
    }, [mode, suggestedAmount]);

    const runEstimate = useCallback(async () => {
        if (parsedAmount <= 0) {
            setErrorMessage('Enter a valid USDC amount.');
            setPhase('error');
            return;
        }

        setPhase('estimating');
        setErrorMessage(null);

        try {
            const feeEstimate = await EstimateBridge({
                direction: mode,
                fromChainId,
                toChainId,
                amount: parsedAmount,
                transferSpeed,
            });
            setEstimate(feeEstimate);
            setPhase('review');
        } catch {
            setErrorMessage('Failed to estimate bridge fees. Please try again.');
            setPhase('error');
        }
    }, [parsedAmount, mode, fromChainId, toChainId, transferSpeed]);

    const runBridge = useCallback(async () => {
        if (parsedAmount <= 0 || !estimate) return;

        setPhase('bridging');
        setProgressStep(null);
        setErrorMessage(null);

        try {
            const bridgeResult = await ExecuteBridge(
                {
                    direction: mode,
                    fromChainId,
                    toChainId,
                    amount: parsedAmount,
                    transferSpeed,
                },
                setProgressStep
            );
            setResult(bridgeResult);
            setPhase('success');
            
        } catch (error) {
            console.error('Bridge failed:', error);
            const errorMsg = error instanceof Error 
                ? error.message 
                : `Bridge failed. ${String(error)}`;
            setErrorMessage(errorMsg);
            setPhase('error');
        }
    }, [parsedAmount, estimate, mode, fromChainId, toChainId, transferSpeed]);

    const applySuggestedAmount = useCallback(() => {
        if (suggestedAmount && suggestedAmount > 0) {
            setAmount(String(suggestedAmount));
        }
    }, [suggestedAmount]);

    return {
        phase,
        fromChainId,
        toChainId,
        amount,
        transferSpeed,
        estimate,
        progressStep,
        result,
        errorMessage,
        parsedAmount,
        setFromChainId,
        setToChainId,
        setAmount,
        setTransferSpeed,
        setPhase,
        runEstimate,
        runBridge,
        reset,
        applySuggestedAmount,
    };
}
