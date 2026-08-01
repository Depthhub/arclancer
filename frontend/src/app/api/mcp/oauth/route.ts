import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getJsonStore } from '@/lib/dealCopilot/storage';

const CIRCLE_BASE_URL =
  process.env.NEXT_PUBLIC_CIRCLE_BASE_URL?.trim() || 'https://api.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY?.trim();
const CODE_TTL_SECONDS = 5 * 60;

interface OAuthClient {
  clientId: string;
  clientName: string;
  redirectUris: string[];
}

interface OAuthAuthorizationRequest {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope: string[];
  codeChallenge: string;
}

function requestKey(requestId: string) {
  return `oauth:request:${requestId}`;
}

function codeKey(code: string) {
  return `oauth:code:${createHash('sha256').update(code).digest('hex')}`;
}

function validRequestId(value: string) {
  return /^arc_req_[A-Za-z0-9_-]{20,}$/.test(value);
}

function redirectWith(
  authorization: OAuthAuthorizationRequest,
  params: Record<string, string>
) {
  const redirect = new URL(authorization.redirectUri);
  for (const [key, value] of Object.entries(params)) redirect.searchParams.set(key, value);
  if (authorization.state) redirect.searchParams.set('state', authorization.state);
  return redirect.toString();
}

export async function GET(request: Request) {
  const requestId = new URL(request.url).searchParams.get('request_id') ?? '';
  if (!validRequestId(requestId)) {
    return NextResponse.json({ error: 'Invalid authorization request' }, { status: 400 });
  }

  const store = getJsonStore();
  const authorization = await store.getJSON<OAuthAuthorizationRequest>(requestKey(requestId));
  if (!authorization) {
    return NextResponse.json({ error: 'Authorization request expired' }, { status: 404 });
  }
  const client = await store.getJSON<OAuthClient>(`oauth:client:${authorization.clientId}`);
  if (!client) {
    return NextResponse.json({ error: 'Connector registration expired' }, { status: 404 });
  }

  return NextResponse.json({
    requestId,
    clientName: client.clientName,
    scopes: authorization.scope,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  if (!validRequestId(requestId)) {
    return NextResponse.json({ error: 'Invalid authorization request' }, { status: 400 });
  }

  const store = getJsonStore();
  let authorization = await store.getJSON<OAuthAuthorizationRequest>(requestKey(requestId));
  if (!authorization) {
    return NextResponse.json({ error: 'Authorization request expired' }, { status: 404 });
  }

  if (body?.approved === false) {
    const denied = await store.getdelJSON<OAuthAuthorizationRequest>(requestKey(requestId));
    if (!denied) {
      return NextResponse.json({ error: 'Authorization request already used' }, { status: 409 });
    }
    return NextResponse.json({
      redirectTo: redirectWith(denied, {
        error: 'access_denied',
        error_description: 'The user denied access',
      }),
    });
  }

  const userToken = typeof body?.userToken === 'string' ? body.userToken.trim() : '';
  if (!userToken || !CIRCLE_API_KEY) {
    return NextResponse.json({ error: 'Connect your Circle wallet first' }, { status: 401 });
  }

  const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${CIRCLE_API_KEY}`,
      'X-User-Token': userToken,
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json({ error: 'Circle session is invalid or expired' }, { status: 401 });
  }

  const wallets = Array.isArray(payload?.data?.wallets) ? payload.data.wallets : [];
  const wallet = wallets.find((item: { blockchain?: string }) => item.blockchain === 'ARC-TESTNET');
  if (!wallet?.id || !/^0x[a-fA-F0-9]{40}$/.test(wallet.address ?? '')) {
    return NextResponse.json({ error: 'No Arc Testnet wallet found' }, { status: 404 });
  }

  authorization =
    (await store.getdelJSON<OAuthAuthorizationRequest>(requestKey(requestId))) ?? null;
  if (!authorization) {
    return NextResponse.json({ error: 'Authorization request already used' }, { status: 409 });
  }

  const code = `arc_code_${randomBytes(32).toString('base64url')}`;
  await store.setJSON(
    codeKey(code),
    {
      clientId: authorization.clientId,
      redirectUri: authorization.redirectUri,
      scope: authorization.scope,
      codeChallenge: authorization.codeChallenge,
      subject: `circle:${wallet.id}`,
      walletAddress: wallet.address,
      walletId: wallet.id,
    },
    CODE_TTL_SECONDS
  );
  return NextResponse.json({
    redirectTo: redirectWith(authorization, { code }),
  });
}
