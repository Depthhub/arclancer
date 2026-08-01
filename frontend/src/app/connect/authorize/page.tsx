'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, CheckCircle2, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCircleWallet } from '@/context/CircleWalletProvider';

interface AuthorizationDetails {
  requestId: string;
  clientName: string;
  scopes: string[];
}

const scopeCopy: Record<string, string> = {
  'arclancer:read': 'View your Arc wallet, marketplace agents, jobs, and escrow status.',
  'arclancer:write': 'Prepare wallet funding, escrows, agent registration, and payment actions with confirmation.',
};

function AuthorizeConnector() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request_id') ?? '';
  const circle = useCircleWallet();
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    fetch(`/api/mcp/oauth?request_id=${encodeURIComponent(requestId)}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Authorization request failed');
        if (!cancelled) setDetails(data as AuthorizationDetails);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Authorization request failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const resolve = async (approved: boolean) => {
    if (!details) return;
    setSubmitting(true);
    setError('');
    try {
      const redirectTo = await circle.resolveOAuthRequest(details.requestId, approved);
      window.location.assign(redirectTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authorization failed');
      setSubmitting(false);
    }
  };

  if (!requestId) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5">
        <p className="w-full rounded-2xl bg-red-50 p-5 text-sm text-red-700">
          Missing authorization request.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl items-center px-5 py-12">
      <section className="w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-600">ArcLancer connector</p>
            <h1 className="text-2xl font-bold text-neutral-900">
              Authorize {details?.clientName || 'AI client'}
            </h1>
          </div>
        </div>

        {details && (
          <>
            <p className="mt-6 text-sm leading-6 text-neutral-600">
              This connector will use the same Circle wallet you control on ArcLancer. It never receives
              your private key, email code, or recovery information.
            </p>
            <div className="mt-5 space-y-3">
              {details.scopes.map((scope) => (
                <div key={scope} className="flex gap-3 rounded-2xl bg-neutral-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{scope}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {scopeCopy[scope] || 'Access ArcLancer connector features.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {!circle.isConnected ? (
              <Button className="mt-6 w-full" onClick={circle.openConnect} leftIcon={<Wallet className="h-4 w-4" />}>
                Connect Circle wallet
              </Button>
            ) : (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
                  <ShieldCheck className="h-5 w-5" />
                  Wallet connected
                </div>
                <p className="mt-1 break-all text-xs text-green-700">{circle.address}</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={submitting}
                onClick={() => void resolve(false)}
              >
                Deny
              </Button>
              <Button
                className="flex-1"
                disabled={!circle.isConnected || submitting}
                isLoading={submitting}
                onClick={() => void resolve(true)}
              >
                Allow access
              </Button>
            </div>
          </>
        )}

        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    </main>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <AuthorizeConnector />
    </Suspense>
  );
}
