import type { MilestoneDetails } from '@/components/dashboard/MilestoneDetailsDrawer';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { getIPFSUrl } from '@/lib/ipfs';

export const AUTO_APPROVE_SECONDS = 7 * 24 * 60 * 60;

export type RawMilestone = {
  amount: bigint;
  description: string;
  deliverableURI: string;
  submitted: boolean;
  approved: boolean;
  paid: boolean;
  submittedAt: bigint;
  approvedAt: bigint;
};

export function formatAutoReleaseCountdown(submittedAt: number): string | undefined {
  if (!submittedAt) return undefined;
  const releaseAt = submittedAt + AUTO_APPROVE_SECONDS;
  const remaining = releaseAt - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return 'Eligible now';
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((remaining % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function findActionableMilestoneIndex(
  milestones: ReadonlyArray<RawMilestone>,
  isClient: boolean,
  isFreelancer: boolean
): number {
  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    if (isClient && m.submitted && !m.approved) return i;
    if (isFreelancer && !m.submitted) return i;
    if (isFreelancer && m.approved && !m.paid) return i;
  }
  return 0;
}

function deliverableLabel(uri: string): string {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      return new URL(uri).hostname;
    } catch {
      return 'Deliverable link';
    }
  }
  return uri.length > 12 ? `IPFS ${uri.slice(0, 8)}…` : 'Deliverable';
}

function deliverableUrl(uri: string): string {
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  return getIPFSUrl(uri);
}

export function buildMilestoneDetails(params: {
  contractAddress: string;
  contractTitle?: string;
  milestones: ReadonlyArray<RawMilestone>;
  milestoneIndex: number;
  totalPaid: bigint;
  totalAmount: bigint;
  funded: boolean;
}): MilestoneDetails | null {
  const m = params.milestones[params.milestoneIndex];
  if (!m) return null;

  const totalMilestones = params.milestones.length;
  let status: MilestoneDetails['status'] = 'pending';
  if (m.paid) status = 'paid';
  else if (m.approved) status = 'approved';
  else if (m.submitted) status = 'in_review';

  const escrowBalance = Number(m.amount) / 1e6;
  const paidCount = params.milestones.filter((x) => x.paid).length;
  const progressPercent =
    totalMilestones > 0 ? Math.round((paidCount / totalMilestones) * 100) : 0;

  const acceptanceCriteria = [
    {
      text: m.description || `Milestone ${params.milestoneIndex + 1} deliverables`,
      completed: m.submitted || m.approved || m.paid,
    },
  ];

  const deliverables = m.deliverableURI
    ? [
        {
          name: deliverableLabel(m.deliverableURI),
          uploadedAt: m.submittedAt
            ? formatRelativeTime(Number(m.submittedAt))
            : 'Not submitted',
          url: deliverableUrl(m.deliverableURI),
        },
      ]
    : undefined;

  const history: MilestoneDetails['history'] = [];
  if (m.submittedAt) {
    history.push({
      event: 'Deliverable submitted',
      timestamp: formatDate(Number(m.submittedAt)),
      isActive: m.submitted && !m.approved,
    });
  }
  if (params.funded) {
    history.push({
      event: 'Contract funded',
      timestamp: 'On Arc Testnet',
      isActive: false,
    });
  }

  const title =
    params.contractTitle ||
    `Escrow ${params.contractAddress.slice(0, 6)}…${params.contractAddress.slice(-4)}`;

  return {
    contractId: params.contractAddress,
    contractTitle: title,
    status,
    milestoneIndex: params.milestoneIndex,
    totalMilestones,
    milestoneName: m.description || `Milestone ${params.milestoneIndex + 1}`,
    escrowBalance,
    progressPercent,
    autoReleaseTime:
      m.submitted && !m.approved
        ? formatAutoReleaseCountdown(Number(m.submittedAt))
        : undefined,
    acceptanceCriteria,
    deliverables,
    history,
  };
}

export async function loadMilestoneDetailsForContract(
  contractAddress: `0x${string}`,
  userAddress: string,
  milestoneIndex?: number
): Promise<{ details: MilestoneDetails; milestoneIndex: number; isClient: boolean } | null> {
  const { readArcContract } = await import('@/lib/chain/readContract');
  const { ESCROW_ABI } = await import('@/lib/contracts');

  const [detailsRaw, milestonesRaw] = await Promise.all([
    readArcContract({
      address: contractAddress,
      abi: ESCROW_ABI,
      functionName: 'getContractDetails',
    }),
    readArcContract({
      address: contractAddress,
      abi: ESCROW_ABI,
      functionName: 'getAllMilestones',
    }),
  ]);

  const [client, freelancer, totalAmount, totalPaid, , , funded] = detailsRaw as readonly [
    string,
    string,
    bigint,
    bigint,
    number,
    bigint,
    boolean,
  ];

  const milestones = milestonesRaw as readonly RawMilestone[];
  if (milestones.length === 0) return null;

  const isClient = client.toLowerCase() === userAddress.toLowerCase();
  const isFreelancer = freelancer.toLowerCase() === userAddress.toLowerCase();

  const index =
    milestoneIndex !== undefined
      ? milestoneIndex
      : findActionableMilestoneIndex(milestones, isClient, isFreelancer);

  const built = buildMilestoneDetails({
    contractAddress,
    milestones,
    milestoneIndex: index,
    totalPaid,
    totalAmount,
    funded,
  });

  if (!built) return null;

  return { details: built, milestoneIndex: index, isClient };
}
