import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecodeToBuffer(input: string): Buffer {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLen);
  return Buffer.from(padded, "base64");
}

export function randomId(prefix = "draft"): string {
  return `${prefix}_${base64UrlEncode(randomBytes(16))}`;
}

export function hmacSign(payload: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(payload).digest());
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function signToken(payloadObj: unknown, secret: string): string {
  const payloadJson = JSON.stringify(payloadObj);
  const payload = base64UrlEncode(payloadJson);
  const sig = hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

export function verifyToken<T>(token: string, secret: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = hmacSign(payload, secret);
  if (!timingSafeEqualString(sig, expected)) return null;
  try {
    const buf = base64UrlDecodeToBuffer(payload);
    return JSON.parse(buf.toString("utf8")) as T;
  } catch {
    return null;
  }
}

