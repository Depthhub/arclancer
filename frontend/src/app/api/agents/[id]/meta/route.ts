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
        if (!body.skill_uri?.trim()) {
            return NextResponse.json({ ok: false, error: 'skill_uri required' }, { status: 400 });
        }
        const skillUri = body.skill_uri.trim();
        if (!/^(https:\/\/|ipfs:\/\/|ar:\/\/)/i.test(skillUri)) {
            return NextResponse.json(
                { ok: false, error: 'skill_uri must use HTTPS, IPFS, or Arweave' },
                { status: 400 }
            );
        }
        const contentHash = body.content_hash?.trim();
        if (contentHash && !/^[a-fA-F0-9]{64}$/.test(contentHash)) {
            return NextResponse.json(
                { ok: false, error: 'content_hash must be a SHA-256 hex digest' },
                { status: 400 }
            );
        }
        const executionMode = body.execution_mode ?? 'inbox';
        if (executionMode !== 'inbox' && executionMode !== 'creator_mcp') {
            return NextResponse.json({ ok: false, error: 'Invalid execution_mode' }, { status: 400 });
        }
        if (executionMode === 'creator_mcp' && !body.mcp_endpoint?.trim()) {
            return NextResponse.json({ ok: false, error: 'mcp_endpoint required for creator_mcp' }, { status: 400 });
        }
        if (
            executionMode === 'creator_mcp' &&
            !/^https:\/\//i.test(body.mcp_endpoint?.trim() ?? '')
        ) {
            return NextResponse.json(
                { ok: false, error: 'mcp_endpoint must use HTTPS' },
                { status: 400 }
            );
        }

        const onchain = await fetchAgentById(agentId);
        const meta = await mergeAgentMeta(agentId, {
            name: body.name ?? onchain?.name,
            skill_uri: skillUri,
            content_hash: contentHash || undefined,
            execution_mode: executionMode,
            mcp_endpoint: executionMode === 'creator_mcp' ? body.mcp_endpoint?.trim() : undefined,
            skills: body.skills,
            description: body.description,
            price: body.price ?? onchain?.taskFee,
            ownerWallet: ownerAddress.toLowerCase(),
            createdAt: body.createdAt ?? new Date().toISOString(),
        });

        return NextResponse.json({
            ok: true,
            meta: {
                name: meta.name,
                skill_uri: meta.skill_uri,
                content_hash: meta.content_hash,
                execution_mode: meta.execution_mode,
                mcp_endpoint: meta.mcp_endpoint,
                skills: meta.skills,
                description: meta.description,
                price: meta.price,
                ownerWallet: meta.ownerWallet,
                createdAt: meta.createdAt,
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to save metadata';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
