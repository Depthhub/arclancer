'use client';

import Link from 'next/link';
import { RegisterAgentWizard } from '@/components/agents/RegisterAgentWizard';
import { isAgentsUiEnabled } from '@/lib/agents/featureFlag';
import { ArrowLeft } from 'lucide-react';

export default function CreateAgentPage() {
    if (!isAgentsUiEnabled()) {
        return <div className="p-8 text-center text-neutral-500">Agent marketplace is not enabled.</div>;
    }

    return (
        <div className="min-h-screen py-8 bg-neutral-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/agents" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Marketplace
                </Link>
                <RegisterAgentWizard />
            </div>
        </div>
    );
}
