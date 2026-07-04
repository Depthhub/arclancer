import { NextResponse } from 'next/server';
import { listAgentListings } from '@/lib/agents/merge';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('active') === 'true';
        const owner = searchParams.get('owner');

        let agents = await listAgentListings(activeOnly);

        if (owner) {
            agents = agents.filter(
                (a) => a.ownerAddress.toLowerCase() === owner.toLowerCase()
            );
        }

        return NextResponse.json({ ok: true, agents });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to list agents';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
