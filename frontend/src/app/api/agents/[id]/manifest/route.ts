import { NextResponse } from 'next/server';
import { getAgentListing } from '@/lib/agents/merge';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const agentId = Number(id);
        if (!Number.isFinite(agentId) || agentId <= 0) {
            return NextResponse.json({ ok: false, error: 'Invalid agent id' }, { status: 400 });
        }

        const agent = await getAgentListing(agentId);
        if (!agent) {
            return NextResponse.json({ ok: false, error: 'Agent not found' }, { status: 404 });
        }

        return NextResponse.json({
            ok: true,
            manifest: {
                agent_id: agent.id,
                name: agent.name,
                skill: agent.skill,
                skill_uri: agent.skillUri,
                content_hash: agent.contentHash,
                execution_mode: agent.executionMode,
                mcp_endpoint: agent.executionMode === 'creator_mcp' ? agent.mcpEndpoint : undefined,
                fee_usdc: agent.taskFeeUsdc,
                owner: agent.ownerAddress,
                active: agent.isActive,
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch manifest';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
