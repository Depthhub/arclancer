'use client';

import React from 'react';
import { X, Mail, Loader2, User } from 'lucide-react';
import { useCircleWallet } from '@/context/CircleWalletProvider';
import { Button } from '@/components/ui/Button';

export function CircleConnectModal() {
  const {
    connectOpen,
    closeConnect,
    email,
    setEmail,
    usernameDraft,
    setUsernameDraft,
    connectPhase,
    sendEmailOtp,
    verifyEmailOtp,
    saveUsername,
    isConnecting,
    status,
    statusIsError,
    deviceReady,
    sdkReady,
  } = useCircleWallet();

  if (!connectOpen) return null;

  const preparing = sdkReady && !deviceReady;

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

        {connectPhase === 'username' ? (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">Choose your username</h2>
              <p className="text-sm text-neutral-500">
                Clients can tag you as <span className="font-medium">@samuel</span> instead of a
                long account code.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  placeholder="samuel"
                  disabled={isConnecting}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-neutral-50"
                />
                <p className="mt-1.5 text-xs text-neutral-400">3–20 characters: letters, numbers, underscore</p>
              </div>
              <Button
                className="w-full"
                onClick={() => void saveUsername()}
                disabled={!usernameDraft.trim() || isConnecting}
                leftIcon={isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                Save username
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">Sign in to ArcLancer</h2>
              <p className="text-sm text-neutral-500">
                Use your email. We handle secure payments behind the scenes.
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
                  disabled={connectPhase === 'verify' || isConnecting}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-neutral-50"
                />
              </div>

              {connectPhase === 'email' ? (
                <Button
                  className="w-full"
                  onClick={() => void sendEmailOtp()}
                  disabled={preparing || !email.trim() || isConnecting}
                  leftIcon={isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                >
                  {preparing ? 'Preparing…' : 'Send verification code'}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => void verifyEmailOtp()}
                  disabled={preparing || isConnecting}
                  leftIcon={isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                >
                  Enter code from email
                </Button>
              )}
            </div>
          </>
        )}

        {status && (
          <p
            className={`mt-4 text-sm rounded-lg px-3 py-2 ${
              statusIsError
                ? 'text-red-700 bg-red-50'
                : 'text-neutral-600 bg-neutral-50'
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
