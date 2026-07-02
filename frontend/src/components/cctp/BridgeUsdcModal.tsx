'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCctpBridgeUi } from '@/hooks/useCctpBridgeUi';
import { ARC_TESTNET_CHAIN, BridgeChainSelect } from '@/components/cctp/BridgeChainSelect';
import { BridgeAmountInput } from '@/components/cctp/BridgeAmountInput';
import { BridgeFeeBreakdown } from '@/components/cctp/BridgeFeeBreakdown';
import {
    BridgeProgressStepper,
    getCompletedSteps,
} from '@/components/cctp/BridgeProgressStepper';
import { getChainById } from '@/lib/cctp/chains';
import type { BridgeDirection } from '@/lib/cctp/types';
import { formatDollars, truncateAddress } from '@/lib/utils';
import {
    X,
    ArrowRightLeft,
    CheckCircle,
    AlertCircle,
    Loader2,
    ExternalLink,
} from 'lucide-react';

export interface BridgeUsdcModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: BridgeDirection;
    suggestedAmount?: number;
    onSuccess?: () => void;
}

export function BridgeUsdcModal({
    isOpen,
    onClose,
    mode,
    suggestedAmount,
    onSuccess,
}: BridgeUsdcModalProps) {
    const bridge = useCctpBridgeUi({ mode, suggestedAmount });

    useEffect(() => {
        if (isOpen) {
            bridge.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode]);

    if (!isOpen) return null;

    const isBridging = bridge.phase === 'bridging';
    const canClose = !isBridging;

    const handleClose = () => {
        if (canClose) {
            bridge.reset();
            onClose();
        }
    };

    const fromChain = getChainById(bridge.fromChainId);
    const toChain = getChainById(bridge.toChainId);
    const destLabel = toChain?.label ?? 'destination';

    const title = mode === 'inbound' ? 'Bridge USDC to Arc' : 'Bridge USDC from Arc';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
                aria-hidden
            />
            <Card
                variant="elevated"
                padding="none"
                className="relative w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl z-10"
            >
                <CardHeader className="p-6 pb-0 flex flex-row items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                            <CardTitle>{title}</CardTitle>
                        </div>
                        <Badge variant="default" className="text-xs">
                            Circle CCTP
                        </Badge>
                    </div>
                    {canClose && (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    {/* Configure */}
                    {(bridge.phase === 'configure' || bridge.phase === 'estimating') && (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <BridgeChainSelect
                                    label="From"
                                    value={bridge.fromChainId}
                                    onChange={bridge.setFromChainId}
                                    disabled={mode === 'outbound'}
                                    fixedChain={mode === 'outbound' ? ARC_TESTNET_CHAIN : undefined}
                                />
                                <BridgeChainSelect
                                    label="To"
                                    value={bridge.toChainId}
                                    onChange={bridge.setToChainId}
                                    disabled={mode === 'inbound'}
                                    fixedChain={mode === 'inbound' ? ARC_TESTNET_CHAIN : undefined}
                                />
                            </div>

                            <BridgeAmountInput
                                value={bridge.amount}
                                onChange={bridge.setAmount}
                                suggestedAmount={suggestedAmount}
                                onUseSuggested={bridge.applySuggestedAmount}
                                disabled={bridge.phase === 'estimating'}
                            />

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Transfer speed
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => bridge.setTransferSpeed('SLOW')}
                                        className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                                            bridge.transferSpeed === 'SLOW'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                                        }`}
                                    >
                                        Standard
                                        <span className="block text-xs font-normal opacity-80">
                                            Lower fees
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => bridge.setTransferSpeed('FAST')}
                                        className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                                            bridge.transferSpeed === 'FAST'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                                        }`}
                                    >
                                        Fast
                                        <span className="block text-xs font-normal opacity-80">
                                            ~1 bps fee
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {mode === 'inbound' && fromChain && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                                    Switch to <strong>{fromChain.label}</strong> in your wallet
                                    before bridging.
                                </div>
                            )}

                            <Button
                                className="w-full"
                                onClick={bridge.runEstimate}
                                isLoading={bridge.phase === 'estimating'}
                                disabled={bridge.parsedAmount <= 0}
                            >
                                Review fees
                            </Button>
                        </>
                    )}

                    {/* Review */}
                    {bridge.phase === 'review' && bridge.estimate && (
                        <>
                            <BridgeFeeBreakdown
                                estimate={bridge.estimate}
                                destinationLabel={destLabel}
                            />
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => bridge.setPhase('configure')}
                                >
                                    Back
                                </Button>
                                <Button className="flex-1" onClick={bridge.runBridge}>
                                    Confirm bridge
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Progress */}
                    {bridge.phase === 'bridging' && (
                        <>
                            {fromChain && mode === 'inbound' && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                                    Confirm transactions in your wallet on{' '}
                                    <strong>{fromChain.label}</strong>.
                                </div>
                            )}
                            <BridgeProgressStepper
                                activeStep={bridge.progressStep}
                                completedSteps={getCompletedSteps(bridge.progressStep)}
                            />
                        </>
                    )}

                    {/* Success */}
                    {bridge.phase === 'success' && bridge.result && (
                        <div className="text-center space-y-4">
                            <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
                            <div>
                                <p className="text-lg font-semibold text-neutral-900">
                                    Bridge complete
                                </p>
                                <p className="text-sm text-neutral-600 mt-1">
                                    ~{formatDollars(bridge.result.receiveAmount)} USDC on{' '}
                                    {bridge.result.toChain}
                                </p>
                            </div>
                            <div className="text-left p-4 bg-neutral-50 rounded-xl text-sm space-y-1">
                                <p>
                                    <span className="text-neutral-500">From:</span>{' '}
                                    {bridge.result.fromChain}
                                </p>
                                <p>
                                    <span className="text-neutral-500">To:</span>{' '}
                                    {bridge.result.toChain}
                                </p>
                                <p className="flex items-center gap-1">
                                    <span className="text-neutral-500">Tx:</span>{' '}
                                    {truncateAddress(bridge.result.txHash, 6)}
                                    <a
                                        href={bridge.result.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {mode === 'inbound' && onSuccess && (
                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            onSuccess();
                                            handleClose();
                                        }}
                                    >
                                        Fund escrow now
                                    </Button>
                                )}
                                <Button
                                    variant={mode === 'inbound' && onSuccess ? 'outline' : 'primary'}
                                    className="w-full"
                                    onClick={handleClose}
                                >
                                    {mode === 'outbound' ? 'Done' : 'Close'}
                                </Button>
                                <a
                                    href={bridge.result.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    View on explorer
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {bridge.phase === 'error' && (
                        <div className="text-center space-y-4">
                            <AlertCircle className="w-14 h-14 text-red-500 mx-auto" />
                            <p className="text-neutral-900 font-medium">Bridge failed</p>
                            <p className="text-sm text-neutral-600">
                                {bridge.errorMessage ??
                                    'Something went wrong. Check your balance and network, then try again.'}
                            </p>
                            <Button className="w-full" onClick={bridge.reset}>
                                Try again
                            </Button>
                        </div>
                    )}

                    {bridge.phase === 'estimating' && (
                        <div className="flex items-center justify-center gap-2 text-neutral-500 py-4">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Estimating fees…</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
