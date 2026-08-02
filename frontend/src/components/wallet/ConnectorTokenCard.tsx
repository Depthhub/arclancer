'use client';

import { useState } from 'react';
import { Copy, KeyRound, Loader2 } from 'lucide-react';
import { useCircleWallet } from '@/context/CircleWalletProvider';
import { Button } from '@/components/ui/Button';

export function ConnectorTokenCard() {
  const circle = useCircleWallet();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createToken = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await circle.createConnectorToken();
      setToken(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connector token');
    } finally {
      setLoading(false);
    }
  };

  if (!circle.isConnected) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold text-neutral-900">Connect your Arc wallet first</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Your connector token links ChatGPT or Claude to the same Circle wallet you use on ArcLancer.
        </p>
        <Button className="mt-4" onClick={circle.openConnect}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-neutral-900">Create an AI connector token</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Treat this token like a password. It links the connector to your Circle wallet.
          </p>
        </div>
      </div>

      {!token ? (
        <Button
          className="mt-5"
          onClick={() => void createToken()}
          disabled={loading}
          leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
        >
          Generate token
        </Button>
      ) : (
        <div className="mt-5">
          <div className="flex items-center gap-2 rounded-xl bg-neutral-950 p-3 text-white">
            <code className="min-w-0 flex-1 truncate text-xs">{token}</code>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(token)}
              className="rounded-lg p-2 hover:bg-white/10"
              title="Copy token"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-700">
            Copy it now. ArcLancer does not show this token again.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
