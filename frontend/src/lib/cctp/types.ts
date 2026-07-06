export type BridgeDirection = 'inbound' | 'outbound';

export type TransferSpeed = 'FAST' | 'SLOW';

export type BridgeUiPhase =
    | 'configure'
    | 'estimating'
    | 'review'
    | 'bridging'
    | 'success'
    | 'error';

export type BridgeProgressStep = 'approve' | 'burn' | 'fetchAttestation' | 'mint';

export interface ChainOption {
    id: string;
    label: string;
    chainId: number;
    explorerUrl: string;
}

export interface BridgeFeeEstimate {
    transferAmount: number;
    cctpProtocolFee: number;
    sourceGasUsd: number;
    receiveAmount: number;
    transferSpeed: TransferSpeed;
}

export interface BridgeResult {
    txHash: string;
    explorerUrl: string;
    receiveAmount: number;
    fromChain: string;
    toChain: string;
}

export interface BridgeConfig {
    direction: BridgeDirection;
    fromChainId: string;
    toChainId: string;
    amount: number;
    transferSpeed: TransferSpeed;
}
