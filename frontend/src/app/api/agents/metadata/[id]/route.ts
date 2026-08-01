import { NextResponse } from 'next/server';
import { getAgentListing } from '@/lib/agents/merge';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const agentId = Number(id);
        const agent = await getAgentListing(agentId);
        if (!agent) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL?.trim() ||
            'https://arclancer.xyz';

        return NextResponse.json({
            name: agent.name,
            description: agent.description || `${agent.skill} agent on ArcLancer`,
            image: `${baseUrl}/logo.png`,
            external_url: `${baseUrl}/agents/${agent.id}`,
            attributes: [
                { trait_type: 'Skill', value: agent.skill },
                { trait_type: 'Tool', value: agent.toolName || 'None' },
                { trait_type: 'Task Fee (USDC)', value: agent.taskFeeUsdc },
                { trait_type: 'Active', value: agent.isActive },
            ],
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
