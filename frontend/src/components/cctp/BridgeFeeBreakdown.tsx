'use client';

import { formatDollars } from '@/lib/utils';
import type { BridgeFeeEstimate } from '@/lib/cctp/types';

interface BridgeFeeBreakdownProps {
    estimate: BridgeFeeEstimate;
    destinationLabel: string;
}

export function BridgeFeeBreakdown({ estimate, destinationLabel }: BridgeFeeBreakdownProps) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Estimated fees
            </p>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-neutral-600">Transfer amount</span>
                    <span className="font-medium text-neutral-900">
                        {formatDollars(estimate.transferAmount)} USDC
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-neutral-600">
                        CCTP protocol fee ({estimate.transferSpeed === 'FAST' ? 'Fast' : 'Standard'})
                    </span>
                    <span className="text-neutral-900">
                        ~{formatDollars(estimate.cctpProtocolFee)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-neutral-600">Source gas (est.)</span>
                    <span className="text-neutral-900">~{formatDollars(estimate.sourceGasUsd)}</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex justify-between">
                    <span className="font-medium text-neutral-900">You receive on {destinationLabel}</span>
                    <span className="font-bold text-green-700">
                        ~{formatDollars(estimate.receiveAmount)} USDC
                    </span>
                </div>
            </div>
            <p className="text-xs text-neutral-500">
                Powered by{' '}
                <a
                    href="https://developers.circle.com/bridge-kit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    Circle CCTP
                </a>
            </p>
        </div>
    );
}
