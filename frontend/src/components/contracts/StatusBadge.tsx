'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { ContractStatus } from '@/types';

interface StatusBadgeProps {
    status: ContractStatus;
    size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG = {
    [ContractStatus.ACTIVE]: {
        label: 'Active',
        variant: 'info' as const,
        icon: Clock,
    },
    [ContractStatus.COMPLETED]: {
        label: 'Completed',
        variant: 'success' as const,
        icon: CheckCircle,
    },
    [ContractStatus.DISPUTED]: {
        label: 'Disputed',
        variant: 'error' as const,
        icon: AlertTriangle,
    },
    [ContractStatus.CANCELLED]: {
        label: 'Cancelled',
        variant: 'default' as const,
        icon: XCircle,
    },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG[ContractStatus.ACTIVE];
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} size={size}>
            <Icon className="w-3.5 h-3.5 mr-1.5" />
            {config.label}
        </Badge>
    );
}
