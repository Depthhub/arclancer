import type { ChainOption } from './types';

export const ARC_TESTNET_CHAIN: ChainOption = {
    id: 'Arc_Testnet',
    label: 'Arc Testnet',
    chainId: 5042002,
    explorerUrl: 'https://testnet.arcscan.app',
};

export const SOURCE_CHAINS: ChainOption[] = [
    {
        id: 'Ethereum_Sepolia',
        label: 'Ethereum Sepolia',
        chainId: 11155111,
        explorerUrl: 'https://sepolia.etherscan.io',
    },
    {
        id: 'Base_Sepolia',
        label: 'Base Sepolia',
        chainId: 84532,
        explorerUrl: 'https://sepolia.basescan.org',
    },
    {
        id: 'Polygon_Amoy',
        label: 'Polygon Amoy',
        chainId: 80002,
        explorerUrl: 'https://amoy.polygonscan.com',
    },
];

export function getChainById(id: string): ChainOption | undefined {
    if (id === ARC_TESTNET_CHAIN.id) return ARC_TESTNET_CHAIN;
    return SOURCE_CHAINS.find((c) => c.id === id);
}

export function defaultFromChain(direction: 'inbound' | 'outbound'): string {
    return direction === 'inbound' ? SOURCE_CHAINS[0].id : ARC_TESTNET_CHAIN.id;
}

export function defaultToChain(direction: 'inbound' | 'outbound'): string {
    return direction === 'inbound' ? ARC_TESTNET_CHAIN.id : SOURCE_CHAINS[0].id;
}
