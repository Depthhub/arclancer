/** @samuel-style handle — 3–20 chars, lowercase letters, numbers, underscore */
export function normalizeUsername(raw: string): string | null {
  const u = raw.trim().toLowerCase().replace(/^@+/, '');
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return null;
  return u;
}

export function isEthAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function formatUsername(username: string): string {
  return `@${username}`;
}
