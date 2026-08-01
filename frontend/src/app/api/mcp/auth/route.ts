import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getJsonStore } from '@/lib/dealCopilot/storage';

const CIRCLE_BASE_URL =
  process.env.NEXT_PUBLIC_CIRCLE_BASE_URL?.trim() || 'https://api.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY?.trim();
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365;

function tokenKey(token: string) {
  return `mcp:token:${createHash('sha256').update(token).digest('hex')}`;
}

export async function POST(request: Request) {
  if (!CIRCLE_API_KEY) {
    return NextResponse.json({ error: 'Circle API key is not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const userToken = typeof body?.userToken === 'string' ? body.userToken.trim() : '';
  if (!userToken) {
    return NextResponse.json({ error: 'Missing Circle user token' }, { status: 400 });
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
    return NextResponse.json(
      { error: 'Circle session is invalid or expired' },
      { status: 401 }
    );
  }

  const wallets = Array.isArray(payload?.data?.wallets) ? payload.data.wallets : [];
  const wallet = wallets.find((item: { blockchain?: string }) => item.blockchain === 'ARC-TESTNET');
  if (!wallet?.id || !/^0x[a-fA-F0-9]{40}$/.test(wallet.address ?? '')) {
    return NextResponse.json({ error: 'No Arc Testnet wallet found' }, { status: 404 });
  }

  const token = `arc_${randomBytes(32).toString('base64url')}`;
  await getJsonStore().setJSON(
    tokenKey(token),
    {
      subject: `circle:${wallet.id}`,
      walletId: wallet.id,
      walletAddress: wallet.address,
      createdAt: new Date().toISOString(),
    },
    TOKEN_TTL_SECONDS
  );

  return NextResponse.json({
    token,
    mcpUrl: 'https://mcp.arclancer.xyz/mcp',
    walletAddress: wallet.address,
  });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token.startsWith('arc_')) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  await getJsonStore().del(tokenKey(token));
  return NextResponse.json({ revoked: true });
}
