'use client';

import React from 'react';
import { Icon } from '@iconify/react';

interface PaymentsWithdrawCardProps {
    available: number;
    recentPayout?: {
        amount: number;
        currency: string;
    } | null;
    feePercentage?: number;
    onWithdraw?: () => void;
}

export function PaymentsWithdrawCard({
    available = 3200,
    recentPayout = { amount: 1200, currency: 'USDC' },
    feePercentage = 0.2,
    onWithdraw,
}: PaymentsWithdrawCardProps) {
    const fee = recentPayout ? (recentPayout.amount * feePercentage) / 100 : 0;

    return (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-between group shadow-xl shadow-neutral-900/10 h-full">
            {/* Abstract Deco */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500 rounded-full blur-[60px] opacity-10"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                        <Icon icon="solar:wallet-money-linear" width={22} />
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1">Available</div>
                        <div className="text-2xl font-bold text-white tracking-tight">${available.toLocaleString()}</div>
                    </div>
                </div>

                {/* Recent Tx */}
                {recentPayout && (
                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <div className="flex items-center gap-2 text-neutral-300">
                                <Icon icon="solar:card-transfer-linear" className="text-green-400" />
                                <span className="text-xs font-medium">Recent Payout</span>
                            </div>
                            <span className="text-xs font-bold text-white">
                                +${recentPayout.amount.toLocaleString()} {recentPayout.currency}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-neutral-400">
                            <span>Fee ({feePercentage}%)</span>
                            <span>${fee.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={onWithdraw}
                className="relative z-10 mt-2 bg-green-500 w-full py-3.5 px-6 rounded-full flex items-center justify-between text-xs font-bold text-white shadow-lg hover:bg-green-400 transition-all group/btn"
            >
                Withdraw Funds
                <Icon
                    icon="solar:arrow-right-linear"
                    width={16}
                    className="group-hover/btn:translate-x-1 transition-transform"
                />
            </button>
        </div>
    );
}



