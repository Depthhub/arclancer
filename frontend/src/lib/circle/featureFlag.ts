/** Deployment intends Circle PW (email OTP) as the primary wallet UX. */
export function isCircleWalletsPreferred(): boolean {
  return process.env.NEXT_PUBLIC_CIRCLE_WALLETS_ENABLED !== 'false';
}

/** Circle PW is active — requires App ID baked in at build time. */
export function isCircleWalletsEnabled(): boolean {
  if (!isCircleWalletsPreferred()) return false;
  return Boolean(process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim());
}

export const CIRCLE_ARC_BLOCKCHAIN = 'ARC-TESTNET' as const;
