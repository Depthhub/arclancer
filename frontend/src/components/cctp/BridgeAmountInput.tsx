'use client';

import { Input } from '@/components/ui/Input';
import { formatDollars } from '@/lib/utils';

interface BridgeAmountInputProps {
    value: string;
    onChange: (value: string) => void;
    suggestedAmount?: number;
    onUseSuggested?: () => void;
    disabled?: boolean;
}

export function BridgeAmountInput({
    value,
    onChange,
    suggestedAmount,
    onUseSuggested,
    disabled = false,
}: BridgeAmountInputProps) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Amount (USDC)</label>
            <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            />
            {suggestedAmount != null && suggestedAmount > 0 && onUseSuggested && (
                <button
                    type="button"
                    onClick={onUseSuggested}
                    disabled={disabled}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                    Use suggested amount ({formatDollars(suggestedAmount)})
                </button>
            )}
        </div>
    );
}
