import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, type Chain } from 'viem';

// Arc Testnet — chain config for RainbowKit + wagmi.
//
// Arc is stablecoin-native: users pay gas in USDC (no volatile gas token).
// Docs: https://docs.arc.network/arc/references/connect-to-arc
// Gas/fees model: https://docs.arc.network/arc/references/gas-and-fees
// Faucet (test USDC): https://faucet.circle.com
// Explorer: https://testnet.arcscan.app
export const arcTestnet: Chain = {
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: {
        // Arc uses USDC as gas; wallet UIs should display USDC as the native currency.
        // Note: Arc docs also mention native USDC precision differs from the optional ERC-20 interface.
        decimals: 6,
        name: 'USDC',
        symbol: 'USDC',
    },
    rpcUrls: {
        default: {
            // `.trim()` is defensive: Vercel/PowerShell env injection can include trailing whitespace/newlines,
            // which breaks URL parsing and can cause "invalid address" style errors elsewhere.
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
    // WalletConnect Project ID is required for RainbowKit connectors.
    // `.trim()` prevents subtle failures when env values contain newlines.
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || 'demo-project-id',
    chains: [arcTestnet],
    transports: {
        [arcTestnet.id]: http(
            process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL?.trim() || 'https://rpc.testnet.arc.network'
        ),
    },
    ssr: true,
});
