import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            // Primary: Dark background, white text (matches design)
            primary: 'bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white focus:ring-neutral-900 shadow-lg shadow-neutral-200',
            // Secondary: Light gray background
            secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 focus:ring-neutral-200 border border-neutral-200',
            // Outline: Transparent with border
            outline: 'border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-200',
            // Ghost: No background
            ghost: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:ring-neutral-200',
            // Danger: Red
            danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
        };

        const sizes = {
            sm: 'h-9 px-4 text-sm rounded-lg gap-2',
            md: 'h-11 px-5 text-sm rounded-xl gap-2',
            lg: 'h-12 px-6 text-base rounded-xl gap-3',
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : leftIcon ? (
                    leftIcon
                ) : null}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
