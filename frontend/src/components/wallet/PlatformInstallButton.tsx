'use client';

import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, TriangleAlert } from 'lucide-react';

export function PlatformInstallButton({
  href,
  label,
  copyText,
}: {
  href: string;
  label: string;
  copyText?: string;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const open = async () => {
    setMessage('');
    setError(false);
    let copied = false;
    if (copyText) {
      try {
        await navigator.clipboard.writeText(copyText);
        copied = true;
      } catch {
        copied = false;
      }
    }
    const tab = window.open(href, '_blank', 'noopener,noreferrer');
    if (!tab) {
      setError(true);
      setMessage('Your browser blocked the new tab. Allow popups and try again.');
      return;
    }
    if (copyText) {
      setError(!copied);
      setMessage(
        copied
          ? 'MCP URL copied. Paste it when ChatGPT asks for the server URL.'
          : 'ChatGPT opened, but clipboard access failed. Copy the MCP URL shown above.'
      );
    }
  };

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={() => void open()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
      >
        {label}
        <ArrowUpRight className="h-4 w-4" />
      </button>
      {message && (
        <p className={`mt-2 flex gap-2 text-xs ${error ? 'text-amber-700' : 'text-green-700'}`}>
          {error ? <TriangleAlert className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
