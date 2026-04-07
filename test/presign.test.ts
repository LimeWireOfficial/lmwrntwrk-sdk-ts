import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import * as secp256k1 from "@noble/secp256k1";
import { utf8Encode } from "../src/bytes.js";
import {
  addLmwrntwrkParamsToPresignedUrl,
  extractPresignedParams,
  removeLmwrntwrkQueryParamsFromUrl,
} from "../src/index.js";
import { buildTestPrivateKeyPemBase64 } from "./test-helpers.js";

function makePresignedUrl(sig: string): string {
  const u = new URL("https://s3.example.com/bucket/key");
  u.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  u.searchParams.set(
    "X-Amz-Credential",
    "dummy/20250101/us-east-1/s3/aws4_request",
  );
  u.searchParams.set("X-Amz-Date", "20250101T000000Z");
  u.searchParams.set("X-Amz-Expires", "900");
  u.searchParams.set("X-Amz-SignedHeaders", "host");
  u.searchParams.set("X-Amz-Signature", sig);
  return u.toString();
}

test("addLmwrntwrkParamsToPresignedUrl appends signed metadata", async () => {
  const awsSig = "deadbeef";
  const out = await addLmwrntwrkParamsToPresignedUrl(
    { privateKeyPEM: buildTestPrivateKeyPemBase64() },
    makePresignedUrl(awsSig),
    2,
  );

  const parsed = extractPresignedParams(out);
  assert.equal(parsed.awsSignature, awsSig);
  assert.equal(parsed.maxRequestCount, 2);
  assert.ok(parsed.requestId.length > 0);

  const sigBytes = Buffer.from(parsed.signature, "base64");
  const recovery = sigBytes[0] - 31;
  const compact = sigBytes.subarray(1);
  const hash = createHash("sha256")
    .update(
      utf8Encode(
        parsed.requestId + String(parsed.maxRequestCount) + parsed.awsSignature,
      ),
    )
    .digest();

  const recovered = secp256k1.Signature.fromCompact(compact)
    .addRecoveryBit(recovery)
    .recoverPublicKey(hash);
  assert.equal(Buffer.from(recovered.toRawBytes(true)).length, 33);
});

test("removeLmwrntwrkQueryParamsFromUrl removes only lmwrntwrk params", () => {
  const u = new URL(
    "https://s3.example.com/bucket/key?foo=1&x-lmwrntwrk-request-id=r1&x-lmwrntwrk-signature=s1&x-max-request-count=1&X-Amz-Signature=aws",
  );
  const cleaned = removeLmwrntwrkQueryParamsFromUrl(u);

  assert.equal(cleaned.searchParams.get("foo"), "1");
  assert.equal(cleaned.searchParams.get("X-Amz-Signature"), "aws");
  assert.equal(cleaned.searchParams.get("x-lmwrntwrk-request-id"), null);
  assert.equal(cleaned.searchParams.get("x-lmwrntwrk-signature"), null);
  assert.equal(cleaned.searchParams.get("x-max-request-count"), null);
});
