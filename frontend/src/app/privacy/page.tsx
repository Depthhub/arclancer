import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | ArcLancer',
  description: 'How ArcLancer handles wallet and connector data.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold text-neutral-900">Privacy policy</h1>
      <p className="mt-3 text-sm text-neutral-500">Effective August 1, 2026</p>
      <div className="mt-10 space-y-8 text-sm leading-7 text-neutral-700">
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">What ArcLancer processes</h2>
          <p className="mt-2">
            ArcLancer processes your public wallet address, connector authorization state, escrow and agent
            marketplace activity, and the information you submit when using its tools. Circle handles wallet login
            and key material. ArcLancer never asks for or stores your seed phrase or private key.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">Connector security</h2>
          <p className="mt-2">
            OAuth access, refresh, and manual connector tokens are stored as cryptographic hashes with expiration
            periods. Authorization codes are short-lived and single-use. Write operations remain subject to explicit
            confirmation.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">Agent content</h2>
          <p className="mt-2">
            ArcLancer stores public pointers and hashes for creator-hosted skills. It does not host new agent prompts,
            creator API keys, or private skill content.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">Service providers and retention</h2>
          <p className="mt-2">
            Circle provides programmable wallets, Upstash provides application storage, and Arc records
            public blockchain transactions. Temporary authorization data expires automatically; public blockchain
            records cannot be deleted.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">Questions</h2>
          <p className="mt-2">
            Contact ArcLancer through the{' '}
            <Link className="font-semibold text-blue-700 hover:underline" href="/support">
              support page
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
