import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRestUrl, sanitizeEnvValue } from "../../shared/src/store/env.js";

test("sanitizes quoted Upstash REST URLs from hosting env vars", () => {
  assert.equal(sanitizeEnvValue('"https://example.upstash.io"'), "https://example.upstash.io");
  assert.equal(normalizeRestUrl('"https://example.upstash.io\n"'), "https://example.upstash.io");
  assert.equal(normalizeRestUrl("example.upstash.io"), "https://example.upstash.io");
});

test("rejects unresolved DigitalOcean EV secret references", () => {
  assert.throws(
    () => normalizeRestUrl("EV[1:abc:token]"),
    /unresolved DigitalOcean secret reference/
  );
});
