import type { BridgeConfig, BridgeFeeEstimate, BridgeProgressStep, BridgeResult } from './types';
import { BridgeKit } from '@circle-fin/bridge-kit'
import type { BridgeChainIdentifier } from '@circle-fin/bridge-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'



export async function EstimateBridge(config: BridgeConfig): Promise<BridgeFeeEstimate> {


    const kit = new BridgeKit()



    const amount = config.amount.toString();

    if (!window.ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask.");
    }
    // Create adapters from browser wallet providers
    const adapter = await createViemAdapterFromProvider({
    provider: window.ethereum,
    })

    // Execute bridge operation
    const result = await kit.estimate({
    from: { adapter, chain: config.fromChainId as BridgeChainIdentifier },
    to: { adapter, chain: config.toChainId as BridgeChainIdentifier},
    amount: amount,
    config: { transferSpeed: config.transferSpeed },
    })

    console.log("cctp estimate result:", result); 

    return {
        transferAmount: config.amount,
        cctpProtocolFee: Number(result.fees[0].amount ?? 0),
        sourceGasUsd:  Number(result.gasFees?.[0]?.fees?.fee ?? 0),
        receiveAmount: Number(result.amount),
        transferSpeed: config.transferSpeed,
    };
}

export async function ExecuteBridge(
    config: BridgeConfig,
    onStep: (step: BridgeProgressStep) => void
): Promise<BridgeResult> {

    const kit = new BridgeKit()


    const bridgeHandler = (event: any) => {
        switch (event.method) {
            case "approve":
            case "burn":
            case "fetchAttestation":
            case "mint":
                onStep(event.method);
                break;

            case "reAttest":
                onStep("fetchAttestation");
                break;
        }
    };

    kit.on("*", bridgeHandler);


    const amount = config.amount.toString();

    if (!window.ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask.");
    }
    // Create adapters from browser wallet providers
    const adapter = await createViemAdapterFromProvider({
    provider: window.ethereum,
    })

    let result;

    try {
        result = await kit.bridge({
            from: { adapter, chain: config.fromChainId as BridgeChainIdentifier },
            to: {
                adapter,
                chain: config.toChainId as BridgeChainIdentifier,
                useForwarder: true,
            },
            amount,
            config: {
                transferSpeed: config.transferSpeed,
            },
        });
    } catch (err) {
        throw new Error(`Bridge execution failed: ${(err as Error).message}`);
    } finally {
        kit.off("*", bridgeHandler);
    }

    if (result.state === 'error') {
        const failedStep = result.steps.find((s) => s.state === 'error');
        throw Object.assign(
            new Error(`Bridge failed at step "${failedStep?.name ?? 'unknown'}": ${failedStep?.error ?? 'unknown error'}`)
        );
    }

    console.log("cctp bridge result:", result);
    return {
        txHash: result.steps[result.steps.length - 1]['txHash']!,
        explorerUrl: result.steps[result.steps.length - 1]?.explorerUrl ??
             `https://testnet.arcscan.app/tx/${result.steps[result.steps.length - 1].txHash}`,
        receiveAmount: Number(result.amount),
        fromChain: config.fromChainId.toString(),
        toChain: config.toChainId.toString(),
    };
}
