import { NextResponse } from 'next/server';
import { verifyAgentOwner } from '@/lib/agents/registry';
import { mergeAgentMeta } from '@/lib/agents/metadataStore';
import { fetchAgentById } from '@/lib/agents/registry';
import type { AgentMeta } from '@/lib/agents/types';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const agentId = Number(id);
        if (!Number.isFinite(agentId) || agentId <= 0) {
            return NextResponse.json({ ok: false, error: 'Invalid agent id' }, { status: 400 });
        }

        const body = (await request.json()) as AgentMeta & { ownerAddress?: string };
        const ownerAddress = body.ownerWallet ?? body.ownerAddress;
        if (!ownerAddress || typeof ownerAddress !== 'string') {
            return NextResponse.json({ ok: false, error: 'ownerAddress required' }, { status: 400 });
        }

        const isOwner = await verifyAgentOwner(agentId, ownerAddress);
        if (!isOwner) {
            return NextResponse.json({ ok: false, error: 'Not agent owner' }, { status: 403 });
        }

        const onchain = await fetchAgentById(agentId);
        const meta = await mergeAgentMeta(agentId, {
            name: body.name ?? onchain?.name,
            systemPrompt: body.systemPrompt,
            skills: body.skills,
            description: body.description,
            price: body.price ?? onchain?.taskFee,
            ownerWallet: ownerAddress.toLowerCase(),
            createdAt: body.createdAt ?? new Date().toISOString(),
        });

        return NextResponse.json({ ok: true, meta });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to save metadata';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
