'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, LogOut, Droplets, Copy } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCircleWallet } from '@/context/CircleWalletProvider';
import {
  isCircleWalletsEnabled,
  isCircleWalletsPreferred,
} from '@/lib/circle/featureFlag';
import toast from 'react-hot-toast';
import { CIRCLE_WEB_FAUCET_URL } from '@/lib/circle/faucet';
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
  const [copied, setCopied] = useState(false);

  const copyAddress = async (source: 'button' | 'pill' = 'button') => {
    if (!address) return false;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success(
        source === 'pill'
          ? `Copied ${address}`
          : 'Wallet address copied',
        { duration: 5000 }
      );
      return true;
    } catch {
      toast(`Your wallet address: ${address}`, { duration: 12000 });
      return false;
    }
  };

  const requestFunds = async () => {
    if (!address) return;
    setFunding(true);
    try {
      await copyAddress('button');
      toast('Paste your address on faucet.circle.com → Arc Testnet → Send USDC', {
        duration: 8000,
      });
      window.open(CIRCLE_WEB_FAUCET_URL, '_blank', 'noopener,noreferrer');

      try {
        const result = await circle.fundWallet({ openFaucetOnError: false });
        if (result.checkoutUrl) {
          toast.success('Circle checkout opened');
        } else if (result.mode === 'faucet') {
          toast.success('Test USDC requested — balance updates in a few seconds');
        }
      } catch {
        // Faucet tab is already open and address is on the clipboard.
      }
    } finally {
      setFunding(false);
    }
  };

  if (isConnected && address) {
    const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void copyAddress('pill')}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-100 border border-neutral-200/60 text-sm hover:bg-neutral-50 transition-colors"
          title={`Copy wallet address: ${address}`}
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium text-neutral-800">
            {circle.username ? formatUsername(circle.username) : shortAddress}
          </span>
          {circle.username && (
            <span className="text-neutral-400 text-xs">{shortAddress}</span>
          )}
          {showBalance && usdcBalance != null && (
            <span className="text-neutral-500">${Number(usdcBalance).toFixed(2)}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => void copyAddress('button')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200"
          title={`Copy ${address}`}
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied' : 'Copy address'}
        </button>
        <button
          type="button"
          onClick={() => void requestFunds()}
          disabled={funding}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-60"
          title="Copy address and open test USDC faucet"
        >
          <Droplets className="w-4 h-4" />
          {funding ? 'Opening…' : 'Add funds'}
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

export function ConnectWalletButton({
  showBalance = false,
  chainStatus,
  accountStatus,
}: {
  showBalance?: boolean;
  chainStatus?: 'full' | 'icon' | 'none';
  accountStatus?: { smallScreen: 'full' | 'avatar' | 'address'; largeScreen: 'full' | 'avatar' | 'address' };
}) {
  if (isCircleWalletsEnabled() || isCircleWalletsPreferred()) {
    return <CircleConnectButton showBalance={showBalance} />;
  }

  return (
    <ConnectButton
      showBalance={showBalance}
      chainStatus={chainStatus}
      accountStatus={accountStatus}
    />
  );
}
