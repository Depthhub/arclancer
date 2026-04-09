'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUserContracts } from '@/hooks/useContracts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useApprovedMilestones } from '@/hooks/useApprovedMilestones';
import { usePendingActions } from '@/hooks/usePendingActions';
import { ContractStatus } from '@/types';
import {
    EscrowOverviewCard,
    PendingActionsCard,
    PaymentsWithdrawCard,
    ActiveContractsList,
    ResolutionCenterCard,
    MilestoneDetailsDrawer,
    WithdrawModal,
} from '@/components/dashboard';
import type { PendingAction, ActiveContract } from '@/components/dashboard';
import type { MilestoneDetails } from '@/components/dashboard/MilestoneDetailsDrawer';
import { Plus, Wallet } from 'lucide-react';
import { Icon } from '@iconify/react';

export default function DashboardPage() {
    const { address, isConnected } = useAccount();

    // Fetch contracts first (single source of truth)
    const { contracts, isLoading: contractsLoading, refetch } = useUserContracts();

    // Fetch real contracts and stats from blockchain
    const { stats, debugInfo, contractsData, isLoading: dashboardLoading } = useDashboardData();

    // Fetch approved milestones for withdraw
    const { approvedMilestones, totalAvailable, isLoading: milestonesLoading } = useApprovedMilestones();

    // Real pending actions from on-chain state
    const { actions: pendingActions } = usePendingActions();

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<MilestoneDetails | null>(null);

    // Withdraw modal state
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

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
                            Connect your wallet to view your contracts and start freelancing on Arc.
                        </p>
                        <ConnectButton />
                    </div>
                </Card>
            </div>
        );
    }


    // Real active contracts from blockchain
    const activeContracts: ActiveContract[] = (contracts || []).map((contractAddr, idx) => ({
        id: contractAddr,
        title: `Contract ${idx + 1}`,
        client: contractAddr.slice(0, 6) + '...' + contractAddr.slice(-4),
        status: ContractStatus.ACTIVE,
        funded: undefined, // Will be fetched by individual contract cards
    }));

    // Demo milestone details for drawer
    const demoMilestoneDetails: MilestoneDetails = {
        contractId: '0x1234567890abcdef1234567890abcdef12345678',
        contractTitle: 'DeFi Dashboard UI',
        status: 'in_review',
        milestoneIndex: 1,
        totalMilestones: 4,
        milestoneName: 'Frontend Implementation',
        escrowBalance: 2500,
        progressPercent: 75,
        autoReleaseTime: '2d 4h',
        acceptanceCriteria: [
            { text: 'Connect Wallet Integration', completed: true },
            { text: 'Swap Interface HTML/CSS', completed: true },
            { text: 'Responsive Mobile View', completed: false },
        ],
        deliverables: [
            {
                name: 'Final_Design_v2.fig',
                uploadedAt: '2h ago',
                url: '#',
            },
        ],
        deliverableNote:
            "Hey, I've completed the swap interface and wallet connection. Please review the mobile responsiveness on the staging link provided.",
        history: [
            { event: 'Deliverable Submitted', timestamp: 'Today, 10:42 AM', isActive: true },
            { event: 'Milestone Funded', timestamp: 'Apr 10, 2:00 PM', isActive: false },
        ],
    };

    const handleActionClick = (action: PendingAction) => {
        // Navigate to the contract page
        if (action.contractId) {
            window.location.href = `/contract/${action.contractId}`;
        }
    };

    const handleContractClick = (contract: ActiveContract) => {
        if (contract.needsAction) {
            setSelectedMilestone(demoMilestoneDetails);
            setDrawerOpen(true);
        }
    };

    const handleWithdraw = () => {
        setWithdrawModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-neutral-100/50">
            {/* Main Container */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 mb-1 tracking-tight">Dashboard</h1>
                        <p className="text-neutral-500">
                            {dashboardLoading ? 'Loading contracts...' : `${stats.totalContracts} contract${stats.totalContracts === 1 ? '' : 's'} found`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Role Toggle */}
                        <div className="hidden sm:flex items-center gap-2 bg-white rounded-full p-1 border border-neutral-200/60 shadow-sm px-3">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Freelancer</span>
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                <Icon icon="solar:user-circle-bold" width={16} />
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="md"
                            onClick={() => refetch()}
                            leftIcon={<Icon icon="solar:refresh-linear" width={20} />}
                        >
                            Refresh
                        </Button>
                        <Link href="/create">
                            <Button leftIcon={<Plus className="w-5 h-5" />}>
                                Create Contract
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Left Column (Main Content) */}
                    <div className="xl:col-span-8 flex flex-col gap-8">
                        {/* Escrow Overview Card */}
                        <EscrowOverviewCard
                            activeContracts={stats.activeContracts}
                            pendingActions={stats.pendingActions}
                            inEscrow={stats.inEscrow}
                            available={stats.available}
                            avgPayoutDays={stats.avgPayoutDays}
                        />

                        {/* Bottom Row: Pending Actions + Payments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PendingActionsCard
                                actions={pendingActions}
                                onActionClick={handleActionClick}
                            />
                            <PaymentsWithdrawCard
                                available={stats.available}
                                recentPayout={stats.recentPayout}
                                feePercentage={2} // Platform fee is 2%
                                onWithdraw={handleWithdraw}
                            />
                        </div>

                        {/* Quick Actions - Keep the original Create Contract entry points */}
                        <div className="mt-4">
                            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <Link href="/create">
                                    <Card variant="interactive" padding="md" className="text-center group">
                                        <Plus className="w-8 h-8 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                        <p className="font-medium text-neutral-900">New Contract</p>
                                        <p className="text-sm text-neutral-500">Create escrow contract</p>
                                    </Card>
                                </Link>
                                <Link href="/dashboard/client">
                                    <Card variant="interactive" padding="md" className="text-center group">
                                        <Icon icon="solar:user-circle-linear" width={32} className="text-purple-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                        <p className="font-medium text-neutral-900">Client Contracts</p>
                                        <p className="text-sm text-neutral-500">View all as client</p>
                                    </Card>
                                </Link>
                                <Link href="/dashboard/freelancer">
                                    <Card variant="interactive" padding="md" className="text-center group">
                                        <Icon icon="solar:case-linear" width={32} className="text-green-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                        <p className="font-medium text-neutral-900">Freelancer Work</p>
                                        <p className="text-sm text-neutral-500">View all as freelancer</p>
                                    </Card>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="xl:col-span-4 flex flex-col gap-6">
                        {/* Active Contracts List */}
                        <ActiveContractsList
                            contracts={activeContracts}
                            onContractClick={handleContractClick}
                        />

                        {/* Spacer */}
                        <div className="flex-1 hidden xl:block"></div>

                        {/* Resolution Center */}
                        <ResolutionCenterCard
                            activeDisputes={stats.activeDisputes}
                            completedContracts={stats.completedContracts}
                            reputationScore={stats.activeDisputes === 0 && stats.completedContracts > 0 ? 100 : Math.max(0, 100 - (stats.activeDisputes * 10))}
                        />
                    </div>
                </div>
            </div>

            {/* Milestone Details Drawer */}
            <MilestoneDetailsDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                milestone={selectedMilestone}
                onApprove={() => {
                    alert('Approving milestone...');
                    setDrawerOpen(false);
                }}
                onRequestChanges={() => {
                    alert('Requesting changes...');
                }}
                onOpenDispute={() => {
                    alert('Opening dispute...');
                }}
                isClient={true}
            />

            {/* Withdraw Modal */}
            <WithdrawModal
                isOpen={withdrawModalOpen}
                onClose={() => setWithdrawModalOpen(false)}
                approvedMilestones={approvedMilestones}
            />
        </div>
    );
}
