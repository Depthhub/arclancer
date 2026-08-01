import { getJsonStore } from '@/lib/dealCopilot/storage';
import { executeAgentTask } from '@/lib/dealCopilot/agentTools';
import { getAgentMeta } from './metadataStore';
import { fetchAgentById } from './registry';
import type { AgentRunResponse } from './types';

const PAYMENT_TTL = 3600;

function paymentKey(payer: string, agentId: string): string {
    return `agent_web_paid:${payer.toLowerCase()}:${agentId}`;
}

function pendingKey(payer: string): string {
    return `agent_web_pending:${payer.toLowerCase()}`;
}

export async function checkPaywall(
    agentId: string,
    payerAddress: string
): Promise<{ required: boolean; price: number; ownerWallet: string }> {
    const onchain = await fetchAgentById(Number(agentId));
    const meta = await getAgentMeta(agentId);
    const price = meta?.price ?? onchain?.taskFee ?? 0;
    const ownerWallet = meta?.ownerWallet ?? onchain?.ownerAddress ?? '';

    if (!price || price <= 0) {
        return { required: false, price: 0, ownerWallet };
    }

    if (ownerWallet.toLowerCase() === payerAddress.toLowerCase()) {
        return { required: false, price, ownerWallet };
    }

    const store = getJsonStore();
    const paid = await store.getJSON<{ txHash?: string }>(paymentKey(payerAddress, agentId));
    if (paid) {
        return { required: false, price, ownerWallet };
    }

    return { required: true, price, ownerWallet };
}

export async function markPaymentComplete(
    payerAddress: string,
    agentId: string,
    txHash?: string
): Promise<void> {
    const store = getJsonStore();
    await store.setJSON(paymentKey(payerAddress, agentId), { txHash, at: Date.now() }, PAYMENT_TTL);
    await store.del(pendingKey(payerAddress));
}

export async function setPendingPayment(
    payerAddress: string,
    agentId: string,
    taskText: string,
    price: number,
    ownerWallet: string
): Promise<void> {
    const store = getJsonStore();
    await store.setJSON(
        pendingKey(payerAddress),
        { agentId, taskText, price, ownerWallet },
        PAYMENT_TTL
    );
}

export async function runAgentTask(params: {
    agentId: string;
    taskText: string;
    payerAddress: string;
    paymentTxHash?: string;
}): Promise<AgentRunResponse> {
    const { agentId, taskText, payerAddress, paymentTxHash } = params;

    const onchain = await fetchAgentById(Number(agentId));
    if (!onchain) {
        return { ok: false, error: 'Agent not found on-chain' };
    }
    if (!onchain.isActive) {
        return { ok: false, error: 'Agent is not active' };
    }

    const paywall = await checkPaywall(agentId, payerAddress);
    if (paywall.required) {
        if (paymentTxHash) {
            await markPaymentComplete(payerAddress, agentId, paymentTxHash);
        } else {
            await setPendingPayment(payerAddress, agentId, taskText, paywall.price, paywall.ownerWallet);
            return {
                ok: false,
                requiresPayment: true,
                price: paywall.price,
                ownerWallet: paywall.ownerWallet,
            };
        }
    }

    const store = getJsonStore();
    const webFromId = Math.abs(
        payerAddress.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    );

    const routing = await executeAgentTask(store, webFromId, agentId, taskText);
    const taskId = `web-${Date.now()}`;
    await store.setJSON(
        `agent_web_task:${taskId}`,
        { agentId, taskText, payerAddress, status: 'routed', routing, createdAt: Date.now() },
        PAYMENT_TTL
    );
    return { ok: true, taskId, response: routing.message, routing };
}

export async function getWebTask(taskId: string) {
    const store = getJsonStore();
    return store.getJSON<{
        agentId: string;
        taskText: string;
        payerAddress: string;
        status: string;
        response?: string;
        routing?: AgentRunResponse['routing'];
        createdAt: number;
    }>(`agent_web_task:${taskId}`);
}
