import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftAddon?: React.ReactNode;
    rightAddon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, leftAddon, rightAddon, type = 'text', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-[0.5px] mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftAddon && (
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-neutral-400">{leftAddon}</span>
                        </div>
                    )}
                    <input
                        type={type}
                        ref={ref}
                        className={cn(
                            'w-full h-12 bg-white border rounded-xl px-4 text-neutral-900 placeholder-neutral-400 transition-all duration-200',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50',
                            error
                                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-neutral-200 hover:border-neutral-300',
                            leftAddon && 'pl-12',
                            rightAddon && 'pr-12',
                            className
                        )}
                        {...props}
                    />
                    {rightAddon && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <span className="text-neutral-400">{rightAddon}</span>
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-500">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-2 text-sm text-neutral-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
