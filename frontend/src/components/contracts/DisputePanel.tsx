'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { truncateAddress, formatUSDC } from '@/lib/utils';
import {
    AlertTriangle,
    Shield,
    Clock,
    ExternalLink,
    Users,
    MessageSquare,
    Scale,
} from 'lucide-react';

interface DisputePanelProps {
    contractAddress: string;
    client: string;
    freelancer: string;
    totalAmount: bigint;
    totalPaid: bigint;
    milestoneCount: number;
    funded: boolean;
}

/**
 * Panel displayed on the contract detail page when the contract is in DISPUTED status.
 * Shows dispute context, guidance for resolution, and links.
 */
export function DisputePanel({
    contractAddress,
    client,
    freelancer,
    totalAmount,
    totalPaid,
    milestoneCount,
    funded,
}: DisputePanelProps) {
    const remainingInEscrow = funded ? totalAmount - totalPaid : BigInt(0);

    return (
        <Card className="mb-8 border-2 border-red-200 bg-gradient-to-br from-red-50/50 to-amber-50/30 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/20">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Contract Disputed</h3>
                            <p className="text-red-100 text-sm">All milestone operations are frozen</p>
                        </div>
                    </div>
                    <Badge
                        variant="default"
                        className="bg-white/20 text-white border-white/30 text-xs font-bold"
                    >
                        <Clock className="w-3 h-3 mr-1" />
                        PENDING RESOLUTION
                    </Badge>
                </div>
            </div>

            <CardContent className="p-6 space-y-6">
                {/* Dispute Summary */}
                <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-neutral-100">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            Amount in Escrow
                        </div>
                        <p className="text-xl font-bold text-neutral-900">
                            {formatUSDC(remainingInEscrow)}
                        </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-neutral-100">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                            <Scale className="w-3.5 h-3.5" />
                            Already Paid
                        </div>
                        <p className="text-xl font-bold text-neutral-900">
                            {formatUSDC(totalPaid)}
                        </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-neutral-100">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Parties
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-neutral-600">
                                <span className="text-neutral-400">Client: </span>
                                <span className="font-mono">{truncateAddress(client)}</span>
                            </p>
                            <p className="text-xs text-neutral-600">
                                <span className="text-neutral-400">Freelancer: </span>
                                <span className="font-mono">{truncateAddress(freelancer)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* What Happens Now */}
                <div className="p-5 bg-white rounded-xl border border-neutral-100">
                    <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-red-500" />
                        What Happens Now?
                    </h4>
                    <div className="space-y-3">
                        <Step
                            number={1}
                            title="Communication"
                            description="Both parties should attempt to resolve the dispute directly. Share evidence and discuss the issues through your preferred communication channel."
                            active
                        />
                        <Step
                            number={2}
                            title="Mediation"
                            description="If direct communication fails, consider involving a neutral third-party mediator to help reach an agreement."
                        />
                        <Step
                            number={3}
                            title="Arbitration"
                            description="As a last resort, the dispute may need formal arbitration. On-chain arbitration features are coming soon."
                        />
                    </div>
                </div>

                {/* Actions / Links */}
                <div className="flex flex-wrap items-center gap-3">
                    <a
                        href={`https://testnet.arcscan.app/address/${contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ExternalLink className="w-4 h-4" />}
                        >
                            View on ArcScan
                        </Button>
                    </a>

                    <p className="text-xs text-neutral-400">
                        Funds ({formatUSDC(remainingInEscrow)} USDC) remain safely locked in the smart contract until resolution.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

/** Step item within the "What happens now" section */
function Step({
    number,
    title,
    description,
    active = false,
}: {
    number: number;
    title: string;
    description: string;
    active?: boolean;
}) {
    return (
        <div className="flex gap-3">
            <div
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active
                        ? 'bg-red-100 text-red-600 ring-2 ring-red-200'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
            >
                {number}
            </div>
            <div>
                <p className={`text-sm font-semibold ${active ? 'text-neutral-900' : 'text-neutral-500'}`}>
                    {title}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}
