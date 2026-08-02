import { NextResponse } from 'next/server';
import { walletAddressForUserToken } from '@/lib/profile/circleAuth';
import { normalizeUsername } from '@/lib/profile/username';
import {
  isUserProfile,
  PROFILE_TTL_SECONDS,
  usernameKey,
  walletKey,
} from '@/lib/profile/storeKeys';
import { getJsonStore } from '@/lib/dealCopilot/storage';

export async function GET(request: Request) {
  const userToken = new URL(request.url).searchParams.get('userToken')?.trim();
  if (!userToken) {
    return NextResponse.json({ error: 'userToken required' }, { status: 400 });
  }

  const walletAddress = await walletAddressForUserToken(userToken);
  if (!walletAddress) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const store = getJsonStore();
  const profile = await store.getJSON(walletKey(walletAddress));
  if (!isUserProfile(profile)) {
    return NextResponse.json({ walletAddress, profile: null });
  }

  return NextResponse.json({ walletAddress, profile });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userToken = typeof body?.userToken === 'string' ? body.userToken.trim() : '';
    const username = normalizeUsername(
      typeof body?.username === 'string' ? body.username : ''
    );

    if (!userToken) {
      return NextResponse.json({ error: 'userToken required' }, { status: 400 });
    }
    if (!username) {
      return NextResponse.json(
        { error: 'Username must be 3–20 characters: letters, numbers, underscore' },
        { status: 400 }
      );
    }

    const walletAddress = await walletAddressForUserToken(userToken);
    if (!walletAddress) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const store = getJsonStore();
    const existingByWallet = await store.getJSON(walletKey(walletAddress));
    if (isUserProfile(existingByWallet) && existingByWallet.username !== username) {
      return NextResponse.json(
        { error: 'You already have a username. Contact support to change it.' },
        { status: 409 }
      );
    }

    const existingByName = await store.getJSON(usernameKey(username));
    if (
      isUserProfile(existingByName) &&
      existingByName.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
    ) {
      return NextResponse.json({ error: 'That username is already taken' }, { status: 409 });
    }

    const profile = {
      username,
      walletAddress,
      createdAt: isUserProfile(existingByWallet)
        ? existingByWallet.createdAt
        : Date.now(),
    };

    await store.setJSON(usernameKey(username), profile, PROFILE_TTL_SECONDS);
    await store.setJSON(walletKey(walletAddress), profile, PROFILE_TTL_SECONDS);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[profile]', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
