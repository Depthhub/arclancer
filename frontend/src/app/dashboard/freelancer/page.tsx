'use client';

import { useState } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ContractCard } from '@/components/contracts/ContractCard';
import { useUserContracts } from '@/hooks/useContracts';
import { ContractStatus, ContractDetails } from '@/types';
import { ESCROW_ABI } from '@/lib/contracts';
import { ArrowLeft, Briefcase, Wallet, RefreshCw, DollarSign } from 'lucide-react';
import { formatUSDC } from '@/lib/utils';

type StatusFilter = 'ALL' | ContractStatus;

export default function FreelancerContractsPage() {
    const { address, isConnected } = useAccount();
    const { contracts, isLoading, refetch } = useUserContracts();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    // Fetch details for all contracts
    const contractDetailsQueries = useReadContracts({
        contracts: contracts?.map((addr) => ({
            address: addr,
            abi: ESCROW_ABI,
            functionName: 'getContractDetails',
        })) || [],
        query: {
            enabled: !!contracts && contracts.length > 0,
        },
    });

    // Fetch milestones for all contracts in parallel
    const milestonesQueries = useReadContracts({
        contracts: contracts?.map((addr) => ({
            address: addr,
            abi: ESCROW_ABI,
            functionName: 'getAllMilestones',
        })) || [],
        query: {
            enabled: !!contracts && contracts.length > 0,
        },
    });

    // Parse contract details and filter for freelancer role
    const contractDetails: (ContractDetails & { address: `0x${string}` })[] = [];

    if (contracts && contractDetailsQueries.data) {
        contracts.forEach((contractAddr, idx) => {
            const result = contractDetailsQueries.data[idx];
            if (result.status === 'success' && result.result) {
                const data = result.result as readonly [string, string, bigint, bigint, number, bigint, boolean];
                // Only include contracts where user is freelancer
                if (data[1].toLowerCase() === address?.toLowerCase()) {
                    contractDetails.push({
                        address: contractAddr,
                        client: data[0] as `0x${string}`,
                        freelancer: data[1] as `0x${string}`,
                        totalAmount: data[2],
                        totalPaid: data[3],
                        status: Number(data[4]) as ContractStatus,
                        milestoneCount: Number(data[5]),
                        funded: data[6],
                    });
                }
            }
        });
    }

    // Calculate earnings
    const totalEarned = contractDetails.reduce((sum, c) => sum + Number(c.totalPaid), 0);
    const pendingEarnings = contractDetails
        .filter(c => c.status === ContractStatus.ACTIVE)
        .reduce((sum, c) => sum + (Number(c.totalAmount) - Number(c.totalPaid)), 0);

    // Apply status filter
    const filteredContracts = statusFilter === 'ALL'
        ? contractDetails
        : contractDetails.filter(c => c.status === statusFilter);

    if (!isConnected) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50">
                <Card className="max-w-md text-center">
                    <div className="py-8">
                        <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-6">
                            <Wallet className="w-10 h-10 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 mb-3">Connect Your Wallet</h2>
                        <p className="text-neutral-500 mb-6">
                            Connect your wallet to view your contracts as a freelancer.
                        </p>
                        <ConnectButton />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 bg-neutral-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-neutral-100 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-neutral-400" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-50">
                                <Briefcase className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Freelancer Contracts</h1>
                                <p className="text-neutral-500">Contracts where you are the freelancer</p>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                    >
                        Refresh
                    </Button>
                </div>

                {/* Earnings Summary */}
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-50">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-neutral-900">{formatUSDC(BigInt(totalEarned))}</p>
                                <p className="text-sm text-neutral-500">Total Earned</p>
                            </div>
                        </div>
                    </Card>
                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-50">
                                <DollarSign className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-neutral-900">{formatUSDC(BigInt(pendingEarnings))}</p>
                                <p className="text-sm text-neutral-500">Pending Earnings</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {(['ALL', ContractStatus.ACTIVE, ContractStatus.COMPLETED, ContractStatus.DISPUTED, ContractStatus.CANCELLED] as StatusFilter[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                                }`}
                        >
                            {status === 'ALL' ? 'All' : ContractStatus[status as ContractStatus]}
                            {status === 'ALL' && ` (${contractDetails.length})`}
                            {status !== 'ALL' && ` (${contractDetails.filter(c => c.status === status).length})`}
                        </button>
                    ))}
                </div>

                {/* Contract Grid */}
                {isLoading || contractDetailsQueries.isLoading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} variant="default" padding="lg">
                                <div className="animate-pulse space-y-4">
                                    <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                                    <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                                    <div className="h-8 bg-neutral-200 rounded"></div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : filteredContracts.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredContracts.map((contract) => (
                            <ContractCard
                                key={contract.address}
                                contractAddress={contract.address}
                                client={contract.client}
                                freelancer={contract.freelancer}
                                totalAmount={contract.totalAmount}
                                status={contract.status}
                                milestonesCompleted={(() => {
                                    const idx = contracts?.indexOf(contract.address) ?? -1;
                                    const msResult = milestonesQueries.data?.[idx];
                                    if (msResult?.status !== 'success' || !msResult.result) return 0;
                                    const milestones = msResult.result as readonly { approved: boolean; paid: boolean }[];
                                    return milestones.filter(m => m.approved || m.paid).length;
                                })()}
                                totalMilestones={contract.milestoneCount}
                                role="freelancer"
                            />
                        ))}
                    </div>
                ) : (
                    <Card variant="default" className="text-center py-12">
                        <Briefcase className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-neutral-900 mb-2">No contracts found</h3>
                        <p className="text-neutral-500 mb-6">
                            {statusFilter === 'ALL'
                                ? "You don't have any freelance contracts yet. Share your wallet address with clients to get started!"
                                : `No ${ContractStatus[statusFilter as ContractStatus].toLowerCase()} contracts found.`}
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}
