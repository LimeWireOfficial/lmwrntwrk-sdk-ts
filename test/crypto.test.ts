import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import * as secp256k1 from "@noble/secp256k1";
import { ECDSASigner } from "../src/crypto.ts";
import { fromBase64, utf8Encode } from "../src/bytes.ts";
import { buildTestPrivateKeyPemBase64 } from "./test-helpers.ts";

test("ECDSASigner emits compact recoverable signature compatible with secp256k1 recovery", async () => {
  const pem = buildTestPrivateKeyPemBase64();
  const signer = ECDSASigner.fromPem(new TextDecoder().decode(fromBase64(pem)));

  const message = "req-idauthorization";
  const sig = Buffer.from(
    await signer.signStringCompactBase64(message),
    "base64",
  );

  assert.equal(sig.length, 65);
  const header = sig[0];
  assert.ok(header === 31 || header === 32);

  const recovery = header - 31;
  const compact = sig.subarray(1);
  const hash = createHash("sha256").update(utf8Encode(message)).digest();

  const recovered = secp256k1.Signature.fromCompact(compact)
    .addRecoveryBit(recovery)
    .recoverPublicKey(hash);
  assert.equal(
    Buffer.from(recovered.toRawBytes(true)).toString("hex"),
    Buffer.from(signer.getPublicKeyCompressed()).toString("hex"),
  );
});
