'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from './StatusBadge';
import { truncateAddress, formatUSDC } from '@/lib/utils';
import { ContractStatus, UserRole } from '@/types';
import { ArrowRight, User, Briefcase } from 'lucide-react';

interface ContractCardProps {
    contractAddress: string;
    client: string;
    freelancer: string;
    totalAmount: bigint;
    status: ContractStatus;
    milestonesCompleted: number;
    totalMilestones: number;
    role: UserRole;
}

export function ContractCard({
    contractAddress,
    client,
    freelancer,
    totalAmount,
    status,
    milestonesCompleted,
    totalMilestones,
    role,
}: ContractCardProps) {
    const progressPercentage = totalMilestones > 0
        ? Math.round((milestonesCompleted / totalMilestones) * 100)
        : 0;

    return (
        <Link href={`/contract/${contractAddress}`}>
            <Card variant="interactive" className="group">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-[0.5px] mb-1">Contract</p>
                        <p className="font-mono text-sm text-neutral-700">{truncateAddress(contractAddress, 6)}</p>
                    </div>
                    <StatusBadge status={status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                            <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">Client</p>
                            <p className="text-sm text-neutral-700">{truncateAddress(client)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-50">
                            <Briefcase className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">Freelancer</p>
                            <p className="text-sm text-neutral-700">{truncateAddress(freelancer)}</p>
                        </div>
                    </div>
                </div>

                {/* Amount */}
                <div className="mb-5">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-[0.5px] mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-neutral-900">{formatUSDC(totalAmount)}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-neutral-500">Progress</span>
                        <span className="text-xs text-neutral-600">
                            {milestonesCompleted}/{totalMilestones} milestones
                        </span>
                    </div>
                    <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* View Details */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <span className="text-sm text-neutral-500">
                        {role === 'client' ? 'You are the client' : role === 'freelancer' ? 'You are the freelancer' : 'Viewing'}
                    </span>
                    <div className="flex items-center text-blue-600 group-hover:text-blue-700 transition-colors">
                        <span className="text-sm font-medium">View Details</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </Card>
        </Link>
    );
}
