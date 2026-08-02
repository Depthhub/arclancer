import { NextResponse } from 'next/server';
import { normalizeUsername, isEthAddress } from '@/lib/profile/username';
import { isUserProfile, usernameKey } from '@/lib/profile/storeKeys';
import { getJsonStore } from '@/lib/dealCopilot/storage';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return NextResponse.json({ error: 'q required' }, { status: 400 });
  }

  if (isEthAddress(q)) {
    return NextResponse.json({
      walletAddress: q,
      username: null,
    });
  }

  const username = normalizeUsername(q);
  if (!username) {
    return NextResponse.json({ error: 'Invalid username or address' }, { status: 400 });
  }

  const store = getJsonStore();
  const profile = await store.getJSON(usernameKey(username));
  if (!isUserProfile(profile)) {
    return NextResponse.json({ error: 'No account found for that username' }, { status: 404 });
  }

  return NextResponse.json({
    username: profile.username,
    walletAddress: profile.walletAddress,
  });
}
