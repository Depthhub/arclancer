'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencySelector } from '@/components/contracts/CurrencySelector';
import { StableFXRate } from '@/components/contracts/StableFXRate';
import { useCalculateFee } from '@/hooks/useContracts';
import { CONTRACTS, FACTORY_ABI, ERC20_ABI } from '@/lib/contracts';
import { formatDollars, parseUSDC } from '@/lib/utils';
import { getCurrencyAddress } from '@/hooks/useStableFX';
import { useTransactionToast } from '@/hooks/useTransactionToast';
import {
    ChevronRight,
    ChevronLeft,
    Plus,
    Trash2,
    Wallet,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';

interface FormData {
    freelancerAddress: string;
    totalAmount: string;
    payoutCurrency: string;
    milestones: Array<{ amount: string; description: string }>;
}

type TransactionStep = 'idle' | 'approving' | 'approved' | 'creating' | 'success' | 'error';

export default function CreateContractClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { address, isConnected } = useAccount();
    const [step, setStep] = useState(1);
    const [txStep, setTxStep] = useState<TransactionStep>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            freelancerAddress: '',
            totalAmount: '',
            payoutCurrency: 'USDC',
            milestones: [{ amount: '', description: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'milestones',
    });

    // Prefill from Telegram deal copilot draft token (?draft=...)
    useEffect(() => {
        const token = searchParams.get('draft');
        if (!token) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/deal-drafts/resolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const json = (await res.json().catch(() => null)) as unknown;
                if (cancelled) return;
                if (!res.ok || !json || typeof json !== 'object') return;

                const obj = json as { ok?: boolean; draft?: Partial<FormData> & { milestones?: Array<{ amount?: string; description?: string }> } };
                if (!obj.ok || !obj.draft) return;

                const d = obj.draft;
                if (typeof d.freelancerAddress === 'string') setValue('freelancerAddress', d.freelancerAddress);
                if (typeof d.totalAmount === 'string') setValue('totalAmount', d.totalAmount);
                if (typeof d.payoutCurrency === 'string') setValue('payoutCurrency', d.payoutCurrency);

                if (Array.isArray(d.milestones) && d.milestones.length > 0) {
                    const ms = d.milestones.map((m) => ({
                        amount: typeof m.amount === 'string' ? m.amount : '',
                        description: typeof m.description === 'string' ? m.description : '',
                    }));

                    // Clear to one row, then append remaining (keeps field array stable).
                    for (let i = fields.length - 1; i >= 1; i--) remove(i);
                    setValue('milestones.0.amount', ms[0].amount);
                    setValue('milestones.0.description', ms[0].description);
                    for (let i = 1; i < ms.length; i++) append(ms[i]);
                }
            } catch {
                // silent: user can still fill manually
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const watchTotalAmount = watch('totalAmount');
    const watchPayoutCurrency = watch('payoutCurrency');
    const watchMilestones = watch('milestones');

    const totalAmount = parseFloat(watchTotalAmount) || 0;
    const { fee, netAmount } = useCalculateFee(totalAmount);

    const milestonesTotal = watchMilestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    const milestonesValid = Math.abs(milestonesTotal - netAmount) < 0.01;

    // Check USDC balance via ERC20 precompile
    const { data: usdcBalance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Also check native balance (on Arc Testnet, USDC IS the native gas token)
    const { data: nativeBalance } = useBalance({ address });

    // Check current allowance
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, CONTRACTS.FACTORY as `0x${string}`] : undefined,
        query: { enabled: !!address },
    });

    // Use the higher of ERC20 precompile balance or native balance
    // On Arc, USDC is native so the precompile balanceOf may return 0
    const erc20Bal = usdcBalance ? Number(usdcBalance) / 1e6 : 0;
    const nativeBal = nativeBalance ? Number(nativeBalance.value) / 10 ** (nativeBalance.decimals) : 0;
    const effectiveBalance = Math.max(erc20Bal, nativeBal);

    const hasEnoughBalance = effectiveBalance >= fee;
    const hasEnoughAllowance = currentAllowance ? Number(currentAllowance) / 1e6 >= fee : false;

    // Approval transaction
    const {
        writeContract: writeApprove,
        data: approveHash,
        isPending: isApprovePending,
        error: approveError,
        reset: resetApprove,
    } = useWriteContract();

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Create contract transaction
    const {
        writeContract: writeCreate,
        data: createHash,
        isPending: isCreatePending,
        error: createError,
        reset: resetCreate,
    } = useWriteContract();

    const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
        hash: createHash,
    });

    // Toast notifications
    useTransactionToast({
        hash: approveHash,
        isPending: isApprovePending,
        isConfirming: isApproveConfirming,
        isSuccess: isApproveSuccess,
        error: approveError,
        actionLabel: 'USDC Approval',
    });

    useTransactionToast({
        hash: createHash,
        isPending: isCreatePending,
        isConfirming: isCreateConfirming,
        isSuccess: isCreateSuccess,
        error: createError,
        actionLabel: 'Create Contract',
    });

    // Handle approval success - trigger create
    useEffect(() => {
        if (isApproveSuccess && txStep === 'approving') {
            setTxStep('approved');
            refetchAllowance();
        }
    }, [isApproveSuccess, txStep, refetchAllowance]);

    // Handle errors
    useEffect(() => {
        if (approveError) {
            setTxStep('error');
            setErrorMessage(approveError.message || 'Approval failed');
        }
        if (createError) {
            setTxStep('error');
            setErrorMessage(createError.message || 'Contract creation failed');
        }
    }, [approveError, createError]);

    // Handle create success
    useEffect(() => {
        if (isCreateSuccess) {
            setTxStep('success');
        }
    }, [isCreateSuccess]);

    const onSubmit = async (data: FormData) => {
        if (!address) return;

        setErrorMessage('');
        const feeAmount = parseUSDC(fee);

        // Get payout currency address
        const payoutCurrencyAddress = getCurrencyAddress(data.payoutCurrency);

        // Prepare milestones
        const milestones = data.milestones.map(m => ({
            amount: parseUSDC(m.amount),
            description: m.description,
        }));

        // Check if we need approval first
        if (!hasEnoughAllowance) {
            setTxStep('approving');
            writeApprove({
                address: CONTRACTS.USDC as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [CONTRACTS.FACTORY as `0x${string}`, feeAmount],
            });
        } else {
            // Already approved, create directly
            setTxStep('creating');
            writeCreate({
                address: CONTRACTS.FACTORY as `0x${string}`,
                abi: FACTORY_ABI,
                functionName: 'createEscrowContract',
                args: [
                    data.freelancerAddress as `0x${string}`,
                    parseUSDC(data.totalAmount),
                    payoutCurrencyAddress,
                    milestones,
                ],
            });
        }
    };

    // Continue to create after approval
    const continueToCreate = (data: FormData) => {
        const payoutCurrencyAddress = getCurrencyAddress(data.payoutCurrency);
        const milestones = data.milestones.map(m => ({
            amount: parseUSDC(m.amount),
            description: m.description,
        }));

        setTxStep('creating');
        writeCreate({
            address: CONTRACTS.FACTORY as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'createEscrowContract',
            args: [
                data.freelancerAddress as `0x${string}`,
                parseUSDC(data.totalAmount),
                payoutCurrencyAddress,
                milestones,
            ],
        });
    };

    const resetTransaction = () => {
        setTxStep('idle');
        setErrorMessage('');
        resetApprove();
        resetCreate();
    };

    if (!isConnected) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50">
                <Card variant="elevated" className="max-w-md text-center">
                    <div className="py-8">
                        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
                            <Wallet className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-3">Connect Your Wallet</h2>
                        <p className="text-neutral-500 mb-6">
                            Connect your wallet to create a new escrow contract.
                        </p>
                        <ConnectButton />
                    </div>
                </Card>
            </div>
        );
    }

    // Transaction in progress overlay
    if (txStep !== 'idle' && txStep !== 'success' && txStep !== 'error') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50">
                <Card variant="elevated" className="max-w-md text-center">
                    <div className="py-8">
                        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-3">
                            {txStep === 'approving' && 'Approving USDC...'}
                            {txStep === 'approved' && 'USDC Approved!'}
                            {txStep === 'creating' && 'Creating Contract...'}
                        </h2>
                        <p className="text-neutral-500 mb-6">
                            {txStep === 'approving' && 'Please confirm the approval transaction in your wallet.'}
                            {txStep === 'approved' && 'Now creating your escrow contract...'}
                            {txStep === 'creating' && 'Please confirm the contract creation in your wallet.'}
                        </p>
                        {(isApproveConfirming || isCreateConfirming) && (
                            <p className="text-sm text-neutral-400">Waiting for confirmation...</p>
                        )}
                        {txStep === 'approved' && (
                            <Button onClick={() => continueToCreate(watch())}>
                                Continue to Create Contract
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    // Error state
    if (txStep === 'error') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50">
                <Card variant="elevated" className="max-w-md text-center">
                    <div className="py-8">
                        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-3">Transaction Failed</h2>
                        <p className="text-neutral-500 mb-6 text-sm break-words">
                            {errorMessage || 'Something went wrong. Please try again.'}
                        </p>
                        <Button onClick={resetTransaction}>
                            Try Again
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // Success state
    if (txStep === 'success') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50">
                <Card variant="elevated" className="max-w-md text-center">
                    <div className="py-8">
                        <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-3">Contract Created!</h2>
                        <p className="text-neutral-500 mb-6">
                            Your escrow contract has been successfully deployed. Don&apos;t forget to fund it!
                        </p>
                        {createHash && (
                            <p className="text-xs text-neutral-400 mb-4 font-mono">
                                Tx: {createHash.slice(0, 10)}...{createHash.slice(-8)}
                            </p>
                        )}
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => router.push('/dashboard')}>
                                View Dashboard
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                Create Another
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 bg-neutral-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-neutral-900 mb-2">Create Contract</h1>
                    <p className="text-neutral-500">Set up a new milestone-based escrow contract</p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[1, 2, 3].map((s) => (
                        <React.Fragment key={s}>
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${step === s
                                    ? 'bg-blue-600 text-white'
                                    : step > s
                                        ? 'bg-green-500 text-white'
                                        : 'bg-neutral-200 text-neutral-500'
                                    }`}
                            >
                                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-16 h-1 rounded ${step > s ? 'bg-green-500' : 'bg-neutral-200'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Step 1: Basic Details */}
                    {step === 1 && (
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>Basic Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Input
                                    label="Freelancer Address"
                                    placeholder="0x..."
                                    {...register('freelancerAddress', {
                                        required: 'Freelancer address is required',
                                        pattern: {
                                            value: /^0x[a-fA-F0-9]{40}$/,
                                            message: 'Invalid Ethereum address',
                                        },
                                    })}
                                    error={errors.freelancerAddress?.message}
                                />

                                <Input
                                    label="Total Amount (USDC)"
                                    type="number"
                                    placeholder="5000"
                                    leftAddon="$"
                                    {...register('totalAmount', {
                                        required: 'Amount is required',
                                        min: { value: 1, message: 'Amount must be greater than 0' },
                                    })}
                                    error={errors.totalAmount?.message}
                                />

                                {totalAmount > 0 && (
                                    <div className="p-4 bg-neutral-100 rounded-xl space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-500">Platform Fee (2%)</span>
                                            <span className="text-neutral-900">{formatDollars(fee)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-500">Net to Freelancer</span>
                                            <span className="text-green-600 font-medium">{formatDollars(netAmount)}</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Payout Currency
                                    </label>
                                    <CurrencySelector
                                        value={watchPayoutCurrency}
                                        onChange={(v) => setValue('payoutCurrency', v)}
                                    />
                                </div>

                                {watchPayoutCurrency !== 'USDC' && totalAmount > 0 && (
                                    <StableFXRate
                                        fromCurrency="USDC"
                                        toCurrency={watchPayoutCurrency}
                                        amount={netAmount}
                                    />
                                )}

                                <div className="flex justify-end">
                                    <Button type="button" onClick={() => setStep(2)} rightIcon={<ChevronRight className="w-4 h-4" />}>
                                        Next: Milestones
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 2: Milestones */}
                    {step === 2 && (
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>Define Milestones</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-sm text-blue-700">
                                        Milestone amounts must total <span className="font-bold">{formatDollars(netAmount)}</span> (net amount after fee)
                                    </p>
                                </div>

                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-4 bg-neutral-100 rounded-xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-neutral-700">Milestone {index + 1}</span>
                                            {fields.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid sm:grid-cols-3 gap-4">
                                            <Input
                                                placeholder="Amount"
                                                type="number"
                                                leftAddon="$"
                                                {...register(`milestones.${index}.amount` as const, { required: true })}
                                            />
                                            <div className="sm:col-span-2">
                                                <Input
                                                    placeholder="Description (e.g., Design phase, Development, Testing)"
                                                    {...register(`milestones.${index}.description` as const, { required: true })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => append({ amount: '', description: '' })}
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    className="w-full"
                                >
                                    Add Milestone
                                </Button>

                                {/* Milestone Total */}
                                <div className={`p-4 rounded-xl ${milestonesValid ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-700">Milestones Total</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${milestonesValid ? 'text-green-600' : 'text-amber-600'}`}>
                                                {formatDollars(milestonesTotal)}
                                            </span>
                                            {milestonesValid ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                            )}
                                        </div>
                                    </div>
                                    {!milestonesValid && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Must equal {formatDollars(netAmount)} (difference: {formatDollars(Math.abs(milestonesTotal - netAmount))})
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                                        Back
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        disabled={!milestonesValid}
                                        rightIcon={<ChevronRight className="w-4 h-4" />}
                                    >
                                        Next: Review
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>Review & Confirm</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Summary */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-neutral-100 rounded-xl">
                                        <h3 className="text-sm font-medium text-neutral-500 mb-3">Contract Details</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Freelancer</span>
                                                <span className="text-neutral-900 font-mono text-sm">{watch('freelancerAddress').slice(0, 10)}...{watch('freelancerAddress').slice(-8)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Total Amount</span>
                                                <span className="text-neutral-900">{formatDollars(totalAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Platform Fee</span>
                                                <span className="text-neutral-500">{formatDollars(fee)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Net to Freelancer</span>
                                                <span className="text-green-600 font-medium">{formatDollars(netAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Payout Currency</span>
                                                <span className="text-neutral-900">{watchPayoutCurrency}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-neutral-100 rounded-xl">
                                        <h3 className="text-sm font-medium text-neutral-500 mb-3">Milestones ({watchMilestones.length})</h3>
                                        <div className="space-y-2">
                                            {watchMilestones.map((m, i) => (
                                                <div key={i} className="flex justify-between">
                                                    <span className="text-neutral-700">{i + 1}. {m.description || 'Untitled'}</span>
                                                    <span className="text-neutral-900">{formatDollars(parseFloat(m.amount) || 0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {watchPayoutCurrency !== 'USDC' && (
                                        <StableFXRate
                                            fromCurrency="USDC"
                                            toCurrency={watchPayoutCurrency}
                                            amount={netAmount}
                                        />
                                    )}
                                </div>

                                {/* Balance warning */}
                                {!hasEnoughBalance && fee > 0 && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                        <p className="text-sm text-red-600">
                                            <strong>Insufficient Balance:</strong> You need at least {formatDollars(fee)} USDC for the platform fee.
                                            Current balance: {formatDollars(effectiveBalance)}
                                        </p>
                                    </div>
                                )}

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-sm text-blue-700">
                                        <strong>Transaction Flow:</strong>
                                        {!hasEnoughAllowance
                                            ? ' You will first approve USDC spending, then create the contract.'
                                            : ' You have already approved USDC. Click to create the contract.'}
                                    </p>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-sm text-amber-700">
                                        <strong>Note:</strong> After creation, you will need to fund the contract separately before the freelancer can start work.
                                    </p>
                                </div>

                                <div className="flex justify-between">
                                    <Button type="button" variant="outline" onClick={() => setStep(2)} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!hasEnoughBalance || !milestonesValid}
                                        isLoading={isApprovePending || isCreatePending || isApproveConfirming || isCreateConfirming}
                                    >
                                        {!hasEnoughAllowance ? 'Approve & Create Contract' : 'Create Contract'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </form>
            </div>
        </div>
    );
}

