import { CIRCLE_ARC_BLOCKCHAIN } from '@/lib/circle/featureFlag';

const CIRCLE_BASE_URL =
  process.env.NEXT_PUBLIC_CIRCLE_BASE_URL?.trim() || 'https://api.circle.com';

/** Resolve primary Arc wallet address for a Circle user session token. */
export async function walletAddressForUserToken(userToken: string): Promise<string | null> {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-User-Token': userToken,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;

  const wallets =
    (payload?.data?.wallets as Array<{ address?: string; blockchain?: string }>) ?? [];
  const arc =
    wallets.find((w) => w.blockchain === CIRCLE_ARC_BLOCKCHAIN) ?? wallets[0];
  return typeof arc?.address === 'string' ? arc.address : null;
}
