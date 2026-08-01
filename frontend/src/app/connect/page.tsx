import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowUpRight,
    Bot,
    CheckCircle2,
    Cloud,
    LockKeyhole,
    MessageSquare,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';
import { ConnectorTokenCard } from '@/components/wallet/ConnectorTokenCard';
import { PlatformInstallButton } from '@/components/wallet/PlatformInstallButton';

const MCP_URL =
    process.env.NEXT_PUBLIC_MCP_URL?.trim() || 'https://arclancer.xyz/mcp';
const CHATGPT_INSTALL_URL =
    process.env.NEXT_PUBLIC_CHATGPT_INSTALL_URL?.trim() || 'https://chatgpt.com/plugins';
const CLAUDE_INSTALL_URL =
    `https://claude.ai/customize/connectors?modal=add-custom-connector` +
    `&connectorName=${encodeURIComponent('ArcLancer')}` +
    `&connectorUrl=${encodeURIComponent(MCP_URL)}`;

export const metadata: Metadata = {
    title: 'Connect ArcLancer to ChatGPT or Claude',
    description: 'Connect ChatGPT or Claude to ArcLancer through the hosted MCP server.',
};

const chatGptSteps = [
    'Open ChatGPT Plugins and enable Developer mode if ArcLancer is not yet listed for your account.',
    `Create an app named “ArcLancer” and enter ${MCP_URL}. ChatGPT will discover ArcLancer OAuth automatically.`,
    'Select Connect, sign in to your Circle wallet on ArcLancer, review the requested permissions, and approve.',
    'Enable ArcLancer in a new chat and keep confirmation enabled for write tools.',
];

const claudeSteps = [
    'Select the button below to open Claude’s Add custom connector dialog with ArcLancer prefilled.',
    'Review the connector name and MCP URL, then select Add and Connect.',
    'Sign in to your Circle wallet on ArcLancer, review the requested permissions, and approve.',
    'Enable ArcLancer for your conversation.',
];

function SetupCard({
    title,
    subtitle,
    steps,
    icon,
    docsHref,
    actionHref,
    actionLabel,
    actionCopyText,
}: {
    title: string;
    subtitle: string;
    steps: string[];
    icon: React.ReactNode;
    docsHref: string;
    actionHref: string;
    actionLabel: string;
    actionCopyText?: string;
}) {
    return (
        <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
                        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
                    </div>
                </div>
                <Link
                    href={docsHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${title} connector documentation`}
                    className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                    <ArrowUpRight className="h-5 w-5" />
                </Link>
            </div>

            <ol className="space-y-5">
                {steps.map((step, index) => (
                    <li key={step} className="flex gap-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                            {index + 1}
                        </span>
                        <p className="pt-0.5 text-sm leading-6 text-neutral-600">{step}</p>
                    </li>
                ))}
            </ol>
            <PlatformInstallButton href={actionHref} label={actionLabel} copyText={actionCopyText} />
        </article>
    );
}

export default function ConnectPage() {
    return (
        <div className="min-h-screen bg-neutral-50">
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-20">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
                        <Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
                    </div>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        <Cloud className="h-4 w-4" />
                        Hosted MCP connector
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
                        Bring ArcLancer into your AI chat
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-500">
                        Find talent, draft milestone escrows, create agents, and check Arc Testnet USDC balances from
                        ChatGPT or Claude.
                    </p>

                    <div className="mx-auto mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-left">
                        <LockKeyhole className="ml-1 h-5 w-5 shrink-0 text-neutral-500" />
                        <code className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap text-sm font-semibold text-neutral-800">
                            {MCP_URL}
                        </code>
                    </div>
                    <p className="mt-3 text-xs text-neutral-400">Copy this HTTPS URL into your connector setup.</p>
                </div>
            </section>

            <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
                <div className="grid gap-6 lg:grid-cols-2">
                    <SetupCard
                        title="ChatGPT"
                        subtitle="Custom app via Developer mode"
                        steps={chatGptSteps}
                        icon={<Bot className="h-6 w-6" />}
                        docsHref="https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt"
                        actionHref={CHATGPT_INSTALL_URL}
                        actionLabel="Open ChatGPT Plugins"
                        actionCopyText={MCP_URL}
                    />
                    <SetupCard
                        title="Claude"
                        subtitle="Remote custom connector"
                        steps={claudeSteps}
                        icon={<MessageSquare className="h-6 w-6" />}
                        docsHref="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp"
                        actionHref={CLAUDE_INSTALL_URL}
                        actionLabel="Add to Claude"
                    />
                </div>

                <details className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">
                    <summary className="cursor-pointer text-sm font-semibold text-neutral-900">
                        Advanced: create a manual connector token
                    </summary>
                    <p className="mt-2 text-sm text-neutral-500">
                        Only use this fallback with clients that support a custom Authorization header. ChatGPT uses
                        the OAuth flow above.
                    </p>
                    <div className="mt-5">
                        <ConnectorTokenCard />
                    </div>
                </details>

                <section className="mt-10 overflow-hidden rounded-3xl bg-neutral-900 text-white">
                    <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.35fr]">
                        <div>
                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-bold">Confirm before funds move</h2>
                            <p className="mt-3 text-sm leading-6 text-neutral-400">
                                ArcLancer includes read and write tools. Review every proposed action and keep your AI
                                client&apos;s tool approvals set to prompt.
                            </p>
                        </div>
                        <ul className="space-y-4 text-sm leading-6 text-neutral-300">
                            <li className="flex gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                                Deal deployment requires an explicit confirmation step. Treat funding, releases,
                                disputes, and agent registration as separate actions to review.
                            </li>
                            <li className="flex gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                                Private keys are not returned through MCP. Never paste a seed phrase, private key, or
                                one-time code into a chat.
                            </li>
                            <li className="flex gap-3">
                                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                                ArcLancer currently uses Arc Testnet. Confirm the network and full address before
                                transferring test USDC.
                            </li>
                        </ul>
                    </div>
                </section>

                <div className="mt-8 text-center text-sm text-neutral-500">
                    Connector availability and menu names can vary by plan and workspace policy.{' '}
                    <Link href="/" className="font-semibold text-neutral-900 hover:underline">
                        Return to ArcLancer
                    </Link>
                </div>
            </main>
        </div>
    );
}
