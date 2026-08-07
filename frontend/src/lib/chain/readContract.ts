import { getPublicClient } from 'wagmi/actions';
import type { Abi, ContractFunctionArgs, ContractFunctionName, Address } from 'viem';
import { wagmiConfig } from '@/lib/wagmi';

export function getArcPublicClient() {
  const client = getPublicClient(wagmiConfig);
  if (!client) {
    throw new Error('Arc Testnet RPC client is not configured');
  }
  return client;
}

export async function readArcContract<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends ContractFunctionName<TAbi, 'pure' | 'view'>,
>(params: {
  address: Address;
  abi: TAbi;
  functionName: TFunctionName;
  args?: ContractFunctionArgs<TAbi, 'pure' | 'view', TFunctionName>;
}) {
  return getArcPublicClient().readContract(params);
}
