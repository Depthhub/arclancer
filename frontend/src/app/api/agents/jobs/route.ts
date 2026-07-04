import { NextResponse } from 'next/server';
import { createAgenticJob, getAgenticJobInfo } from '@/lib/dealCopilot/arcAgent';

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            privateKey?: string;
            providerAddress?: string;
            description?: string;
            budgetUsdc?: number;
            expiryHours?: number;
        };

        if (!body.privateKey || !body.providerAddress || !body.description || !body.budgetUsdc) {
            return NextResponse.json(
                { ok: false, error: 'privateKey, providerAddress, description, budgetUsdc required' },
                { status: 400 }
            );
        }

        const result = await createAgenticJob(body.privateKey as `0x${string}`, {
            providerAddress: body.providerAddress,
            description: body.description,
            budgetUsdc: body.budgetUsdc,
            expiryHours: body.expiryHours,
        });

        return NextResponse.json({ ok: result.success, ...result });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Job create failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        if (!jobId) {
            return NextResponse.json({ ok: false, error: 'jobId required' }, { status: 400 });
        }
        const info = await getAgenticJobInfo(jobId);
        return NextResponse.json({ ok: true, job: info });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Job fetch failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
