/**
 * Server-side wallet management for the Telegram Deal Copilot.
 * Generates HD wallets, encrypts private keys with AES-256-GCM,
 * and stores them in the JsonStore (Upstash Redis or memory fallback).
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import type { JsonStore } from "@/lib/dealCopilot/storage";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const ALGORITHM = "aes-256-gcm";
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const WALLET_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface StoredWallet {
    address: string;
    encryptedPrivateKey: string; // hex-encoded: salt + iv + authTag + ciphertext
    createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Encryption helpers                                                  */
/* ------------------------------------------------------------------ */

function getEncryptionSecret(): string {
    const s = (process.env.WALLET_ENCRYPTION_SECRET ?? "").trim();
    return s.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
}

function deriveKey(secret: string, salt: Buffer): Buffer {
    return scryptSync(secret, salt, 32);
}

export function encryptPrivateKey(privateKey: string, userId: string): string {
    const secret = getEncryptionSecret();
    if (!secret) throw new Error("WALLET_ENCRYPTION_SECRET not set");

    const salt = randomBytes(SALT_LEN);
    const key = deriveKey(secret + userId, salt);
    const iv = randomBytes(IV_LEN);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Packed format: salt(16) + iv(12) + authTag(16) + ciphertext
    return Buffer.concat([salt, iv, tag, encrypted]).toString("hex");
}

export function decryptPrivateKey(encryptedHex: string, userId: string): string {
    const secret = getEncryptionSecret();
    if (!secret) throw new Error("WALLET_ENCRYPTION_SECRET not set");

    const data = Buffer.from(encryptedHex, "hex");
    const salt = data.subarray(0, SALT_LEN);
    const iv = data.subarray(SALT_LEN, SALT_LEN + IV_LEN);
    const tag = data.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
    const ciphertext = data.subarray(SALT_LEN + IV_LEN + TAG_LEN);

    const key = deriveKey(secret + userId, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

/* ------------------------------------------------------------------ */
/* Store operations                                                    */
/* ------------------------------------------------------------------ */

function walletStoreKey(telegramUserId: number): string {
    return `wallet:${telegramUserId}`;
}

export async function createWallet(
    store: JsonStore,
    telegramUserId: number
): Promise<StoredWallet> {
    const privateKey = generatePrivateKey();
    const address = privateKeyToAddress(privateKey);

    const wallet: StoredWallet = {
        address,
        encryptedPrivateKey: encryptPrivateKey(privateKey, String(telegramUserId)),
        createdAt: Date.now(),
    };

    await store.setJSON(walletStoreKey(telegramUserId), wallet, WALLET_TTL_SECONDS);
    return wallet;
}

export async function getWallet(
    store: JsonStore,
    telegramUserId: number
): Promise<StoredWallet | null> {
    return store.getJSON<StoredWallet>(walletStoreKey(telegramUserId));
}

export async function getOrCreateWallet(
    store: JsonStore,
    telegramUserId: number
): Promise<{ wallet: StoredWallet; created: boolean }> {
    const existing = await getWallet(store, telegramUserId);
    if (existing) return { wallet: existing, created: false };
    const wallet = await createWallet(store, telegramUserId);
    return { wallet, created: true };
}

/**
 * Decrypt and return the raw private key. Handle with extreme care.
 */
export function getPrivateKey(
    wallet: StoredWallet,
    telegramUserId: number
): `0x${string}` {
    const key = decryptPrivateKey(wallet.encryptedPrivateKey, String(telegramUserId));
    return key as `0x${string}`;
}

/**
 * Check if wallet features are available (encryption secret is set).
 */
export function isWalletEnabled(): boolean {
    return getEncryptionSecret().length > 0;
}
