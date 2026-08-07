import { encodeFunctionData } from 'viem';
import { FACTORY_ABI } from '@/lib/contracts';

export function encodeCreateEscrowContract(
  freelancer: string,
  totalAmount: bigint,
  payoutCurrency: string,
  milestones: Array<{ amount: bigint; description: string }>
): string {
  return encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'createEscrowContract',
    args: [
      freelancer as `0x${string}`,
      totalAmount,
      payoutCurrency as `0x${string}`,
      milestones.map((m) => ({ amount: m.amount, description: m.description })),
    ],
  });
}
