import { normalizeUsername, isEthAddress } from './username';
import { isUserProfile, usernameKey } from './storeKeys';
import { getJsonStore } from '@/lib/dealCopilot/storage';
import type { JsonStore } from '@/lib/dealCopilot/storage';

export type FreelancerResolveResult =
  | { ok: true; walletAddress: string; username: string | null }
  | { ok: false; error: string };

export async function resolveFreelancerInput(
  raw: string,
  store?: JsonStore
): Promise<FreelancerResolveResult> {
  const trimmed = raw.trim();
  if (isEthAddress(trimmed)) {
    return { ok: true, walletAddress: trimmed, username: null };
  }

  const username = normalizeUsername(trimmed);
  if (!username) {
    return {
      ok: false,
      error: 'Enter a username like samuel (no @ needed) or ask them to sign up on ArcLancer first.',
    };
  }

  const profileStore = store ?? getJsonStore();
  const profile = await profileStore.getJSON(usernameKey(username));
  if (!isUserProfile(profile)) {
    return {
      ok: false,
      error: `No account found for @${username}. Ask them to sign in on arclancer.xyz first.`,
    };
  }

  return { ok: true, walletAddress: profile.walletAddress, username: profile.username };
}
