import type { BridgeConfig, BridgeFeeEstimate, BridgeProgressStep, BridgeResult } from './types';
import { getChainById } from './chains';

const STEP_DELAY_MS = 2200;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** CCTP FAST ≈ 1 bps; SLOW = 0 */
function computeProtocolFee(amount: number, speed: BridgeConfig['transferSpeed']): number {
    if (speed === 'SLOW') return 0;
    return Math.round(amount * 0.0001 * 100) / 100;
}

export async function mockEstimateBridge(config: BridgeConfig): Promise<BridgeFeeEstimate> {
    await sleep(800);

    const cctpProtocolFee = computeProtocolFee(config.amount, config.transferSpeed);
    const sourceGasUsd = 0.01;
    const receiveAmount = Math.max(0, config.amount - cctpProtocolFee);

    return {
        transferAmount: config.amount,
        cctpProtocolFee,
        sourceGasUsd,
        receiveAmount,
        transferSpeed: config.transferSpeed,
    };
}

export async function mockExecuteBridge(
    config: BridgeConfig,
    onStep: (step: BridgeProgressStep) => void
): Promise<BridgeResult> {
    const steps: BridgeProgressStep[] = ['approve', 'burn', 'attestation', 'mint'];

    for (const step of steps) {
        onStep(step);
        await sleep(STEP_DELAY_MS);
    }

    const estimate = await mockEstimateBridge(config);
    const fromChain = getChainById(config.fromChainId);
    const toChain = getChainById(config.toChainId);
    const mockHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('')}` as `0x${string}`;

    return {
        txHash: mockHash,
        explorerUrl: `${toChain?.explorerUrl ?? 'https://testnet.arcscan.app'}/tx/${mockHash}`,
        receiveAmount: estimate.receiveAmount,
        fromChain: fromChain?.label ?? config.fromChainId,
        toChain: toChain?.label ?? config.toChainId,
    };
}
