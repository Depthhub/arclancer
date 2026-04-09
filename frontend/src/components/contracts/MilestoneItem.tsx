'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatUSDC, formatRelativeTime, formatDate } from '@/lib/utils';
import { Milestone, UserRole } from '@/types';
import {
    CheckCircle,
    Circle,
    Upload,
    Clock,
    DollarSign,
    ExternalLink,
    FileText
} from 'lucide-react';

interface MilestoneItemProps {
    milestone: Milestone;
    index: number;
    role: UserRole;
    onSubmit?: (index: number, uri: string) => void;
    onApprove?: (index: number) => void;
    onRelease?: (index: number) => void;
    canAutoApprove?: boolean;
    onAutoApprove?: (index: number) => void;
    isPending?: boolean;
}

export function MilestoneItem({
    milestone,
    index,
    role,
    onSubmit,
    onApprove,
    onRelease,
    canAutoApprove,
    onAutoApprove,
    isPending,
}: MilestoneItemProps) {
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [deliverableUri, setDeliverableUri] = useState('');

    const getStatus = () => {
        if (milestone.paid) return { label: 'Paid', color: 'success' as const, icon: CheckCircle };
        if (milestone.approved) return { label: 'Approved', color: 'info' as const, icon: CheckCircle };
        if (milestone.submitted) return { label: 'Submitted', color: 'warning' as const, icon: Clock };
        return { label: 'Pending', color: 'default' as const, icon: Circle };
    };

    const status = getStatus();
    const StatusIcon = status.icon;

    const handleSubmit = () => {
        if (onSubmit && deliverableUri) {
            onSubmit(index, deliverableUri);
            setShowSubmitModal(false);
            setDeliverableUri('');
        }
    };

    return (
        <Card variant="default" padding="md" className="relative overflow-hidden">
            {/* Left accent bar */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${milestone.paid ? 'bg-green-500' :
                    milestone.approved ? 'bg-blue-500' :
                        milestone.submitted ? 'bg-amber-500' :
                            'bg-neutral-300'
                    }`}
            />

            <div className="pl-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-medium text-neutral-500">Milestone {index + 1}</span>
                            <Badge variant={status.color} size="sm">
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                            </Badge>
                        </div>
                        <p className="text-neutral-900 font-medium">{milestone.description}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-neutral-500 mb-1">Amount</p>
                        <p className="text-lg font-bold text-neutral-900">{formatUSDC(milestone.amount)}</p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${milestone.submitted ? 'bg-blue-500' : 'bg-neutral-200'
                            }`}>
                            <FileText className={`w-3 h-3 ${milestone.submitted ? 'text-white' : 'text-neutral-400'}`} />
                        </div>
                        <span className="text-xs text-neutral-500">
                            {milestone.submitted ? formatRelativeTime(Number(milestone.submittedAt)) : 'Not submitted'}
                        </span>
                    </div>
                    <div className="h-px flex-1 bg-neutral-200" />
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${milestone.approved ? 'bg-green-500' : 'bg-neutral-200'
                            }`}>
                            <CheckCircle className={`w-3 h-3 ${milestone.approved ? 'text-white' : 'text-neutral-400'}`} />
                        </div>
                        <span className="text-xs text-neutral-500">
                            {milestone.approved ? formatRelativeTime(Number(milestone.approvedAt)) : 'Not approved'}
                        </span>
                    </div>
                    <div className="h-px flex-1 bg-neutral-200" />
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${milestone.paid ? 'bg-green-500' : 'bg-neutral-200'
                            }`}>
                            <DollarSign className={`w-3 h-3 ${milestone.paid ? 'text-white' : 'text-neutral-400'}`} />
                        </div>
                        <span className="text-xs text-neutral-500">
                            {milestone.paid ? 'Paid' : 'Pending'}
                        </span>
                    </div>
                </div>

                {/* Deliverable Link */}
                {milestone.submitted && milestone.deliverableURI && (
                    <div className="mb-4 p-3 bg-neutral-100 rounded-lg">
                        <p className="text-xs text-neutral-500 mb-1">Deliverable</p>
                        <a
                            href={`https://ipfs.io/ipfs/${milestone.deliverableURI}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            {milestone.deliverableURI.slice(0, 20)}...
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {/* Freelancer: Submit Work */}
                    {role === 'freelancer' && !milestone.submitted && (
                        <>
                            {!showSubmitModal ? (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Upload className="w-4 h-4" />}
                                    onClick={() => setShowSubmitModal(true)}
                                >
                                    Submit Deliverable
                                </Button>
                            ) : (
                                <div className="flex gap-2 w-full">
                                    <input
                                        type="text"
                                        placeholder="Enter IPFS hash or URL..."
                                        value={deliverableUri}
                                        onChange={(e) => setDeliverableUri(e.target.value)}
                                        className="flex-1 h-9 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder-neutral-400"
                                    />
                                    <Button size="sm" onClick={handleSubmit} isLoading={isPending}>
                                        Submit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowSubmitModal(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Client: Approve */}
                    {role === 'client' && milestone.submitted && !milestone.approved && (
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCircle className="w-4 h-4" />}
                            onClick={() => onApprove?.(index)}
                            isLoading={isPending}
                        >
                            Approve Milestone
                        </Button>
                    )}

                    {/* Anyone: Auto-approve */}
                    {canAutoApprove && !milestone.approved && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onAutoApprove?.(index)}
                            isLoading={isPending}
                        >
                            Auto-Approve (7 days passed)
                        </Button>
                    )}

                    {/* Freelancer: Withdraw via Dashboard */}
                    {role === 'freelancer' && milestone.approved && !milestone.paid && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700">
                                Ready to withdraw! Use <strong>Withdraw Funds</strong> from Dashboard to select currency.
                            </span>
                        </div>
                    )}

                    {/* Client: See status */}
                    {role === 'client' && milestone.approved && !milestone.paid && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-700">
                                Approved! Awaiting freelancer withdrawal.
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
