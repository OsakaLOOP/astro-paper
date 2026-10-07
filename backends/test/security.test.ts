import assert from "node:assert/strict";
import test from "node:test";
import {
  seal,
  signWebhook,
  unseal,
  verifyWebhook,
} from "../src/security.js";

const SECRET = "test-secret";

test("seal/unseal round-trips structured payloads", () => {
  const value = { sub: "user-1", email: "a@example.com", nested: [1, 2, 3] };
  const sealed = seal(value, SECRET);
  assert.match(sealed, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(unseal(sealed, SECRET), value);
});

test("seal produces a different ciphertext on every call", () => {
  const first = seal("same", SECRET);
  const second = seal("same", SECRET);
  assert.notEqual(first, second);
  assert.equal(unseal(first, SECRET), "same");
  assert.equal(unseal(second, SECRET), "same");
});

test("unseal rejects a wrong secret and tampered payloads", () => {
  const sealed = seal({ ok: true }, SECRET);
  assert.throws(() => unseal(sealed, "other-secret"));

  const raw = Buffer.from(sealed, "base64url");
  raw[raw.length - 1] ^= 0xff;
  assert.throws(() => unseal(raw.toString("base64url"), SECRET));
});

test("webhook signatures verify within the tolerance window", () => {
  const now = 1_800_000_000_000;
  const timestamp = Math.floor(now / 1000);
  const signature = signWebhook("{}", "evt-1", timestamp, SECRET);
  assert.equal(
    verifyWebhook("{}", "evt-1", timestamp, signature, SECRET, now),
    true
  );
});

test("webhook signatures reject stale, malformed and mismatched input", () => {
  const now = 1_800_000_000_000;
  const timestamp = Math.floor(now / 1000);
  const signature = signWebhook("{}", "evt-1", timestamp, SECRET);

  // Older than the 300s tolerance.
  assert.equal(
    verifyWebhook("{}", "evt-1", timestamp - 301, signature, SECRET, now),
    false
  );
  // Non-integer timestamp.
  assert.equal(
    verifyWebhook("{}", "evt-1", timestamp + 0.5, signature, SECRET, now),
    false
  );
  // Malformed signature.
  assert.equal(
    verifyWebhook("{}", "evt-1", timestamp, "not-a-signature", SECRET, now),
    false
  );
  // Signature for a different secret.
  assert.equal(
    verifyWebhook(
      "{}",
      "evt-1",
      timestamp,
      signature,
      "other-secret",
      now
    ),
    false
  );
  // Signature for a different body.
  assert.equal(
    verifyWebhook('{"a":1}', "evt-1", timestamp, signature, SECRET, now),
    false
  );
});
