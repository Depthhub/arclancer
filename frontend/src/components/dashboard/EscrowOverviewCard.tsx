'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@iconify/react';

interface EscrowOverviewCardProps {
    activeContracts: number;
    pendingActions: number;
    inEscrow: number;
    available: number;
    avgPayoutDays: number;
    /** Per-day dollar values for S M T W T F S (7 entries). Defaults to all zeros. */
    dailyValues?: number[];
}

export function EscrowOverviewCard({
    activeContracts = 0,
    pendingActions = 0,
    inEscrow = 0,
    available = 0,
    avgPayoutDays = 2.4,
    dailyValues,
}: EscrowOverviewCardProps) {
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
    const todayIndex = new Date().getDay(); // 0 = Sun … 6 = Sat

    // ─── hovered day (null = only today is highlighted) ───
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // ─── Normalise daily values ───
    const values = React.useMemo(() => {
        const raw = Array.isArray(dailyValues) ? dailyValues.slice(0, 7) : [];
        while (raw.length < 7) raw.push(0);
        return raw.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
    }, [dailyValues]);

    // ─── Compute chart scale from actual data ───
    const { minVal, maxVal } = React.useMemo(() => {
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { minVal: min, maxVal: max };
    }, [values]);

    const CHART_TOP = 12;   // px from the top of the chart area
    const CHART_BOT = 120;  // px — lowest dot position

    /**
     * Map a dollar value → a top-offset in px.
     * When all values are 0 (or equal), every dot sits at the bottom.
     */
    const valueToTop = (v: number): number => {
        if (maxVal === minVal) return CHART_BOT; // flat baseline
        const ratio = (v - minVal) / (maxVal - minVal); // 0 → 1
        return Math.round(CHART_BOT - ratio * (CHART_BOT - CHART_TOP));
    };

    const formatCurrency = (n: number) =>
        `$${Math.round(n).toLocaleString()}`;

    // Determine which index to show the tooltip for (hover takes priority)
    const activeIndex = hoveredIndex ?? todayIndex;

    return (
        <Card className="p-8 relative overflow-hidden rounded-[32px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-4">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon icon="solar:safe-circle-linear" width={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Escrow Overview</h2>
                        <p className="text-neutral-500 text-sm mt-1 max-w-sm leading-relaxed">
                            Track locked funds, pending releases, and availability.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">In Escrow</div>
                        <div className="text-sm font-bold text-neutral-900">${inEscrow.toLocaleString()}</div>
                    </div>
                    <div className="w-[1px] h-8 bg-neutral-100 hidden sm:block"></div>
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Available</div>
                        <div className="text-sm font-bold text-green-600">${available.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-end">
                {/* Stat Block */}
                <div className="mb-2 lg:mb-8 lg:w-1/4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold tracking-tight text-neutral-900">{activeContracts}</span>
                        <span className="text-sm font-medium text-neutral-500">Active Contracts</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        {pendingActions > 0 && (
                            <Badge variant="warning" size="sm" className="text-[10px] font-bold uppercase">
                                {pendingActions} Pending Action{pendingActions !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                    <p className="text-neutral-500 text-xs mt-3 leading-relaxed font-medium">
                        Avg. payout time: <span className="text-neutral-900 font-semibold">{avgPayoutDays} days</span>
                    </p>
                </div>

                {/* ─── Chart Block (Daily Trend) ─── */}
                <div className="flex-1 w-full px-2 sm:px-8">
                    <div className="relative h-[180px] flex items-end justify-between gap-0">
                        {values.map((value, index) => {
                            const isHighlighted = index === activeIndex;
                            const dotTopPx = valueToTop(value);

                            return (
                                <div
                                    key={index}
                                    className="relative flex-1 flex flex-col items-center"
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {/* Highlight column — full width of the flex-1 slot */}
                                    {isHighlighted && (
                                        <div className="absolute inset-x-0 top-0 bottom-0 rounded-[20px] bg-neutral-100/70 transition-opacity duration-150" />
                                    )}

                                    {/* Tooltip bubble */}
                                    {isHighlighted && (
                                        <div
                                            className="absolute z-20 left-1/2 -translate-x-1/2"
                                            style={{ top: Math.max(dotTopPx - 42, 0) }}
                                        >
                                            <div className="bg-neutral-900 text-white text-xs font-bold py-1.5 px-3 rounded-full shadow-lg whitespace-nowrap">
                                                {value === 0 ? '$0' : formatCurrency(value)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dot + stem */}
                                    <div className="relative z-10 h-[140px] w-full flex items-start justify-center">
                                        {/* Stem */}
                                        <div
                                            className="absolute w-[2px] bg-neutral-200 rounded-full"
                                            style={{
                                                top: dotTopPx + 10,
                                                height: Math.max(0, CHART_BOT - dotTopPx),
                                            }}
                                        />
                                        {/* Dot */}
                                        <div
                                            className={`absolute w-3 h-3 rounded-full transition-transform duration-150 ${isHighlighted ? 'bg-blue-600 scale-125' : 'bg-blue-500'
                                                }`}
                                            style={{ top: dotTopPx, left: '50%', marginLeft: -6 }}
                                        />
                                    </div>

                                    {/* Day label */}
                                    <div className="relative z-10 mt-2">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border transition-colors duration-150 ${isHighlighted
                                                    ? 'bg-neutral-900 text-white border-neutral-900'
                                                    : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                                                }`}
                                        >
                                            {dayLabels[index]}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Card>
    );
}
