'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencySelector } from '@/components/contracts/CurrencySelector';
import { StableFXRate } from '@/components/contracts/StableFXRate';
import { useCalculateFee } from '@/hooks/useContracts';
import { CONTRACTS, FACTORY_ABI, ERC20_ABI } from '@/lib/contracts';
import { formatDollars, parseUSDC } from '@/lib/utils';
import { isEthAddress } from '@/lib/profile/username';
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
    freelancerUsername: string;
    freelancerAddress: string;
    totalAmount: string;
    payoutCurrency: string;
    milestones: Array<{ amount: string; description: string }>;
}

type TransactionStep = 'idle' | 'approving' | 'approved' | 'creating' | 'success' | 'error';

export default function CreateContractClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { address, isConnected, mode, executeContract, usdcBalance: circleUsdcBalance } = useWallet();
    const [step, setStep] = useState(1);
    const [txStep, setTxStep] = useState<TransactionStep>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            freelancerUsername: '',
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

    // Prefill from Telegram Deal Copilot (?draft=...)
    // Why: users draft milestone terms in Telegram, then jump into ArcLancer to sign the on-chain transaction
    // with their wallet. The bot never handles private keys; it only generates a signed draft token.
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
                if (typeof d.freelancerAddress === 'string') {
                    if (isEthAddress(d.freelancerAddress)) {
                        setValue('freelancerAddress', d.freelancerAddress);
                    } else {
                        setValue('freelancerUsername', d.freelancerAddress.replace(/^@+/, ''));
                    }
                }
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

    // Prefill from agent hire flow (?freelancer=...&totalAmount=...)
    useEffect(() => {
        const freelancer = searchParams.get('freelancer');
        if (!freelancer) return;

        if (isEthAddress(freelancer)) {
            setValue('freelancerAddress', freelancer);
        } else {
            setValue('freelancerUsername', freelancer.replace(/^@+/, ''));
        }
        const total = searchParams.get('totalAmount');
        if (total) setValue('totalAmount', total);

        const m0 = searchParams.get('milestone0');
        const m0amt = searchParams.get('milestone0Amount');
        if (m0 || m0amt) {
            setValue('milestones.0.description', m0 || '');
            if (m0amt) setValue('milestones.0.amount', m0amt);
        }
    }, [searchParams, setValue]);

    const watchTotalAmount = watch('totalAmount');
    const watchPayoutCurrency = watch('payoutCurrency');
    const watchMilestones = watch('milestones');

    const totalAmount = parseFloat(watchTotalAmount) || 0;
    const { fee, netAmount } = useCalculateFee(totalAmount);

    const milestonesTotal = watchMilestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    const milestonesValid = Math.abs(milestonesTotal - netAmount) < 0.01;

    // Check USDC balance via ERC-20 interface.
    // Arc context: USDC is used as gas on Arc, and some environments may expose native balance differently.
    const { data: usdcBalance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Also check native balance.
    // Arc context: USDC is the native gas token, so native balance can be the authoritative source even if
    // ERC-20 `balanceOf` behaves unexpectedly depending on RPC/precompile behavior.
    const { data: nativeBalance } = useBalance({ address });

    // Check current allowance
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, CONTRACTS.FACTORY as `0x${string}`] : undefined,
        query: { enabled: !!address },
    });

    // Use the higher of ERC-20 balanceOf or native balance.
    // Why: on Arc, USDC is native, so certain balance read paths can return 0 even when the wallet is funded.
    const erc20Bal = usdcBalance ? Number(usdcBalance) / 1e6 : 0;
    const nativeBal = nativeBalance ? Number(nativeBalance.value) / 10 ** (nativeBalance.decimals) : 0;
    const effectiveBalance =
        mode === 'circle'
            ? (circleUsdcBalance ? Number(circleUsdcBalance) : 0)
            : Math.max(erc20Bal, nativeBal);

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

    const resolveFreelancerAddress = async (tag: string): Promise<string> => {
        const q = tag.trim();
        if (isEthAddress(q)) return q;
        const res = await fetch(`/api/profile/lookup?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(
                typeof data.error === 'string' ? data.error : 'Could not find that username'
            );
        }
        return data.walletAddress as string;
    };

    const onSubmit = async (data: FormData) => {
        if (!address) return;

        setErrorMessage('');
        let freelancerAddress = data.freelancerAddress.trim();
        if (!freelancerAddress && data.freelancerUsername.trim()) {
            try {
                freelancerAddress = await resolveFreelancerAddress(data.freelancerUsername);
                setValue('freelancerAddress', freelancerAddress);
            } catch (err) {
                setTxStep('error');
                setErrorMessage(err instanceof Error ? err.message : 'Invalid freelancer');
                return;
            }
        }
        if (!isEthAddress(freelancerAddress)) {
            setTxStep('error');
            setErrorMessage('Enter a valid username (e.g. samuel) or ask them to sign up first');
            return;
        }

        const feeAmount = parseUSDC(fee);

        // Get payout currency address
        const payoutCurrencyAddress = getCurrencyAddress(data.payoutCurrency);

        // Prepare milestones
        const milestones = data.milestones.map(m => ({
            amount: parseUSDC(m.amount),
            description: m.description,
        }));

        if (mode === 'circle' && executeContract) {
            try {
                if (!hasEnoughAllowance) {
                    setTxStep('approving');
                    await executeContract({
                        contractAddress: CONTRACTS.USDC,
                        abiFunctionSignature: 'approve(address,uint256)',
                        abiParameters: [CONTRACTS.FACTORY, feeAmount.toString()],
                    });
                    await refetchAllowance();
                }
                setTxStep('creating');
                await executeContract({
                    contractAddress: CONTRACTS.FACTORY,
                    abiFunctionSignature:
                        'createEscrowContract(address,uint256,address,(uint256,string)[])',
                    abiParameters: [
                        freelancerAddress,
                        parseUSDC(data.totalAmount).toString(),
                        payoutCurrencyAddress,
                        milestones.map((m) => [m.amount.toString(), m.description]),
                    ],
                });
                setTxStep('success');
            } catch (err) {
                setTxStep('error');
                setErrorMessage(err instanceof Error ? err.message : 'Transaction failed');
            }
            return;
        }

        // ArcLancer fee collection uses an allowance flow (approve → create).
        // On Arc, fees are stablecoin-denominated which keeps UX predictable for users.
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
                    freelancerAddress as `0x${string}`,
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
                        <h2 className="text-2xl font-bold text-neutral-900 mb-3">Sign in to continue</h2>
                        <p className="text-neutral-500 mb-6">
                            Sign in with your email to create a new contract.
                        </p>
                        <ConnectWalletButton />
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
                            {txStep === 'approving' && 'Confirming payment...'}
                            {txStep === 'approved' && 'Payment confirmed'}
                            {txStep === 'creating' && 'Creating contract...'}
                        </h2>
                        <p className="text-neutral-500 mb-6">
                            {txStep === 'approving' && 'Approve the payment step in the sign-in window.'}
                            {txStep === 'approved' && 'Now creating your contract...'}
                            {txStep === 'creating' && 'Approve the final step in the sign-in window.'}
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
                                    label="Freelancer username"
                                    placeholder="samuel"
                                    {...register('freelancerUsername', {
                                        required: 'Freelancer username is required',
                                    })}
                                    error={errors.freelancerUsername?.message}
                                />
                                <p className="text-xs text-neutral-400">
                                    They must have an ArcLancer account (e.g. @samuel). No @ needed.
                                </p>

                                <Input
                                    label="Total amount (USD)"
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
                                                <span className="text-neutral-900 text-sm font-medium">
                                                    {watch('freelancerUsername')
                                                        ? `@${watch('freelancerUsername').replace(/^@+/, '')}`
                                                        : watch('freelancerAddress')
                                                          ? `${watch('freelancerAddress').slice(0, 10)}…`
                                                          : '—'}
                                                </span>
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

