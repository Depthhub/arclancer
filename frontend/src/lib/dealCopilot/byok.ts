/**
 * BYOK (Bring Your Own Key) — per-user LLM API key management.
 * Users set their own Groq key via /setkey gsk_xxxxx.
 * Keys are encrypted with the same AES-256-GCM used for wallets.
 */
import { encryptPrivateKey, decryptPrivateKey } from "@/lib/dealCopilot/wallet";
import type { JsonStore } from "@/lib/dealCopilot/storage";

const KEY_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

function apiKeyStoreKey(telegramUserId: number): string {
  return `byok:groq:${telegramUserId}`;
}

/**
 * Save a user's API key. Stored as plaintext — already protected by
 * per-user Redis namespace and Telegram auth.
 */
export async function saveUserApiKey(
  store: JsonStore,
  telegramUserId: number,
  apiKey: string
): Promise<void> {
  // Always store plaintext — encryption round-trip was corrupting keys
  await store.setJSON(apiKeyStoreKey(telegramUserId), { plaintext: apiKey.trim() }, KEY_TTL_SECONDS);
}

/**
 * Helper to strictly validate an OpenRouter key.
 */
function isValidApiKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const cleaned = key.replace(/[^\x20-\x7E]/g, "").trim();
  return (cleaned.startsWith("sk-or-") || cleaned.startsWith("gsk_")) && cleaned.length > 20;
}

/**
 * Retrieve a user's API key.
 */
export async function getUserApiKey(
  store: JsonStore,
  telegramUserId: number
): Promise<string | null> {
  const record = await store.getJSON<{ encrypted?: string; plaintext?: string }>(
    apiKeyStoreKey(telegramUserId)
  );
  if (!record) return null;

  // Prefer plaintext (new format)
  if (record.plaintext) {
    const cleaned = record.plaintext.replace(/[^\x20-\x7E]/g, "").trim();
    if (isValidApiKey(cleaned)) return cleaned;
  }

  // Legacy: try encrypted
  if (record.encrypted) {
    try {
      const decrypted = decryptPrivateKey(record.encrypted, `groq:${telegramUserId}`);
      const cleaned = decrypted.replace(/[^\x20-\x7E]/g, "").trim();
      if (isValidApiKey(cleaned)) return cleaned;
    } catch {
      // ignore decryption errors
    }
  }

  return null;
}
/**
 * Delete a user's stored API key.
 */
export async function deleteUserApiKey(
  store: JsonStore,
  telegramUserId: number
): Promise<void> {
  await store.del(apiKeyStoreKey(telegramUserId));
}

/**
 * Resolve the API key to use for a given user.
 * Priority: user's own key > OPENROUTER_API_KEY > OPENROUTER_API_KEYS > hardcoded fallback.
 */
export async function resolveApiKey(
  store: JsonStore,
  telegramUserId: number
): Promise<string | null> {
  const userKey = await getUserApiKey(store, telegramUserId);
  if (userKey && isValidApiKey(userKey)) return userKey;

  // Fallback to server Groq key (preferred for agent execution)
  const groqKey = (process.env.GROQ_API_KEY ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  if (groqKey && groqKey.startsWith("gsk_") && groqKey.length > 20) return groqKey;

  // Fallback to server key (OpenRouter)
  const singleKey = (process.env.OPENROUTER_API_KEY ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  if (isValidApiKey(singleKey)) return singleKey;

  // Try comma-separated key list
  const multiKeys = (process.env.OPENROUTER_API_KEYS ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  if (multiKeys) {
    const first = multiKeys.split(",")[0]?.trim();
    if (isValidApiKey(first)) return first;
  }

  // No hardcoded fallback — return null so callers can handle gracefully
  return null;
}
