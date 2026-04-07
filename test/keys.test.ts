import test from "node:test";
import assert from "node:assert/strict";
import {
  addressFromUncompressed,
  base58Encode,
  generateAccessKey,
  generateAccessKeyFromPublicKeyBytes,
  generateSecretKey,
} from "../src/index.js";

test("base58Encode", () => {
  const out = base58Encode(new TextEncoder().encode("lmwrntwrk"));
  assert.equal(out, "2P3oCPUfUD4ug");
});

test("addressFromUncompressed", () => {
  const input = Buffer.from(
    "fe3ffc5b3e9919868927a6bc6304c7a884b85f0539fa663079b8412b8bb876c0ce3c9a5760be46304416690f52322b8b07d5d0eb6d5537202c473d22d4010cc0",
    "hex",
  );
  const addr = addressFromUncompressed(input);
  assert.equal(
    Buffer.from(addr).toString("hex"),
    "30bf0af6137b4b039d40a475c5d1c5d59c01cfc3",
  );
});

const key = {
  hex: "be5e3f32bf5923bea74364afdd3574fc2db4ffdae120bd1eadb33f9385eb8b9c",
  base64:
    "LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IUUNBUUVFSUw1ZVB6Sy9XU08rcDBOa3I5MDFkUHd0dFAvYTRTQzlIcTJ6UDVPRjY0dWNvQWNHQlN1QkJBQUsKb1VRRFFnQUVDTGFQVFI4YUVuZ09WSitRMEQyeEJyNVNSYnJ2TUNjNnZSRUQ4QjFVSTNXb0dEeVRKcWNCNGFNQwp1MElGeGU4cFlWRWd4MitWbExpeDIwMmJDRGwyd2c9PQotLS0tLUVORCBFQyBQUklWQVRFIEtFWS0tLS0tCg==",
  pem: `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIL5ePzK/WSO+p0Nkr901dPwttP/a4SC9Hq2zP5OF64ucoAcGBSuBBAAK
oUQDQgAECLaPTR8aEngOVJ+Q0D2xBr5SRbrvMCc6vRED8B1UI3WoGDyTJqcB4aMC
u0IFxe8pYVEgx2+VlLix202bCDl2wg==
-----END EC PRIVATE KEY-----`,
};

test("generate credentials from base64 key", async () => {
  const access = await generateAccessKey({ privateKey: key.base64 });
  const secret = await generateSecretKey({ privateKey: key.base64 });

  assert.equal(access, "2KmbTA5NovyV84c2ju38");
  assert.equal(secret, "1d78e9bd4fe51edebff6f1e570e573f78ea98b0d");
});

test("generate credentials from pem key", async () => {
  const access = await generateAccessKey({ privateKey: key.pem });
  const secret = await generateSecretKey({ privateKey: key.pem });

  assert.equal(access, "2KmbTA5NovyV84c2ju38");
  assert.equal(secret, "1d78e9bd4fe51edebff6f1e570e573f78ea98b0d");
});

test("generate credentials from raw key", async () => {
  const access = await generateAccessKey({ privateKey: key.hex });
  const secret = await generateSecretKey({ privateKey: key.hex });

  assert.equal(access, "2KmbTA5NovyV84c2ju38");
  assert.equal(secret, "1d78e9bd4fe51edebff6f1e570e573f78ea98b0d");
});

test("generate credentials from PEM key without public key", async () => {
  const minimalKey = `-----BEGIN EC PRIVATE KEY-----
MC4CAQEEIJnMS61WFIrXYv1ARb7P5eE8krodTzj2LNRR2TEBf7yPoAcGBSuBBAAK
-----END EC PRIVATE KEY-----`;

  const access = await generateAccessKey({ privateKey: minimalKey });
  const secret = await generateSecretKey({ privateKey: minimalKey });

  assert.equal(access, "2FCv9FeNnthw2A1d6JtZ");
  assert.equal(secret, "315c53e15a01d52964612a4fe39111b8a82e6694");
});

test("generateAccessKeyFromPublicKeyBytes returns at most 20 chars", () => {
  const key = generateAccessKeyFromPublicKeyBytes(
    Buffer.from("1234567890abcdef1234", "utf8"),
  );
  assert.ok(key.length <= 20);
});

test("xxx", () => {});
