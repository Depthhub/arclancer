'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, LogOut, Droplets } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCircleWallet } from '@/context/CircleWalletProvider';
import {
  isCircleWalletsEnabled,
  isCircleWalletsPreferred,
} from '@/lib/circle/featureFlag';
import { formatUsername } from '@/lib/profile/username';

function CircleConnectButton({
  showBalance = false,
}: {
  showBalance?: boolean;
}) {
  const { address, isConnected, isConnecting, usdcBalance, disconnect, openConnect } =
    useWallet();
  const circle = useCircleWallet();
  const [funding, setFunding] = useState(false);

  const requestFunds = async () => {
    setFunding(true);
    try {
      await circle.fundWallet();
    } finally {
      setFunding(false);
    }
  };

  const displayLabel = circle.username
    ? formatUsername(circle.username)
    : address
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : '';

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-100 border border-neutral-200/60 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium text-neutral-800">{displayLabel}</span>
          {showBalance && usdcBalance != null && (
            <span className="text-neutral-500">${Number(usdcBalance).toFixed(2)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void requestFunds()}
          disabled={funding}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-60"
          title="Add test funds"
        >
          <Droplets className="w-4 h-4" />
          {funding ? 'Adding…' : 'Add funds'}
        </button>
        <button
          type="button"
          onClick={disconnect}
          className="p-2 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openConnect ?? circle.openConnect}
      disabled={isConnecting}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors"
    >
      {isConnecting ? 'Signing in…' : 'Sign in'}
      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
    </button>
  );
}

function CircleWalletPendingButton() {
  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-neutral-200 text-neutral-500 cursor-not-allowed"
      title="Sign-in is being configured on this deployment"
    >
      Sign-in setup pending
    </button>
  );
}

export function ConnectWalletButton({
  showBalance = false,
  chainStatus,
  accountStatus,
}: {
  showBalance?: boolean;
  chainStatus?: 'full' | 'icon' | 'none';
  accountStatus?: { smallScreen: 'full' | 'avatar' | 'address'; largeScreen: 'full' | 'avatar' | 'address' };
}) {
  if (isCircleWalletsEnabled()) {
    return <CircleConnectButton showBalance={showBalance} />;
  }

  if (isCircleWalletsPreferred()) {
    return <CircleWalletPendingButton />;
  }

  return (
    <ConnectButton
      showBalance={showBalance}
      chainStatus={chainStatus}
      accountStatus={accountStatus}
    />
  );
}
