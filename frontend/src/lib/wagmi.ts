import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, type Chain } from 'viem';

// Arc Testnet — Official chain definition
// Docs: https://docs.arc.network/arc/references/connect-to-arc
// Faucet: https://faucet.circle.com
// Explorer: https://testnet.arcscan.app
export const arcTestnet: Chain = {
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: {
        decimals: 6,
        name: 'USDC',
        symbol: 'USDC',
    },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() || 'https://rpc.testnet.arc.network'],
            webSocket: ['wss://rpc.testnet.arc.network'],
        },
    },
    blockExplorers: {
        default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
    },
    testnet: true,
};

export const wagmiConfig = getDefaultConfig({
    appName: 'ArcLancer',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || 'demo-project-id',
    chains: [arcTestnet],
    transports: {
        [arcTestnet.id]: http(
            process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() || 'https://rpc.testnet.arc.network'
        ),
    },
    ssr: true,
});
