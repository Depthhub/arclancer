'use client';

import React from 'react';
import { SUPPORTED_CURRENCIES } from '@/lib/contracts';

interface CurrencySelectorProps {
    value: string;
    onChange: (currency: string) => void;
    disabled?: boolean;
}

export function CurrencySelector({ value, onChange, disabled }: CurrencySelectorProps) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 pr-10 text-neutral-900 appearance-none cursor-pointer transition-all duration-200 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code} className="bg-white">
                        {currency.flag} {currency.code} - {currency.name}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}
