import { NextResponse } from 'next/server';
import { CIRCLE_ARC_BLOCKCHAIN } from '@/lib/circle/featureFlag';

const CIRCLE_BASE_URL =
  process.env.NEXT_PUBLIC_CIRCLE_BASE_URL?.trim() || 'https://api.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY?.trim();

function circleHeaders(userToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (CIRCLE_API_KEY) headers.Authorization = `Bearer ${CIRCLE_API_KEY}`;
  if (userToken) headers['X-User-Token'] = userToken;
  return headers;
}

async function circleFetch(path: string, init: RequestInit) {
  const response = await fetch(`${CIRCLE_BASE_URL}${path}`, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }
  return NextResponse.json(data.data ?? data, { status: 200 });
}

export async function POST(request: Request) {
  if (!CIRCLE_API_KEY) {
    return NextResponse.json(
      { error: 'Circle API key not configured (CIRCLE_API_KEY)' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { action, ...params } = body ?? {};

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    switch (action) {
      case 'requestEmailOtp': {
        const { deviceId, email } = params;
        if (!deviceId || !email) {
          return NextResponse.json({ error: 'Missing deviceId or email' }, { status: 400 });
        }
        return circleFetch('/v1/w3s/users/email/token', {
          method: 'POST',
          headers: circleHeaders(),
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            deviceId,
            email,
          }),
        });
      }

      case 'initializeUser': {
        const { userToken } = params;
        if (!userToken) {
          return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
        }
        return circleFetch('/v1/w3s/user/initialize', {
          method: 'POST',
          headers: circleHeaders(userToken),
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            accountType: 'SCA',
            blockchains: [CIRCLE_ARC_BLOCKCHAIN],
          }),
        });
      }

      case 'listWallets': {
        const { userToken } = params;
        if (!userToken) {
          return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
        }
        return circleFetch('/v1/w3s/wallets', {
          method: 'GET',
          headers: circleHeaders(userToken),
        });
      }

      case 'getTokenBalance': {
        const { userToken, walletId } = params;
        if (!userToken || !walletId) {
          return NextResponse.json(
            { error: 'Missing userToken or walletId' },
            { status: 400 }
          );
        }
        return circleFetch(`/v1/w3s/wallets/${walletId}/balances`, {
          method: 'GET',
          headers: circleHeaders(userToken),
        });
      }

      case 'fundWallet': {
        const { address } = params;
        if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return NextResponse.json({ error: 'Missing or invalid Arc wallet address' }, { status: 400 });
        }

        if (process.env.ARC_NETWORK?.trim().toLowerCase() === 'mainnet') {
          const configuredUrl = process.env.CIRCLE_PAYMENT_GATEWAY_URL?.trim();
          if (!configuredUrl) {
            return NextResponse.json(
              { error: 'Circle Payment Gateway is not configured' },
              { status: 503 }
            );
          }
          const checkoutUrl = new URL(configuredUrl);
          checkoutUrl.searchParams.set('walletAddress', address);
          return NextResponse.json({
            mode: 'payment_gateway',
            status: 'action_required',
            checkoutUrl: checkoutUrl.toString(),
          });
        }

        return circleFetch('/v1/faucet/drips', {
          method: 'POST',
          headers: circleHeaders(),
          body: JSON.stringify({
            address,
            blockchain: CIRCLE_ARC_BLOCKCHAIN,
            usdc: true,
          }),
        });
      }

      case 'createContractExecution': {
        const {
          userToken,
          walletId,
          contractAddress,
          abiFunctionSignature,
          abiParameters,
          feeLevel = 'MEDIUM',
        } = params;
        if (!userToken || !walletId || !contractAddress || !abiFunctionSignature) {
          return NextResponse.json({ error: 'Missing contract execution params' }, { status: 400 });
        }
        return circleFetch('/v1/w3s/user/transactions/contractExecution', {
          method: 'POST',
          headers: circleHeaders(userToken),
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            walletId,
            contractAddress,
            abiFunctionSignature,
            abiParameters: abiParameters ?? [],
            fee: { type: 'level', config: { feeLevel } },
          }),
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[circle/wallets]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
