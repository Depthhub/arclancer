import { NextResponse } from 'next/server';
import { runAgentTask, markPaymentComplete } from '@/lib/agents/taskRunner';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = (await request.json()) as {
            taskText?: string;
            payerAddress?: string;
            paymentTxHash?: string;
        };

        if (!body.taskText?.trim()) {
            return NextResponse.json({ ok: false, error: 'taskText required' }, { status: 400 });
        }
        if (!body.payerAddress) {
            return NextResponse.json({ ok: false, error: 'payerAddress required' }, { status: 400 });
        }

        const result = await runAgentTask({
            agentId: id,
            taskText: body.taskText.trim(),
            payerAddress: body.payerAddress,
            paymentTxHash: body.paymentTxHash,
        });

        if (result.requiresPayment) {
            return NextResponse.json(result, { status: 402 });
        }
        if (!result.ok) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Run failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
