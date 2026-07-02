'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BridgeUsdcModal } from '@/components/cctp/BridgeUsdcModal';
import { isCctpUiEnabled } from '@/lib/cctp/featureFlag';
import type { BridgeDirection } from '@/lib/cctp/types';
import { ArrowRightLeft } from 'lucide-react';

interface BridgeUsdcCardProps {
    mode: BridgeDirection;
    suggestedAmount?: number;
    onBridgeSuccess?: () => void;
}

export function BridgeUsdcCard({ mode, suggestedAmount, onBridgeSuccess }: BridgeUsdcCardProps) {
    const [modalOpen, setModalOpen] = useState(false);

    if (!isCctpUiEnabled()) return null;

    const isInbound = mode === 'inbound';

    return (
        <>
            <Card variant="default" className="border-blue-100 bg-gradient-to-br from-blue-50/80 to-white">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-neutral-900">
                                {isInbound ? 'Bridge USDC to Arc' : 'Bridge USDC off Arc'}
                            </h3>
                        </div>
                        <p className="text-sm text-neutral-600">
                            {isInbound
                                ? 'Have USDC on another chain? Bridge to Arc with Circle CCTP, then fund escrow.'
                                : 'Move USDC from Arc to Ethereum, Base, or Polygon using Circle CCTP.'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setModalOpen(true)}
                        leftIcon={<ArrowRightLeft className="w-4 h-4" />}
                        className="shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        {isInbound ? 'Bridge to Arc' : 'Bridge out'}
                    </Button>
                </CardContent>
            </Card>

            <BridgeUsdcModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={mode}
                suggestedAmount={suggestedAmount}
                onSuccess={() => {
                    onBridgeSuccess?.();
                    setModalOpen(false);
                }}
            />
        </>
    );
}
