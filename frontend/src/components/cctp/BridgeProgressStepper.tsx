'use client';

import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import type { BridgeProgressStep } from '@/lib/cctp/types';
import { cn } from '@/lib/utils';

const STEPS: { id: BridgeProgressStep; label: string; description: string }[] = [
    { id: 'approve', label: 'Approve USDC', description: 'Allow CCTP to spend USDC on source chain' },
    { id: 'burn', label: 'Burn on source', description: 'USDC burned via Circle CCTP' },
    { id: 'fetchAttestation', label: 'Attestation', description: 'Circle verifies the cross-chain message' },
    { id: 'mint', label: 'Mint on destination', description: 'USDC minted to your wallet' },
];

interface BridgeProgressStepperProps {
    activeStep: BridgeProgressStep | null;
    completedSteps: BridgeProgressStep[];
}

export function BridgeProgressStepper({ activeStep, completedSteps }: BridgeProgressStepperProps) {
    return (
        <div className="space-y-4">
            {STEPS.map((step, index) => {
                const isComplete = completedSteps.includes(step.id);
                const isActive = activeStep === step.id;
                const isPending = !isComplete && !isActive;

                return (
                    <div key={step.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            {isComplete ? (
                                <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                            ) : isActive ? (
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin shrink-0" />
                            ) : (
                                <Circle className="w-6 h-6 text-neutral-300 shrink-0" />
                            )}
                            {index < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        'w-0.5 flex-1 min-h-[24px] mt-1',
                                        isComplete ? 'bg-green-300' : 'bg-neutral-200'
                                    )}
                                />
                            )}
                        </div>
                        <div className={cn('pb-4', isPending && 'opacity-50')}>
                            <p className="text-sm font-medium text-neutral-900">{step.label}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{step.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function getCompletedSteps(activeStep: BridgeProgressStep | null): BridgeProgressStep[] {
    if (!activeStep) return [];
    const order: BridgeProgressStep[] = ['approve', 'burn', 'fetchAttestation', 'mint'];
    const idx = order.indexOf(activeStep);
    return order.slice(0, idx);
}
