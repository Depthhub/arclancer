'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MilestoneDetailsDrawer } from './MilestoneDetailsDrawer';
import { useEscrow } from '@/hooks/useEscrow';
import { loadMilestoneDetailsForContract } from '@/lib/milestones/buildMilestoneDetails';
import type { MilestoneDetails } from './MilestoneDetailsDrawer';

type MilestoneDrawerContainerProps = {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: `0x${string}` | null;
  milestoneIndex?: number;
  userAddress: string;
  onComplete?: () => void;
};

export function MilestoneDrawerContainer({
  isOpen,
  onClose,
  contractAddress,
  milestoneIndex,
  userAddress,
  onComplete,
}: MilestoneDrawerContainerProps) {
  const router = useRouter();
  const escrow = useEscrow(contractAddress ?? undefined);

  const [milestone, setMilestone] = useState<MilestoneDetails | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isClientRole, setIsClientRole] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const refreshMilestone = useCallback(async () => {
    if (!contractAddress || !userAddress) return;
    setLoading(true);
    try {
      const result = await loadMilestoneDetailsForContract(
        contractAddress,
        userAddress,
        milestoneIndex
      );
      if (result) {
        setMilestone(result.details);
        setActiveIndex(result.milestoneIndex);
        setIsClientRole(result.isClient);
      } else {
        setMilestone(null);
      }
    } catch (err) {
      console.error('[MilestoneDrawerContainer] load failed', err);
      toast.error('Could not load milestone details');
      setMilestone(null);
    } finally {
      setLoading(false);
    }
  }, [contractAddress, userAddress, milestoneIndex]);

  useEffect(() => {
    if (!isOpen || !contractAddress) {
      setMilestone(null);
      return;
    }
    void refreshMilestone();
  }, [isOpen, contractAddress, refreshMilestone]);

  const handleApprove = async () => {
    if (!contractAddress) return;
    setActionPending(true);
    try {
      await escrow.approveMilestone(activeIndex);
      await escrow.releaseMilestonePayment(activeIndex);
      toast.success('Milestone approved and payment released');
      onComplete?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionPending(false);
    }
  };

  const handleDispute = async () => {
    if (!contractAddress) return;
    setActionPending(true);
    try {
      await escrow.initiateDispute();
      toast.success('Dispute opened on-chain');
      onComplete?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open dispute');
    } finally {
      setActionPending(false);
    }
  };

  const handleRequestChanges = () => {
    if (!contractAddress) return;
    onClose();
    router.push(`/contract/${contractAddress}?milestone=${activeIndex}`);
  };

  if (!isOpen) return null;

  if (loading && !milestone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm text-neutral-600 shadow-lg">
          Loading milestone…
        </div>
      </div>
    );
  }

  return (
    <MilestoneDetailsDrawer
      isOpen={isOpen}
      onClose={onClose}
      milestone={milestone}
      isClient={isClientRole}
      isActionPending={actionPending || escrow.isPending}
      onApprove={() => void handleApprove()}
      onRequestChanges={handleRequestChanges}
      onOpenDispute={() => void handleDispute()}
    />
  );
}
