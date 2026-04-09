'use client';

import React from 'react';
import { formatRelativeTime, truncateAddress } from '@/lib/utils';
import { ContractEvent } from '@/types';
import {
    FileText,
    DollarSign,
    CheckCircle,
    AlertTriangle,
    Flag,
    Clock,
    Wallet
} from 'lucide-react';

interface ContractTimelineProps {
    events: ContractEvent[];
}

const eventConfig: Record<ContractEvent['type'], {
    icon: typeof FileText;
    color: string;
    bgColor: string;
    label: string;
}> = {
    CREATED: {
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        label: 'Contract Created',
    },
    FUNDED: {
        icon: Wallet,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Contract Funded',
    },
    MILESTONE_SUBMITTED: {
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: 'Milestone Submitted',
    },
    MILESTONE_APPROVED: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Milestone Approved',
    },
    PAYMENT_RELEASED: {
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Payment Released',
    },
    COMPLETED: {
        icon: Flag,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        label: 'Contract Completed',
    },
    DISPUTED: {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: 'Dispute Initiated',
    },
};

export function ContractTimeline({ events }: ContractTimelineProps) {
    if (!events || events.length === 0) {
        return (
            <div className="text-center py-8 text-neutral-400">
                No events recorded yet
            </div>
        );
    }

    // Sort events by timestamp (newest first)
    const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200" />

            <div className="space-y-6">
                {sortedEvents.map((event, index) => {
                    const config = eventConfig[event.type];
                    const Icon = config.icon;
                    const isLatest = index === 0;

                    return (
                        <div key={`${event.type}-${event.timestamp}-${index}`} className="relative flex gap-4">
                            {/* Icon */}
                            <div
                                className={`
                                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                                    ${config.bgColor} ${isLatest ? 'ring-2 ring-offset-2 ring-offset-white' : ''}
                                    ${isLatest ? config.color.replace('text-', 'ring-') : ''}
                                `}
                            >
                                <Icon className={`w-5 h-5 ${config.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-2">
                                <div className="bg-neutral-100 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className={`font-medium ${isLatest ? 'text-neutral-900' : 'text-neutral-700'}`}>
                                                {config.label}
                                                {event.milestoneIndex !== undefined && (
                                                    <span className="text-neutral-500 ml-1">
                                                        #{event.milestoneIndex + 1}
                                                    </span>
                                                )}
                                            </p>
                                            {event.actor && (
                                                <p className="text-sm text-neutral-500 mt-1">
                                                    By: <span className="font-mono">{truncateAddress(event.actor)}</span>
                                                </p>
                                            )}
                                            {event.amount !== undefined && (
                                                <p className="text-sm text-green-600 mt-1">
                                                    ${(event.amount / 1e6).toLocaleString()} USDC
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-neutral-500">
                                                {formatRelativeTime(event.timestamp)}
                                            </p>
                                            <p className="text-xs text-neutral-400 mt-1">
                                                {new Date(event.timestamp * 1000).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
