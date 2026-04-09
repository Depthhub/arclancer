'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@iconify/react';

interface ResolutionCenterCardProps {
    activeDisputes?: number;
    completedContracts?: number;
    reputationScore?: number;
    disputedContractAddresses?: string[];
}

export function ResolutionCenterCard({
    activeDisputes = 0,
    completedContracts = 12,
    reputationScore = 100,
    disputedContractAddresses = [],
}: ResolutionCenterCardProps) {
    const isGoodStanding = activeDisputes === 0 && reputationScore >= 90;

    return (
        <Card className="p-6 rounded-[32px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Resolution Center</h3>
                <div
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border ${isGoodStanding
                            ? 'text-green-600 bg-green-50 border-green-100'
                            : 'text-amber-600 bg-amber-50 border-amber-100'
                        }`}
                >
                    <Icon icon={isGoodStanding ? 'solar:shield-check-linear' : 'solar:shield-warning-linear'} width={12} />
                    {isGoodStanding ? 'GOOD STANDING' : 'NEEDS ATTENTION'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Active Disputes */}
                <div className="group">
                    <div className="text-[10px] text-neutral-400 font-semibold mb-1 uppercase">Active Disputes</div>
                    <div className="text-xl font-bold text-neutral-900 mb-2">{activeDisputes}</div>
                    <p className="text-[10px] text-neutral-500 leading-tight">
                        {activeDisputes === 0
                            ? `No open cases. Your reputation is ${reputationScore}%.`
                            : `${activeDisputes} case${activeDisputes > 1 ? 's' : ''} need${activeDisputes === 1 ? 's' : ''} resolution.`}
                    </p>

                    {/* Quick links to disputed contracts */}
                    {disputedContractAddresses.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {disputedContractAddresses.slice(0, 3).map((addr) => (
                                <Link
                                    key={addr}
                                    href={`/contract/${addr}`}
                                    className="block text-[10px] font-mono text-red-500 hover:text-red-700 hover:underline transition-colors"
                                >
                                    {addr.slice(0, 8)}…{addr.slice(-6)} →
                                </Link>
                            ))}
                            {disputedContractAddresses.length > 3 && (
                                <p className="text-[10px] text-neutral-400">
                                    +{disputedContractAddresses.length - 3} more
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Completed */}
                <div className="border-l border-neutral-100 pl-4 group">
                    <div className="text-[10px] text-neutral-400 font-semibold mb-1 uppercase">Completed</div>
                    <div className="text-xl font-bold text-neutral-900 mb-2">{completedContracts}</div>
                    {/* Mini chart */}
                    <div className="flex items-end gap-[2px] h-6 opacity-60">
                        <div className="w-1 bg-green-500 rounded-full h-[40%]"></div>
                        <div className="w-1 bg-green-500 rounded-full h-[60%]"></div>
                        <div className="w-1 bg-green-500 rounded-full h-[30%]"></div>
                        <div className="w-1 bg-green-500 rounded-full h-[80%]"></div>
                        <div className="w-1 bg-green-500 rounded-full h-[50%]"></div>
                        <div className="w-1 bg-green-500 rounded-full h-[90%]"></div>
                    </div>
                </div>
            </div>
        </Card>
    );
}


