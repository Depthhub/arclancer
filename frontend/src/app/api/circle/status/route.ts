import { NextResponse } from 'next/server';
import {
  isCircleWalletsEnabled,
  isCircleWalletsPreferred,
} from '@/lib/circle/featureFlag';

/** Public config check — does not expose secrets or call Circle. */
export async function GET() {
  const circleAppIdConfigured = Boolean(process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim());
  const circleApiKeyConfigured = Boolean(process.env.CIRCLE_API_KEY?.trim());

  return NextResponse.json({
    circleWalletsPreferred: isCircleWalletsPreferred(),
    circleWalletsUiEnabled: isCircleWalletsEnabled(),
    circleAppIdConfigured,
    circleApiKeyConfigured,
    circleReady: isCircleWalletsEnabled() && circleApiKeyConfigured,
    arcNetwork: process.env.ARC_NETWORK?.trim() || 'testnet',
  });
}
