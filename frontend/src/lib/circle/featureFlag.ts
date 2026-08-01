/** Circle Programmable Wallets — enabled when App ID + API key are configured */
export function isCircleWalletsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CIRCLE_WALLETS_ENABLED === 'false') return false;
  return Boolean(process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim());
}

export const CIRCLE_ARC_BLOCKCHAIN = 'ARC-TESTNET' as const;
