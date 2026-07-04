import { NextResponse } from 'next/server';
import { getWebTask } from '@/lib/agents/taskRunner';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const task = await getWebTask(taskId);
        if (!task) {
            return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 });
        }
        return NextResponse.json({ ok: true, task });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
