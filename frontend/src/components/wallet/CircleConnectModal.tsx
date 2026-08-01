'use client';

import React from 'react';
import { X, Mail, Loader2 } from 'lucide-react';
import { useCircleWallet } from '@/context/CircleWalletProvider';
import { Button } from '@/components/ui/Button';

export function CircleConnectModal() {
  const {
    connectOpen,
    closeConnect,
    email,
    setEmail,
    otpSent,
    sendEmailOtp,
    verifyEmailOtp,
    isConnecting,
    status,
    sdkReady,
  } = useCircleWallet();

  if (!connectOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={closeConnect}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-neutral-100 p-6">
        <button
          type="button"
          onClick={closeConnect}
          className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-1">
            Connect with Circle Wallet
          </h2>
          <p className="text-sm text-neutral-500">
            Sign in with email to get a USDC wallet on Arc Testnet. No seed phrase, no MetaMask.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={otpSent || isConnecting}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-neutral-50"
            />
          </div>

          {!otpSent ? (
            <Button
              className="w-full"
              onClick={() => void sendEmailOtp()}
              disabled={!sdkReady || !email.trim() || isConnecting}
              leftIcon={isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              Send verification code
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => void verifyEmailOtp()}
              disabled={!sdkReady || isConnecting}
              leftIcon={isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              Verify email & create wallet
            </Button>
          )}

          {status && (
            <p className="text-sm text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2">
              {status}
            </p>
          )}

          <p className="text-xs text-neutral-400 text-center">
            Powered by Circle Programmable Wallets on Arc Testnet
          </p>
        </div>
      </div>
    </div>
  );
}
