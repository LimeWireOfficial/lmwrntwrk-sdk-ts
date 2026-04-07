import type { LmwrntwrkConfig } from './types.js';
import { signerFromConfig } from './crypto.js';
import { sha1 } from './bytes.js';
import { keccak_256 } from '@noble/hashes/sha3.js';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Encode(input: Uint8Array): string {
  if (input.length === 0) {
    return '';
  }

  let x = 0n;
  for (const b of input) {
    x = (x << 8n) | BigInt(b);
  }

  if (x === 0n) {
    return '';
  }

  let result = '';
  const base = 58n;
  while (x > 0n) {
    const mod = Number(x % base);
    result = BASE58_ALPHABET[mod] + result;
    x /= base;
  }
  return result;
}

export function addressFromUncompressed(uncompressed: Uint8Array): Uint8Array {
  let bytes = uncompressed;
  if (bytes.length === 65) {
    if (bytes[0] !== 0x04) {
      throw new Error('invalid uncompressed public key prefix');
    }
    bytes = bytes.subarray(1);
  }

  if (bytes.length !== 64) {
    throw new Error('uncompressed key must be 64 bytes (X||Y) or 65 bytes (0x04||X||Y)');
  }

  const hash = keccak_256(bytes);
  return hash.subarray(12);
}

export function generateAccessKeyFromPublicKeyBytes(pubKeyBytes: Uint8Array): string {
  if (pubKeyBytes.length === 0) {
    return '';
  }
  const base58 = base58Encode(pubKeyBytes);
  return base58.length > 20 ? base58.slice(0, 20) : base58;
}

export async function generateSecretKeyFromPublicKeyBytes(pubKeyBytes: Uint8Array): Promise<string> {
  if (pubKeyBytes.length === 0) {
    return '';
  }
  const digest = await sha1(pubKeyBytes);
  return Array.from(digest)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateAccessKey(config: LmwrntwrkConfig): Promise<string> {
  const signer = await signerFromConfig(config);
  const address = addressFromUncompressed(signer.getPublicKeyUncompressed());
  return generateAccessKeyFromPublicKeyBytes(address);
}

export async function generateSecretKey(config: LmwrntwrkConfig): Promise<string> {
  const signer = await signerFromConfig(config);
  const address = addressFromUncompressed(signer.getPublicKeyUncompressed());
  return generateSecretKeyFromPublicKeyBytes(address);
}


export async function generateCredentials(config: LmwrntwrkConfig): Promise<{ accessKeyId: string; secretAccessKey: string }> {
  const [accessKeyId, secretAccessKey] = await Promise.all([
    generateAccessKey(config),
    generateSecretKey(config),
  ]);

  return {
    accessKeyId,
    secretAccessKey,
  };
}
