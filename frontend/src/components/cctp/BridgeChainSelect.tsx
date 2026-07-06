'use client';

import { ARC_TESTNET_CHAIN, SOURCE_CHAINS } from '@/lib/cctp/chains';
import type { ChainOption } from '@/lib/cctp/types';
import { ChevronDown } from 'lucide-react';
import type { BridgeChainIdentifier } from "@circle-fin/bridge-kit";

interface BridgeChainSelectProps {
    label: string;
    value: string;
    onChange: (chainId: string) => void;
    disabled?: boolean;
    fixedChain?: ChainOption;
}

export function BridgeChainSelect({
    label,
    value,
    onChange,
    disabled = false,
    fixedChain,
}: BridgeChainSelectProps) {
    const options = fixedChain ? [fixedChain] : SOURCE_CHAINS;

    if (fixedChain) {
        return (
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">{label}</label>
                <div className="h-12 flex items-center px-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <span className="text-sm font-medium text-neutral-900">{fixedChain.label}</span>
                    <span className="ml-2 text-xs text-neutral-500">(fixed)</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 pr-10 text-neutral-900 appearance-none cursor-pointer transition-all duration-200 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {options.map((chain) => (
                        <option key={chain.id} value={chain.id}>
                            {chain.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                </div>
            </div>
        </div>
    );
}

export { ARC_TESTNET_CHAIN, SOURCE_CHAINS };
