'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/contracts/StatusBadge';
import { MilestoneItem } from '@/components/contracts/MilestoneItem';
import { StableFXRate } from '@/components/contracts/StableFXRate';
import { ContractTimeline } from '@/components/contracts/ContractTimeline';
import { DeliverableViewer } from '@/components/contracts/DeliverableViewer';
import { DisputeConfirmModal } from '@/components/contracts/DisputeConfirmModal';
import { DisputePanel } from '@/components/contracts/DisputePanel';
import { useContractDetails, useContractMilestones, useCanAutoApprove } from '@/hooks/useContracts';
import { useEscrow, useApproveUSDC } from '@/hooks/useEscrow';
import { useTransactionToast } from '@/hooks/useTransactionToast';
import { truncateAddress, formatUSDC } from '@/lib/utils';
import { ContractStatus, Milestone, ContractEvent } from '@/types';
import { CONTRACTS, ERC20_ABI, ESCROW_ABI } from '@/lib/contracts';
import {
    User,
    Briefcase,
    DollarSign,
    ExternalLink,
    AlertTriangle,
    XCircle,
    CheckCircle,
    Clock,
    Wallet,
    RefreshCw,
    Loader2
} from 'lucide-react';

export default function ContractDetailPage() {
    const params = useParams();
    const contractAddress = params.id as `0x${string}`;
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<'milestones' | 'timeline'>('milestones');
    const [fundingStep, setFundingStep] = useState<'idle' | 'approving' | 'funding'>('idle');
    const [showDisputeModal, setShowDisputeModal] = useState(false);

    // Fetch real contract data
    const { details, isLoading: detailsLoading, error: detailsError, refetch: refetchDetails } = useContractDetails(contractAddress);
    const { milestones, isLoading: milestonesLoading, refetch: refetchMilestones } = useContractMilestones(contractAddress);

    const isLoading = detailsLoading || milestonesLoading;
    const hasError = detailsError || (!details && !detailsLoading);

    const escrow = useEscrow(contractAddress);

    // Check if user has approved USDC for this contract
    const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && details ? [address, contractAddress] : undefined,
        query: { enabled: !!address && !!details },
    });

    // USDC balance
    const { data: usdcBalance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Approval transaction
    const {
        writeContract: writeApprove,
        data: approveHash,
        isPending: isApprovePending,
        reset: resetApprove,
    } = useWriteContract();

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Toast notifications for transactions
    useTransactionToast({
        hash: approveHash,
        isPending: isApprovePending,
        isConfirming: isApproveConfirming,
        isSuccess: isApproveSuccess,
        error: null,
        actionLabel: 'USDC Approval',
    });

    useTransactionToast({
        hash: escrow.hash,
        isPending: escrow.isPending,
        isConfirming: escrow.isConfirming,
        isSuccess: escrow.isSuccess,
        error: escrow.error,
        actionLabel: fundingStep === 'funding' ? 'Fund Contract'
            : 'Escrow Transaction',
    });

    // Handle approval success
    useEffect(() => {
        if (isApproveSuccess && fundingStep === 'approving') {
            setFundingStep('funding');
            refetchAllowance();
        }
    }, [isApproveSuccess, fundingStep, refetchAllowance]);

    // Handle funding success
    useEffect(() => {
        if (escrow.isSuccess) {
            setFundingStep('idle');
            refetchDetails();
            refetchMilestones();
        }
    }, [escrow.isSuccess, refetchDetails, refetchMilestones]);

    const needsApproval = details && usdcAllowance !== undefined
        ? Number(usdcAllowance) < Number(details.totalAmount)
        : true;

    const hasEnoughBalance = details && usdcBalance !== undefined
        ? Number(usdcBalance) >= Number(details.totalAmount)
        : false;

    // Determine user role
    const isClient = address?.toLowerCase() === details?.client?.toLowerCase();
    const isFreelancer = address?.toLowerCase() === details?.freelancer?.toLowerCase();
    const role = isClient ? 'client' : isFreelancer ? 'freelancer' : 'viewer';

    // Calculate progress
    const completedMilestones = milestones?.filter(m => m.paid).length || 0;
    const totalMilestones = milestones?.length || 0;
    const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    // Generate timeline events from milestones
    const generateTimelineEvents = (): ContractEvent[] => {
        const events: ContractEvent[] = [];

        // Contract created event (estimate from first milestone data)
        events.push({
            type: 'CREATED',
            timestamp: Math.floor(Date.now() / 1000) - 86400 * 7, // Placeholder
        });

        if (details?.funded) {
            events.push({
                type: 'FUNDED',
                timestamp: Math.floor(Date.now() / 1000) - 86400 * 6,
                amount: Number(details.totalAmount),
            });
        }

        milestones?.forEach((m, idx) => {
            if (m.submitted && m.submittedAt) {
                events.push({
                    type: 'MILESTONE_SUBMITTED',
                    timestamp: Number(m.submittedAt),
                    milestoneIndex: idx,
                });
            }
            if (m.approved && m.approvedAt) {
                events.push({
                    type: 'MILESTONE_APPROVED',
                    timestamp: Number(m.approvedAt),
                    milestoneIndex: idx,
                });
            }
            if (m.paid) {
                events.push({
                    type: 'PAYMENT_RELEASED',
                    timestamp: Number(m.approvedAt) + 60, // Assume shortly after approval
                    milestoneIndex: idx,
                    amount: Number(m.amount),
                });
            }
        });

        if (details?.status === ContractStatus.COMPLETED) {
            events.push({
                type: 'COMPLETED',
                timestamp: Math.floor(Date.now() / 1000),
            });
        }

        if (details?.status === ContractStatus.DISPUTED) {
            events.push({
                type: 'DISPUTED',
                timestamp: Math.floor(Date.now() / 1000),
            });
        }

        return events;
    };

    // Handle fund contract with approval flow
    const handleFundContract = async () => {
        if (!details || !address) return;

        if (needsApproval) {
            setFundingStep('approving');
            writeApprove({
                address: CONTRACTS.USDC as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [contractAddress, details.totalAmount],
            });
        } else {
            setFundingStep('funding');
            escrow.executeFund();
        }
    };

    // Continue funding after approval
    const continueFunding = () => {
        setFundingStep('funding');
        escrow.executeFund();
    };

    // Check auto-approve status for each milestone
    const canAutoApproveChecks = milestones?.map((m, idx) => {
        if (m.submitted && !m.approved) {
            const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
            return Number(m.submittedAt) <= sevenDaysAgo;
        }
        return false;
    }) || [];

    // Not connected state
    if (!isConnected) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50">
                <Card className="max-w-md text-center">
                    <div className="py-8">
                        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
                            <Wallet className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-3">Connect Your Wallet</h2>
                        <p className="text-neutral-500 mb-6">
                            Connect your wallet to view contract details.
                        </p>
                        <ConnectButton />
                    </div>
                </Card>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen py-8 bg-neutral-50">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
                        <div className="h-64 bg-neutral-100 rounded-2xl"></div>
                        <div className="h-32 bg-neutral-100 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (hasError || !details) {
        return (
            <div className="min-h-screen py-8 bg-neutral-50">
                <div className="max-w-4xl mx-auto px-4">
                    <Card variant="default" className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 mb-2">Contract Not Found</h2>
                        <p className="text-neutral-500 mb-6">
                            Unable to load contract details. The contract may not exist or the network may be unavailable.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={() => refetchDetails()} leftIcon={<RefreshCw className="w-4 h-4" />}>
                                Retry
                            </Button>
                            <Button variant="outline" onClick={() => window.history.back()}>
                                Go Back
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 bg-neutral-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-neutral-900">Contract Details</h1>
                            <StatusBadge status={details.status} />
                        </div>
                        <a
                            href={`https://testnet.arcscan.app/address/${contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-neutral-500 hover:text-blue-600 flex items-center gap-1"
                        >
                            {truncateAddress(contractAddress, 8)}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                refetchDetails();
                                refetchMilestones();
                            }}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                            Refresh
                        </Button>
                        <Badge variant={role === 'client' ? 'info' : role === 'freelancer' ? 'accent' : 'default'}>
                            {role === 'client' ? 'You are Client' : role === 'freelancer' ? 'You are Freelancer' : 'Viewer'}
                        </Badge>
                    </div>
                </div>

                {/* Overview Card */}
                <Card variant="elevated" className="mb-8">
                    <CardContent>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {/* Client */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-blue-50">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Client</p>
                                    <p className="text-sm text-neutral-900 font-mono">{truncateAddress(details.client)}</p>
                                </div>
                            </div>

                            {/* Freelancer */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-purple-50">
                                    <Briefcase className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Freelancer</p>
                                    <p className="text-sm text-neutral-900 font-mono">{truncateAddress(details.freelancer)}</p>
                                </div>
                            </div>

                            {/* Total Amount */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-green-50">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Total Value</p>
                                    <p className="text-lg text-neutral-900 font-bold">{formatUSDC(details.totalAmount)}</p>
                                </div>
                            </div>

                            {/* Paid */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-amber-50">
                                    <CheckCircle className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500">Paid Out</p>
                                    <p className="text-lg text-neutral-900 font-bold">{formatUSDC(details.totalPaid)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-neutral-500">Progress</span>
                                <span className="text-sm text-neutral-500">{completedMilestones}/{totalMilestones} milestones completed</span>
                            </div>
                            <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contract Actions */}
                {details.status === ContractStatus.ACTIVE && (
                    <Card variant="default" className="mb-8">
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Fund Contract (Client only, if not funded) */}
                                {isClient && !details.funded && (
                                    <>
                                        {!hasEnoughBalance && (
                                            <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                                Insufficient USDC balance. You need {formatUSDC(details.totalAmount)}.
                                            </div>
                                        )}
                                        <Button
                                            onClick={handleFundContract}
                                            isLoading={fundingStep !== 'idle' || isApprovePending || isApproveConfirming || escrow.isPending || escrow.isConfirming}
                                            disabled={!hasEnoughBalance}
                                            leftIcon={<Wallet className="w-4 h-4" />}
                                        >
                                            {fundingStep === 'approving' ? 'Approving USDC...' :
                                                fundingStep === 'funding' ? 'Funding Contract...' :
                                                    needsApproval ? `Approve & Fund (${formatUSDC(details.totalAmount)})` :
                                                        `Fund Contract (${formatUSDC(details.totalAmount)})`}
                                        </Button>
                                        {fundingStep === 'approving' && isApproveSuccess && (
                                            <Button onClick={continueFunding} variant="secondary">
                                                Continue Funding
                                            </Button>
                                        )}
                                    </>
                                )}

                                {/* Initiate Dispute */}
                                {(isClient || isFreelancer) && details.funded && (
                                    <Button
                                        variant="danger"
                                        leftIcon={<AlertTriangle className="w-4 h-4" />}
                                        onClick={() => setShowDisputeModal(true)}
                                        isLoading={escrow.isPending}
                                    >
                                        Initiate Dispute
                                    </Button>
                                )}

                                {/* Cancel Contract (Client only, before any submissions) */}
                                {isClient && !milestones?.some(m => m.submitted) && (
                                    <Button
                                        variant="outline"
                                        leftIcon={<XCircle className="w-4 h-4" />}
                                        onClick={() => escrow.cancelContract()}
                                        isLoading={escrow.isPending}
                                    >
                                        Cancel Contract
                                    </Button>
                                )}

                                {details.funded && (
                                    <Badge variant="success" size="lg">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Funded
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dispute Panel — shown when contract is in DISPUTED state */}
                {details.status === ContractStatus.DISPUTED && (
                    <DisputePanel
                        contractAddress={contractAddress}
                        client={details.client}
                        freelancer={details.freelancer}
                        totalAmount={details.totalAmount}
                        totalPaid={details.totalPaid}
                        milestoneCount={totalMilestones}
                        funded={details.funded}
                    />
                )}

                {/* Dispute Confirmation Modal */}
                <DisputeConfirmModal
                    isOpen={showDisputeModal}
                    onClose={() => setShowDisputeModal(false)}
                    onConfirm={(reason) => {
                        console.log('[Dispute] Reason:', reason);
                        escrow.initiateDispute();
                        setShowDisputeModal(false);
                    }}
                    isPending={escrow.isPending}
                    contractAddress={contractAddress}
                />

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('milestones')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'milestones'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                            }`}
                    >
                        Milestones ({totalMilestones})
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'timeline'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                            }`}
                    >
                        Timeline
                    </button>
                </div>

                {/* Milestones Tab */}
                {activeTab === 'milestones' && (
                    <div className="mb-8">
                        <div className="space-y-4">
                            {milestones?.map((milestone, index) => (
                                <MilestoneItem
                                    key={index}
                                    milestone={milestone}
                                    index={index}
                                    role={role}
                                    onSubmit={(idx, uri) => escrow.submitMilestone(idx, uri)}
                                    onApprove={(idx) => escrow.approveMilestone(idx)}
                                    onRelease={(idx) => escrow.releaseMilestonePayment(idx)}
                                    canAutoApprove={canAutoApproveChecks[index]}
                                    onAutoApprove={(idx) => escrow.autoApproveMilestone(idx)}
                                    isPending={escrow.isPending}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                    <div className="mb-8">
                        <Card variant="default">
                            <CardContent>
                                <ContractTimeline events={generateTimelineEvents()} />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Contract Info */}
                <Card variant="default">
                    <CardHeader>
                        <CardTitle>Contract Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-neutral-500">Contract Address</p>
                                <p className="text-neutral-900 font-mono break-all">{contractAddress}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Status</p>
                                <p className="text-neutral-900">{ContractStatus[details.status]}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Funding Status</p>
                                <p className={details.funded ? 'text-green-600' : 'text-amber-600'}>
                                    {details.funded ? 'Funded' : 'Awaiting Funding'}
                                </p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Auto-Approval Period</p>
                                <p className="text-neutral-900">7 days</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Platform Fee</p>
                                <p className="text-neutral-900">2%</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Milestones</p>
                                <p className="text-neutral-900">{totalMilestones} total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
