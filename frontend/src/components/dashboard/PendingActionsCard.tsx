'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@iconify/react';

export interface PendingAction {
    id: string;
    type: 'submit' | 'sign' | 'review' | 'approve';
    title: string;
    subtitle: string;
    urgency?: 'high' | 'normal';
    dueIn?: string;
    contractId?: string;
}

interface PendingActionsCardProps {
    actions: PendingAction[];
    onActionClick?: (action: PendingAction) => void;
}

export function PendingActionsCard({ actions, onActionClick }: PendingActionsCardProps) {
    const getActionIcon = (type: PendingAction['type']) => {
        switch (type) {
            case 'submit':
                return 'solar:clock-circle-linear';
            case 'sign':
                return 'solar:file-check-linear';
            case 'review':
                return 'solar:eye-linear';
            case 'approve':
                return 'solar:check-circle-linear';
            default:
                return 'solar:clock-circle-linear';
        }
    };

    const getActionColor = (type: PendingAction['type']) => {
        switch (type) {
            case 'submit':
                return 'bg-orange-50 text-orange-600';
            case 'sign':
                return 'bg-blue-50 text-blue-600';
            case 'review':
                return 'bg-purple-50 text-purple-600';
            case 'approve':
                return 'bg-green-50 text-green-600';
            default:
                return 'bg-neutral-50 text-neutral-600';
        }
    };

    const getButtonVariant = (type: PendingAction['type'], urgency?: string) => {
        if (urgency === 'high' || type === 'submit') return 'primary';
        return 'outline';
    };

    const getButtonLabel = (type: PendingAction['type']) => {
        switch (type) {
            case 'submit':
                return 'Submit';
            case 'sign':
                return 'Sign';
            case 'review':
                return 'Review';
            case 'approve':
                return 'Approve';
            default:
                return 'Action';
        }
    };

    return (
        <Card className="p-8 flex flex-col h-full rounded-[32px]">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">Pending Actions</h3>
                {actions.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">
                        {actions.length}
                    </span>
                )}
            </div>

            {actions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
                    <div className="text-center">
                        <Icon icon="solar:check-circle-linear" width={32} className="mx-auto mb-2 text-green-500" />
                        <p>All caught up!</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {actions.map((action) => (
                        <div key={action.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`relative flex items-center justify-center w-12 h-12 rounded-full ring-2 ring-white shadow-sm ${getActionColor(
                                        action.type
                                    )}`}
                                >
                                    <Icon icon={getActionIcon(action.type)} width={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="text-sm font-bold text-neutral-900">{action.title}</h4>
                                    </div>
                                    <p className="text-xs text-neutral-500 font-medium">
                                        {action.subtitle}
                                        {action.dueIn && ` • Due in ${action.dueIn}`}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant={getButtonVariant(action.type, action.urgency) as 'primary' | 'outline'}
                                size="sm"
                                onClick={() => onActionClick?.(action)}
                                className="rounded-full"
                            >
                                {getButtonLabel(action.type)}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}



