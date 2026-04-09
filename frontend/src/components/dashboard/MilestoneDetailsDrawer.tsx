'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';

export interface MilestoneDetails {
    contractId: string;
    contractTitle: string;
    status: 'in_review' | 'pending' | 'approved' | 'paid';
    milestoneIndex: number;
    totalMilestones: number;
    milestoneName: string;
    escrowBalance: number;
    progressPercent: number;
    autoReleaseTime?: string;
    acceptanceCriteria: {
        text: string;
        completed: boolean;
    }[];
    deliverables?: {
        name: string;
        uploadedAt: string;
        url?: string;
    }[];
    deliverableNote?: string;
    history: {
        event: string;
        timestamp: string;
        isActive?: boolean;
    }[];
}

interface MilestoneDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    milestone: MilestoneDetails | null;
    onApprove?: () => void;
    onRequestChanges?: () => void;
    onOpenDispute?: () => void;
    isClient?: boolean;
}

export function MilestoneDetailsDrawer({
    isOpen,
    onClose,
    milestone,
    onApprove,
    onRequestChanges,
    onOpenDispute,
    isClient = true,
}: MilestoneDetailsDrawerProps) {
    if (!milestone) return null;

    const getStatusBadge = () => {
        switch (milestone.status) {
            case 'in_review':
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        IN REVIEW
                    </span>
                );
            case 'pending':
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        PENDING
                    </span>
                );
            case 'approved':
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                        APPROVED
                    </span>
                );
            case 'paid':
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        PAID
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 w-full md:w-[480px] h-full bg-white shadow-2xl z-50 border-l border-neutral-100 flex flex-col transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Drawer Header */}
                <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge()}
                            <span className="text-xs text-neutral-400 font-mono">
                                ID: #{milestone.contractId.slice(-4)}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-neutral-900">{milestone.contractTitle}</h2>
                        <p className="text-xs text-neutral-500">
                            Milestone {milestone.milestoneIndex + 1} of {milestone.totalMilestones} •{' '}
                            {milestone.milestoneName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-all"
                    >
                        <Icon icon="solar:close-circle-linear" width={20} />
                    </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Escrow Status */}
                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-blue-900">Escrow Balance</span>
                            <span className="text-lg font-bold text-blue-600">
                                ${milestone.escrowBalance.toLocaleString()} USDC
                            </span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-1.5 mb-2">
                            <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${milestone.progressPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-blue-400 font-medium">
                            <span>Funded</span>
                            {milestone.autoReleaseTime && <span>Auto-release: {milestone.autoReleaseTime}</span>}
                        </div>
                    </div>

                    {/* Acceptance Criteria */}
                    <h3 className="text-sm font-bold text-neutral-900 mb-3">Acceptance Criteria</h3>
                    <div className="space-y-2 mb-6">
                        {milestone.acceptanceCriteria.map((criteria, index) => (
                            <label
                                key={index}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                                    criteria.completed
                                        ? 'border-neutral-100 bg-neutral-50/50'
                                        : 'border-neutral-100 bg-white'
                                }`}
                            >
                                {criteria.completed ? (
                                    <input
                                        type="checkbox"
                                        checked
                                        disabled
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-neutral-300"></div>
                                )}
                                <span
                                    className={`text-xs ${
                                        criteria.completed
                                            ? 'text-neutral-600 line-through opacity-70'
                                            : 'text-neutral-900 font-medium'
                                    }`}
                                >
                                    {criteria.text}
                                </span>
                            </label>
                        ))}
                    </div>

                    {/* Deliverables */}
                    {milestone.deliverables && milestone.deliverables.length > 0 && (
                        <>
                            <h3 className="text-sm font-bold text-neutral-900 mb-3">Deliverables</h3>
                            <div className="p-4 rounded-xl border border-neutral-200 bg-white mb-6">
                                {milestone.deliverables.map((deliverable, index) => (
                                    <div key={index} className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                                            <Icon icon="solar:file-linear" width={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-neutral-900">
                                                {deliverable.name}
                                            </div>
                                            <div className="text-[10px] text-neutral-400">
                                                Uploaded {deliverable.uploadedAt}
                                            </div>
                                        </div>
                                        {deliverable.url && (
                                            <a
                                                href={deliverable.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 text-xs font-bold hover:underline"
                                            >
                                                View
                                            </a>
                                        )}
                                    </div>
                                ))}
                                {milestone.deliverableNote && (
                                    <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                        "{milestone.deliverableNote}"
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* History */}
                    <h3 className="text-sm font-bold text-neutral-900 mb-3">History</h3>
                    <div className="border-l-2 border-neutral-100 ml-2 space-y-4 pl-4 pb-2">
                        {milestone.history.map((item, index) => (
                            <div key={index} className="relative">
                                <div
                                    className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white ${
                                        item.isActive ? 'bg-amber-500' : 'bg-neutral-300'
                                    }`}
                                />
                                <div
                                    className={`text-xs font-bold ${
                                        item.isActive ? 'text-neutral-900' : 'text-neutral-500'
                                    }`}
                                >
                                    {item.event}
                                </div>
                                <div className="text-[10px] text-neutral-400">{item.timestamp}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Drawer Footer (Actions) */}
                <div className="p-6 border-t border-neutral-100 bg-white space-y-3">
                    {isClient && milestone.status === 'in_review' && (
                        <>
                            <Button onClick={onApprove} className="w-full rounded-full">
                                Approve Release
                            </Button>
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" onClick={onRequestChanges} className="rounded-full text-xs">
                                    Request Changes
                                </Button>
                                <button
                                    onClick={onOpenDispute}
                                    className="py-3 rounded-full border border-red-100 text-red-500 text-xs font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-1"
                                >
                                    <Icon icon="solar:danger-triangle-linear" />
                                    Open Dispute
                                </button>
                            </div>
                        </>
                    )}
                    {!isClient && (
                        <Link href={`/contract/${milestone.contractId}`} className="block">
                            <Button className="w-full rounded-full">View Full Contract</Button>
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}



