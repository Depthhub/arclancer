/** Normalize secret/env values that may include quotes or stray whitespace from hosting panels. */
export function sanitizeEnvValue(value: string | undefined): string {
  if (!value) return "";
  let normalized = value.replace(/[\r\n]/g, "").trim();
  normalized = normalized.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
  return normalized;
}

export function normalizeRestUrl(value: string): string {
  const sanitized = sanitizeEnvValue(value);
  if (!sanitized) return "";
  if (sanitized.startsWith("EV[")) {
    throw new Error("UPSTASH_REDIS_REST_URL is an unresolved DigitalOcean secret reference");
  }
  if (/^https?:\/\//i.test(sanitized)) return sanitized.replace(/\/$/, "");
  return `https://${sanitized.replace(/^\/*/, "")}`.replace(/\/$/, "");
}
