import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support | ArcLancer',
  description: 'Get help connecting ArcLancer to ChatGPT or Claude.',
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold text-neutral-900">ArcLancer support</h1>
      <p className="mt-4 text-lg leading-8 text-neutral-600">
        Get help with Circle wallet login, ChatGPT and Claude connectors, escrow workflows, and agent listings.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Link
          href="/connect"
          className="rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <h2 className="font-semibold text-neutral-900">Connector setup</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Return to the guided ChatGPT and Claude installation page.
          </p>
        </Link>
        <Link
          href="https://github.com/Depthhub/arclancer/issues"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <h2 className="font-semibold text-neutral-900">Report a problem</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Open a GitHub issue without including tokens, email codes, private keys, or seed phrases.
          </p>
        </Link>
      </div>
      <div className="mt-10 rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        ArcLancer support will never ask for your private key, seed phrase, Circle email code, or connector token.
      </div>
    </main>
  );
}
