'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, X, Shield, MessageSquare } from 'lucide-react';

interface DisputeConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isPending: boolean;
    contractAddress: string;
}

/**
 * Confirmation modal shown before initiating a dispute.
 * Requires the user to provide a reason and explicitly confirm.
 */
export function DisputeConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    isPending,
    contractAddress,
}: DisputeConfirmModalProps) {
    const [reason, setReason] = useState('');
    const [confirmed, setConfirmed] = useState(false);

    if (!isOpen) return null;

    const canSubmit = reason.trim().length >= 10 && confirmed;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onConfirm(reason.trim());
    };

    const handleClose = () => {
        setReason('');
        setConfirmed(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-50 to-amber-50 p-6 border-b border-red-100">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-red-100">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-neutral-900">Initiate Dispute</h2>
                                <p className="text-sm text-neutral-500">{contractAddress.slice(0, 8)}…{contractAddress.slice(-6)}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg hover:bg-red-100/50 transition-colors"
                        >
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Warning */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex gap-3">
                            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800 space-y-1">
                                <p className="font-semibold">This action has consequences:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                                    <li>Contract status will change to <strong>DISPUTED</strong></li>
                                    <li>All milestone operations will be frozen</li>
                                    <li>Both parties will need to reach a resolution</li>
                                    <li>This action is <strong>irreversible</strong> on-chain</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            <MessageSquare className="w-4 h-4 inline mr-1.5" />
                            Reason for Dispute
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Describe the issue in detail (minimum 10 characters)..."
                            rows={4}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none transition-all"
                        />
                        <p className="text-xs text-neutral-400 mt-1.5">
                            {reason.length}/10 characters minimum
                            {reason.length >= 10 && <span className="text-green-500 ml-1">✓</span>}
                        </p>
                    </div>

                    {/* Confirmation checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
                            I understand that initiating a dispute will freeze all contract operations and cannot be undone.
                        </span>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-100 bg-neutral-50">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleSubmit}
                        disabled={!canSubmit || isPending}
                        isLoading={isPending}
                        leftIcon={<AlertTriangle className="w-4 h-4" />}
                    >
                        Initiate Dispute
                    </Button>
                </div>
            </div>
        </div>
    );
}
