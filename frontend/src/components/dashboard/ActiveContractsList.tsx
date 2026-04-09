'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { ContractStatus } from '@/types';

export interface ActiveContract {
    id: string;
    title: string;
    client: string;
    status: ContractStatus | 'draft' | 'in_review' | 'funded';
    currentMilestone?: {
        name: string;
        amount: number;
    };
    funded?: number;
    timeRemaining?: string;
    needsAction?: boolean;
}

interface ActiveContractsListProps {
    contracts: ActiveContract[];
    onContractClick?: (contract: ActiveContract) => void;
}

export function ActiveContractsList({ contracts, onContractClick }: ActiveContractsListProps) {
    const getStatusBadge = (status: ActiveContract['status']) => {
        switch (status) {
            case 'in_review':
                return (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100">
                        IN REVIEW
                    </span>
                );
            case ContractStatus.ACTIVE:
                return (
                    <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-[10px] font-bold border border-green-100">
                        ACTIVE
                    </span>
                );
            case 'funded':
                return (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                        FUNDED
                    </span>
                );
            case 'draft':
                return (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[10px] font-bold border border-neutral-200">
                        DRAFT
                    </span>
                );
            default:
                return null;
        }
    };

    const getContractIcon = (status: ActiveContract['status']) => {
        switch (status) {
            case 'in_review':
                return 'solar:code-square-linear';
            case 'funded':
                return 'solar:shield-warning-linear';
            case 'draft':
                return 'solar:pen-new-square-linear';
            default:
                return 'solar:document-text-linear';
        }
    };

    return (
        <div className="rounded-[32px] flex flex-col">
            <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">Active Contracts</h3>
                <Link href="/dashboard/client" className="text-xs font-semibold text-neutral-400 hover:text-blue-600 transition-colors">
                    View All
                </Link>
            </div>

            <div className="flex flex-col gap-3">
                {contracts.length === 0 ? (
                    <div className="bg-white rounded-[24px] p-6 border border-neutral-100 text-center">
                        <Icon icon="solar:document-add-linear" width={32} className="mx-auto mb-2 text-neutral-300" />
                        <p className="text-sm text-neutral-500">No active contracts</p>
                        <Link href="/create" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
                            Create your first contract
                        </Link>
                    </div>
                ) : (
                    contracts.map((contract, index) => {
                        const isExpanded = index === 0 && contract.needsAction;

                        if (isExpanded) {
                            return (
                                <div
                                    key={contract.id}
                                    className="bg-white rounded-[24px] p-1 border border-blue-100 shadow-sm transition-all duration-300 relative overflow-hidden cursor-pointer"
                                    onClick={() => onContractClick?.(contract)}
                                >
                                    {contract.needsAction && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                                    )}

                                    {/* Header */}
                                    <div className="p-4 pb-2 flex items-start justify-between">
                                        <div className="flex gap-4 items-start pl-2">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
                                                <Icon icon={getContractIcon(contract.status)} width={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-bold text-neutral-900 text-sm">{contract.title}</h4>
                                                </div>
                                                <div className="text-xs text-neutral-500 mt-1 font-medium">
                                                    Client: {contract.client}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            {getStatusBadge(contract.status)}
                                            {contract.timeRemaining && (
                                                <div className="text-[10px] font-mono text-neutral-400 mt-1">
                                                    {contract.timeRemaining}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    {contract.currentMilestone && (
                                        <div className="px-4 pb-4 pl-6">
                                            <div className="bg-neutral-50 rounded-xl p-3 mb-3 border border-neutral-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase">
                                                        Current Milestone
                                                    </span>
                                                    <span className="text-[10px] font-bold text-neutral-900">
                                                        ${contract.currentMilestone.amount.toLocaleString()} USDC
                                                    </span>
                                                </div>
                                                <div className="text-xs font-medium text-neutral-700">
                                                    {contract.currentMilestone.name}
                                                </div>
                                            </div>

                                            <Link href={`/contract/${contract.id}`}>
                                                <button className="w-full py-2 rounded-lg border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                                                    View Details
                                                    <Icon icon="solar:alt-arrow-right-linear" width={12} />
                                                </button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Compact version for non-priority contracts
                        return (
                            <Link key={contract.id} href={`/contract/${contract.id}`}>
                                <div className="bg-neutral-50 hover:bg-white border border-transparent hover:border-neutral-100 rounded-[24px] p-4 transition-all duration-200 cursor-pointer group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-200 flex items-center justify-center text-neutral-500 shrink-0 group-hover:scale-105 transition-transform group-hover:bg-neutral-800 group-hover:text-white">
                                                <Icon icon={getContractIcon(contract.status)} width={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-neutral-900 text-sm">{contract.title}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            contract.status === 'funded'
                                                                ? 'bg-green-500'
                                                                : contract.status === 'draft'
                                                                ? 'bg-neutral-300'
                                                                : 'bg-blue-500'
                                                        }`}
                                                    ></span>
                                                    <span className="text-xs text-neutral-500">
                                                        {contract.funded
                                                            ? `Funded: $${contract.funded.toLocaleString()}`
                                                            : contract.status === 'draft'
                                                            ? 'Draft'
                                                            : 'Active'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-neutral-400 group-hover:text-neutral-600 transition-colors">
                                            <Icon icon="solar:alt-arrow-right-linear" width={20} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

