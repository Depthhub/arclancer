'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useUserContracts } from './useContracts';
import { readArcContract } from '@/lib/chain/readContract';
import { ESCROW_ABI } from '@/lib/contracts';
import { ContractStatus } from '@/types';

export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  inEscrow: number;
  available: number;
  pendingActions: number;
  activeDisputes: number;
  completedContracts: number;
  avgPayoutDays: number | null;
  recentPayout: {
    amount: number;
    currency: string;
  } | null;
  dailyValues: number[];
}

const EMPTY_STATS: DashboardStats = {
  totalContracts: 0,
  activeContracts: 0,
  inEscrow: 0,
  available: 0,
  pendingActions: 0,
  activeDisputes: 0,
  completedContracts: 0,
  avgPayoutDays: null,
  recentPayout: null,
  dailyValues: [0, 0, 0, 0, 0, 0, 0],
};

function buildDailyPayoutSeries(paidAmountsByDay: Map<number, number>): number[] {
  const today = new Date();
  const series: number[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(today);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    series.push(paidAmountsByDay.get(day.getTime()) ?? 0);
  }
  return series;
}

/**
 * Aggregate on-chain escrow stats for the dashboard overview.
 */
export function useDashboardData() {
  const { address } = useWallet();
  const { contracts, isLoading: contractsLoading, error: contractsError } = useUserContracts();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    if (!address) {
      setStats(EMPTY_STATS);
      setDebugInfo([]);
      return;
    }

    if (!contracts || contracts.length === 0) {
      setStats(EMPTY_STATS);
      setDebugInfo(contractsLoading ? [] : ['No escrow contracts found for this wallet on Arc Testnet.']);
      return;
    }

    let cancelled = false;

    const load = async () => {
      let totalInEscrow = 0;
      let totalAvailable = 0;
      let activeCount = 0;
      let disputeCount = 0;
      let completedCount = 0;
      let pendingActions = 0;
      const payoutDurations: number[] = [];
      const paidByDay = new Map<number, number>();
      const debugLines: string[] = [];

      const detailResults = await Promise.allSettled(
        contracts.map((contractAddr) =>
          readArcContract({
            address: contractAddr as `0x${string}`,
            abi: ESCROW_ABI,
            functionName: 'getContractDetails',
          }).then((details) => ({ contractAddr, details }))
        )
      );

      const milestoneJobs: Promise<void>[] = [];

      for (const result of detailResults) {
        if (result.status !== 'fulfilled') continue;

        const { contractAddr, details } = result.value;
        const [client, freelancer, totalAmount, totalPaid, status, milestoneCount, funded] =
          details as readonly [string, string, bigint, bigint, number, bigint, boolean];

        const isClient = client.toLowerCase() === address.toLowerCase();
        const isFreelancer = freelancer.toLowerCase() === address.toLowerCase();

        debugLines.push(
          `${contractAddr.slice(0, 10)}… role=${isClient ? 'client' : isFreelancer ? 'freelancer' : 'viewer'} status=${status} funded=${funded}`
        );

        if (status === ContractStatus.ACTIVE) activeCount++;
        if (status === ContractStatus.DISPUTED) disputeCount++;
        if (status === ContractStatus.COMPLETED) completedCount++;

        if (funded) {
          totalInEscrow += Number(totalAmount - totalPaid) / 1e6;
        }

        if (status !== ContractStatus.ACTIVE || !funded || Number(milestoneCount) === 0) {
          if (isClient && !funded && status === ContractStatus.ACTIVE) {
            pendingActions++;
          }
          continue;
        }

        const job = readArcContract({
          address: contractAddr as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: 'getAllMilestones',
        }).then((rawMilestones) => {
          const milestones = rawMilestones as readonly {
            amount: bigint;
            description: string;
            submitted: boolean;
            approved: boolean;
            paid: boolean;
            submittedAt: bigint;
            approvedAt: bigint;
          }[];

          for (const m of milestones) {
            if (isFreelancer && m.approved && !m.paid) {
              totalAvailable += Number(m.amount) / 1e6;
            }
            if (isClient && m.submitted && !m.approved) {
              pendingActions++;
            }
            if (isFreelancer && !m.submitted) {
              pendingActions++;
            }
            if (m.paid && Number(m.approvedAt) > 0) {
              const paidUsd = Number(m.amount) / 1e6;
              const paidDay = new Date(Number(m.approvedAt) * 1000);
              paidDay.setHours(0, 0, 0, 0);
              paidByDay.set(paidDay.getTime(), (paidByDay.get(paidDay.getTime()) ?? 0) + paidUsd);
              if (Number(m.submittedAt) > 0) {
                const days = (Number(m.approvedAt) - Number(m.submittedAt)) / 86400;
                if (days >= 0) payoutDurations.push(days);
              }
            }
          }
        });

        milestoneJobs.push(job.catch(() => undefined));
      }

      await Promise.allSettled(milestoneJobs);

      if (cancelled) return;

      const avgPayoutDays =
        payoutDurations.length > 0
          ? Math.round((payoutDurations.reduce((a, b) => a + b, 0) / payoutDurations.length) * 10) / 10
          : null;

      setStats({
        totalContracts: contracts.length,
        activeContracts: activeCount,
        inEscrow: totalInEscrow,
        available: totalAvailable,
        pendingActions,
        activeDisputes: disputeCount,
        completedContracts: completedCount,
        avgPayoutDays,
        recentPayout:
          totalAvailable > 0 ? { amount: totalAvailable, currency: 'USDC' } : null,
        dailyValues: buildDailyPayoutSeries(paidByDay),
      });
      setDebugInfo(debugLines);
    };

    load().catch((err) => {
      if (!cancelled) {
        console.error('[useDashboardData]', err);
        setDebugInfo([`Failed to load on-chain stats: ${err instanceof Error ? err.message : 'unknown error'}`]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contracts, address, contractsLoading]);

  return {
    stats,
    debugInfo,
    contractsError,
    contractsData: [],
    isLoading: contractsLoading,
  };
}

/**
 * Hook to fetch and aggregate stats from multiple contract details
 */
export function useAggregatedStats(contractAddresses: `0x${string}`[] | undefined) {
  const { address } = useWallet();
  const [aggregatedStats, setAggregatedStats] = useState({
    inEscrow: 0,
    available: 0,
    pendingActions: 0,
    activeDisputes: 0,
    completedContracts: 0,
  });

  useEffect(() => {
    if (!contractAddresses || contractAddresses.length === 0 || !address) {
      setAggregatedStats({
        inEscrow: 0,
        available: 0,
        pendingActions: 0,
        activeDisputes: 0,
        completedContracts: 0,
      });
      return;
    }

    const fetchStats = async () => {
      let inEscrow = 0;
      let available = 0;
      let pendingActions = 0;
      let activeDisputes = 0;
      let completedContracts = 0;

      try {
        const results = await Promise.allSettled(
          contractAddresses.map((addr) =>
            readArcContract({
              address: addr,
              abi: ESCROW_ABI,
              functionName: 'getContractDetails',
            }).then((d) => ({ addr, details: d }))
          )
        );

        const milestoneJobs: Promise<void>[] = [];

        for (const result of results) {
          if (result.status !== 'fulfilled') continue;
          const { addr, details } = result.value;
          const [client, freelancer, totalAmount, totalPaid, status, milestoneCount, funded] =
            details as readonly [string, string, bigint, bigint, number, bigint, boolean];

          if (status === 2) activeDisputes++;
          if (status === 1) completedContracts++;

          if (funded) {
            inEscrow += Number(totalAmount - totalPaid) / 1e6;
          }

          const isFreelancer = freelancer.toLowerCase() === address.toLowerCase();
          const isClient = client.toLowerCase() === address.toLowerCase();
          if (status === 0 && funded && Number(milestoneCount) > 0) {
            const job = readArcContract({
              address: addr,
              abi: ESCROW_ABI,
              functionName: 'getAllMilestones',
            }).then((raw) => {
              const ms = raw as readonly {
                submitted: boolean;
                approved: boolean;
                paid: boolean;
                amount: bigint;
              }[];
              for (const m of ms) {
                if (isFreelancer && m.approved && !m.paid) {
                  available += Number(m.amount) / 1e6;
                }
                if (isClient && m.submitted && !m.approved) {
                  pendingActions++;
                }
                if (isFreelancer && !m.submitted) {
                  pendingActions++;
                }
              }
            });
            milestoneJobs.push(job.catch(() => undefined));
          }
        }

        await Promise.allSettled(milestoneJobs);
      } catch (err) {
        console.error('[useAggregatedStats] Error:', err);
      }

      setAggregatedStats({ inEscrow, available, pendingActions, activeDisputes, completedContracts });
    };

    fetchStats();
  }, [contractAddresses, address]);

  return aggregatedStats;
}
