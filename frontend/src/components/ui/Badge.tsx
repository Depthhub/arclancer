import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
    size?: 'sm' | 'md' | 'lg';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center font-medium rounded-full';

        const variants = {
            // Default: Subtle gray background
            default: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
            // Success: Green
            success: 'bg-green-50 text-green-700 border border-green-200',
            // Warning: Yellow/Amber
            warning: 'bg-amber-50 text-amber-700 border border-amber-200',
            // Error: Red
            error: 'bg-red-50 text-red-700 border border-red-200',
            // Info: Blue
            info: 'bg-blue-50 text-blue-700 border border-blue-200',
            // Accent: Blue (primary)
            accent: 'bg-blue-50 text-blue-600 border border-blue-200',
        };

        const sizes = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-3 py-1 text-sm',
            lg: 'px-4 py-1.5 text-sm',
        };

        return (
            <span
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                {...props}
            >
                {children}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

export { Badge };
