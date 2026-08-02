import type { UserProfile } from './types';

export const PROFILE_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

export function usernameKey(username: string) {
  return `profile:username:${username}`;
}

export function walletKey(walletAddress: string) {
  return `profile:wallet:${walletAddress.toLowerCase()}`;
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as UserProfile;
  return (
    typeof p.username === 'string' &&
    typeof p.walletAddress === 'string' &&
    typeof p.createdAt === 'number'
  );
}
