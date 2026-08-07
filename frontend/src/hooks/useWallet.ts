'use client';

import { useAccount } from 'wagmi';
import { useCircleWallet } from '@/context/CircleWalletProvider';
import { isCircleWalletsEnabled } from '@/lib/circle/featureFlag';
import { arcTestnet } from '@/lib/wagmi';

export function useWallet() {
  const circle = useCircleWallet();
  const wagmi = useAccount();
  const circleMode = isCircleWalletsEnabled() && circle.enabled;

  if (circleMode && circle.isConnected) {
    return {
      mode: 'circle' as const,
      address: circle.address,
      username: circle.username,
      isConnected: circle.isConnected,
      isConnecting: circle.isConnecting,
      chainId: arcTestnet.id,
      walletId: circle.walletId,
      usdcBalance: circle.usdcBalance,
      executeContract: circle.executeContract,
      disconnect: circle.disconnect,
      openConnect: circle.openConnect,
    };
  }

  return {
    mode: 'rainbowkit' as const,
    address: wagmi.address,
    isConnected: wagmi.isConnected,
    isConnecting: wagmi.isConnecting,
    chainId: wagmi.chainId,
    walletId: undefined,
    usdcBalance: undefined,
    executeContract: undefined,
    disconnect: undefined,
    openConnect: undefined,
  };
}
