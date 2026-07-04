import { NextResponse } from 'next/server';
import { markPaymentComplete } from '@/lib/agents/taskRunner';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = (await request.json()) as {
            payerAddress?: string;
            paymentTxHash?: string;
        };

        if (!body.payerAddress) {
            return NextResponse.json({ ok: false, error: 'payerAddress required' }, { status: 400 });
        }

        await markPaymentComplete(body.payerAddress, id, body.paymentTxHash);
        return NextResponse.json({ ok: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Payment record failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
