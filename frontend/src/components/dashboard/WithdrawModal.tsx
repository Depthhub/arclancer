'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ESCROW_ABI, CONTRACTS } from '@/lib/contracts';
import { formatUSDC } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Loader2, ChevronDown, ArrowRight } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useTransactionToast } from '@/hooks/useTransactionToast';

// StableFX ABI for getting rates
const STABLEFX_ABI = [
    {
        type: 'function',
        name: 'getRate',
        inputs: [{ name: 'currency', type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
] as const;

// Available currencies on Arc Network
// Docs: https://docs.arc.network/arc/references/contract-addresses
const CURRENCIES = [
    { symbol: 'USDC', name: 'US Dollar Coin', address: CONTRACTS.USDC, icon: '🇺🇸', rate: 1.0 },
    { symbol: 'EURC', name: 'Euro Coin', address: CONTRACTS.EURC, icon: '🇪🇺', rate: 0.92 },
    { symbol: 'GBPC', name: 'British Pound Coin', address: '0x0000000000000000000000000000000000000002', icon: '🇬🇧', rate: 0.79 },
    { symbol: 'NGNS', name: 'Nigerian Naira Stable', address: '0x0000000000000000000000000000000000000003', icon: '🇳🇬', rate: 1580.0 },
    { symbol: 'CADC', name: 'Canadian Dollar Coin', address: '0x0000000000000000000000000000000000000004', icon: '🇨🇦', rate: 1.36 },
    { symbol: 'AUDC', name: 'Australian Dollar Coin', address: '0x0000000000000000000000000000000000000005', icon: '🇦🇺', rate: 1.54 },
];

interface ApprovedMilestone {
    contractAddress: string;
    milestoneIndex: number;
    description: string;
    amount: bigint;
    contractTitle?: string;
}

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    approvedMilestones: ApprovedMilestone[];
}

export function WithdrawModal({ isOpen, onClose, approvedMilestones }: WithdrawModalProps) {
    const { address } = useAccount();
    const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(new Set());
    const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
    const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
    const [currentTxIndex, setCurrentTxIndex] = useState<number>(-1);
    const [completedTxs, setCompletedTxs] = useState<Set<string>>(new Set());
    const [failedTxs, setFailedTxs] = useState<Set<string>>(new Set());

    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Toast notifications for withdrawal transactions
    useTransactionToast({
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        actionLabel: 'Withdraw Payment',
    });

    if (!isOpen) return null;

    const toggleMilestone = (key: string) => {
        const newSelected = new Set(selectedMilestones);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedMilestones(newSelected);
    };

    const selectAll = () => {
        const allKeys = approvedMilestones.map((m, i) => `${m.contractAddress}-${i}`);
        setSelectedMilestones(new Set(allKeys));
    };

    const deselectAll = () => {
        setSelectedMilestones(new Set());
    };

    const totalSelectedUSDC = Array.from(selectedMilestones).reduce((sum, key) => {
        const index = parseInt(key.split('-')[1]);
        const milestone = approvedMilestones[index];
        return sum + Number(milestone.amount);
    }, 0);

    // Calculate converted amount based on selected currency
    const convertedAmount = totalSelectedUSDC * selectedCurrency.rate / 1e6;

    const handleWithdraw = async () => {
        const selected = Array.from(selectedMilestones).map(key => {
            const index = parseInt(key.split('-')[1]);
            return approvedMilestones[index];
        });

        // Group milestones by contract address to batch operations
        const contractGroups = new Map<string, typeof selected>();
        for (const milestone of selected) {
            const existing = contractGroups.get(milestone.contractAddress) || [];
            existing.push(milestone);
            contractGroups.set(milestone.contractAddress, existing);
        }

        let txIndex = 0;

        // Process each contract
        for (const [contractAddress, milestones] of contractGroups) {
            try {
                // Step 1: Set payout currency if not USDC
                if (selectedCurrency.symbol !== 'USDC') {
                    setCurrentTxIndex(txIndex);
                    console.log(`Setting payout currency to ${selectedCurrency.symbol} for contract ${contractAddress}`);

                    await writeContract({
                        address: contractAddress as `0x${string}`,
                        abi: ESCROW_ABI,
                        functionName: 'setPayoutCurrency',
                        args: [selectedCurrency.address as `0x${string}`],
                    });

                    // Small delay to allow state to update
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Step 2: Release payment for each milestone in this contract
                for (const milestone of milestones) {
                    setCurrentTxIndex(txIndex);

                    console.log(`Releasing payment for milestone ${milestone.milestoneIndex} on contract ${contractAddress}`);

                    await writeContract({
                        address: contractAddress as `0x${string}`,
                        abi: ESCROW_ABI,
                        functionName: 'releaseMilestonePayment',
                        args: [BigInt(milestone.milestoneIndex)],
                    });

                    setCompletedTxs(prev => new Set([...prev, `${contractAddress}-${txIndex}`]));
                    txIndex++;
                }
            } catch (err) {
                console.error('Failed to process payment:', err);
                setFailedTxs(prev => new Set([...prev, `${contractAddress}-${txIndex}`]));
                txIndex++;
            }
        }

        setCurrentTxIndex(-1);
    };

    const isProcessing = currentTxIndex >= 0;
    const allCompleted = completedTxs.size === selectedMilestones.size && selectedMilestones.size > 0;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                            <Icon icon="solar:wallet-money-bold" className="text-green-600" width={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">Withdraw Funds</h2>
                            <p className="text-sm text-neutral-500">
                                {approvedMilestones.length} approved milestone{approvedMilestones.length !== 1 ? 's' : ''} ready to claim
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
                        disabled={isProcessing}
                    >
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {approvedMilestones.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                                <Icon icon="solar:wallet-linear" className="text-neutral-400" width={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Funds Available</h3>
                            <p className="text-neutral-500 mb-4">
                                You don't have any approved milestones ready to withdraw.
                            </p>
                            <p className="text-sm text-neutral-400">
                                When a client approves your milestone, it will appear here for withdrawal.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Currency Selector - Arc Network Feature */}
                            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:transfer-horizontal-bold" className="text-blue-600" width={18} />
                                        <span className="text-sm font-semibold text-neutral-800">Withdraw Currency</span>
                                    </div>
                                    <Badge variant="info" size="sm">
                                        <Icon icon="arcticons:arc-search" width={12} className="mr-1" />
                                        Arc StableFX
                                    </Badge>
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                                        disabled={isProcessing}
                                        className="w-full p-3 bg-white rounded-lg border border-neutral-200 flex items-center justify-between hover:border-blue-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{selectedCurrency.icon}</span>
                                            <div className="text-left">
                                                <div className="font-semibold text-neutral-900">{selectedCurrency.symbol}</div>
                                                <div className="text-xs text-neutral-500">{selectedCurrency.name}</div>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showCurrencyDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-neutral-200 shadow-xl z-10 max-h-60 overflow-y-auto">
                                            {CURRENCIES.map((currency) => (
                                                <button
                                                    key={currency.symbol}
                                                    onClick={() => {
                                                        setSelectedCurrency(currency);
                                                        setShowCurrencyDropdown(false);
                                                    }}
                                                    className={`w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors ${selectedCurrency.symbol === currency.symbol ? 'bg-blue-50' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{currency.icon}</span>
                                                        <div className="text-left">
                                                            <div className="font-semibold text-neutral-900">{currency.symbol}</div>
                                                            <div className="text-xs text-neutral-500">{currency.name}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-neutral-600">1 USDC = {currency.rate.toLocaleString()} {currency.symbol}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedCurrency.symbol !== 'USDC' && totalSelectedUSDC > 0 && (
                                    <div className="mt-3 p-3 bg-white rounded-lg border border-neutral-100">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-neutral-600">Conversion Preview</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">${(totalSelectedUSDC / 1e6).toLocaleString()} USDC</span>
                                                <ArrowRight className="w-4 h-4 text-neutral-400" />
                                                <span className="font-bold text-green-600">
                                                    {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedCurrency.symbol}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Select All/None */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-neutral-700">
                                    {selectedMilestones.size} of {approvedMilestones.length} selected
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        disabled={isProcessing}
                                    >
                                        Select All
                                    </button>
                                    <span className="text-neutral-300">|</span>
                                    <button
                                        onClick={deselectAll}
                                        className="text-sm text-neutral-600 hover:text-neutral-700 font-medium"
                                        disabled={isProcessing}
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            {/* Milestone List */}
                            <div className="space-y-3">
                                {approvedMilestones.map((milestone, index) => {
                                    const key = `${milestone.contractAddress}-${index}`;
                                    const isSelected = selectedMilestones.has(key);
                                    const isCompleted = completedTxs.has(key);
                                    const isFailed = failedTxs.has(key);
                                    const isCurrent = currentTxIndex === index;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => !isProcessing && toggleMilestone(key)}
                                            disabled={isProcessing}
                                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-neutral-200 hover:border-neutral-300 bg-white'
                                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-neutral-900">
                                                            {milestone.description || `Milestone ${milestone.milestoneIndex + 1}`}
                                                        </h4>
                                                        {isCompleted && (
                                                            <Badge variant="success" size="sm">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Claimed
                                                            </Badge>
                                                        )}
                                                        {isFailed && (
                                                            <Badge variant="error" size="sm">
                                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                                Failed
                                                            </Badge>
                                                        )}
                                                        {isCurrent && (
                                                            <Badge variant="warning" size="sm">
                                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                                Processing
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-neutral-500">
                                                        Contract: {milestone.contractAddress.slice(0, 6)}...{milestone.contractAddress.slice(-4)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-green-600">
                                                        {formatUSDC(milestone.amount)}
                                                    </div>
                                                    <div className="text-xs text-neutral-500">USDC</div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {approvedMilestones.length > 0 && (
                    <div className="p-6 border-t border-neutral-100 bg-neutral-50">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-neutral-700">You Will Receive</span>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-neutral-900">
                                    {selectedCurrency.symbol === 'USDC'
                                        ? `$${(totalSelectedUSDC / 1e6).toLocaleString()}`
                                        : `${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    }
                                </div>
                                <div className="text-xs text-neutral-500">{selectedCurrency.symbol}</div>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
                                <p className="text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    {error.message || 'Transaction failed'}
                                </p>
                            </div>
                        )}

                        {allCompleted && (
                            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-100">
                                <p className="text-sm text-green-600">
                                    <CheckCircle className="w-4 h-4 inline mr-1" />
                                    All payments claimed successfully!
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={isProcessing}
                            >
                                {allCompleted ? 'Close' : 'Cancel'}
                            </Button>
                            <Button
                                onClick={handleWithdraw}
                                className="flex-1"
                                disabled={selectedMilestones.size === 0 || isProcessing || allCompleted}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing {currentTxIndex + 1}/{selectedMilestones.size}
                                    </>
                                ) : allCompleted ? (
                                    'Completed'
                                ) : (
                                    <>
                                        <Icon icon="solar:wallet-money-bold" className="mr-2" width={18} />
                                        Withdraw to {selectedCurrency.symbol}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
