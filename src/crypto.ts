import * as secp256k1 from '@noble/secp256k1';
import type { LmwrntwrkConfig } from './types.ts';
import { concatBytes, fromBase64, sha256, toBase64, utf8Encode } from './bytes.ts';
import { hexToBytes } from '@noble/hashes/utils.js';

interface Tlv {
  tag: number;
  start: number;
  end: number;
  next: number;
}

function readTlv(input: Uint8Array, offset: number): Tlv {
  if (offset >= input.length) {
    throw new Error('invalid DER: unexpected end');
  }
  const tag = input[offset];
  const lenByte = input[offset + 1];
  if (lenByte === undefined) {
    throw new Error('invalid DER: missing length');
  }

  let length = 0;
  let headerLength = 2;
  if ((lenByte & 0x80) === 0) {
    length = lenByte;
  } else {
    const n = lenByte & 0x7f;
    if (n === 0 || n > 4) {
      throw new Error('invalid DER: unsupported length form');
    }
    if (offset + 2 + n > input.length) {
      throw new Error('invalid DER: length overflow');
    }
    for (let i = 0; i < n; i += 1) {
      const val = input[offset + 2 + i];
      if (val === undefined) {
        throw new Error('invalid DER: unexpected end');
      }
      length = (length << 8) | val;
    }
    headerLength = 2 + n;
  }

  const start = offset + headerLength;
  const end = start + length;
  if (end > input.length) {
    throw new Error('invalid DER: value exceeds input');
  }

  return { tag: tag!, start, end, next: end };
}

function leftPad32(input: Uint8Array): Uint8Array {
  if (input.length > 32) {
    throw new Error('invalid secp256k1 private key size');
  }
  if (input.length === 32) {
    return input;
  }
  const out = new Uint8Array(32);
  out.set(input, 32 - input.length);
  return out;
}

function extractSec1PrivateScalar(sec1Der: Uint8Array): Uint8Array {
  const seq = readTlv(sec1Der, 0);
  if (seq.tag !== 0x30 || seq.end !== sec1Der.length) {
    throw new Error('invalid EC PRIVATE KEY DER');
  }

  let cursor = seq.start;
  const version = readTlv(sec1Der, cursor);
  if (version.tag !== 0x02) {
    throw new Error('invalid EC PRIVATE KEY version');
  }
  cursor = version.next;

  const privateOctets = readTlv(sec1Der, cursor);
  if (privateOctets.tag !== 0x04) {
    throw new Error('invalid EC PRIVATE KEY scalar');
  }

  return leftPad32(sec1Der.slice(privateOctets.start, privateOctets.end));
}

function extractPkcs8PrivateScalar(pkcs8Der: Uint8Array): Uint8Array {
  const seq = readTlv(pkcs8Der, 0);
  if (seq.tag !== 0x30 || seq.end !== pkcs8Der.length) {
    throw new Error('invalid PKCS#8 DER');
  }

  let cursor = seq.start;
  const version = readTlv(pkcs8Der, cursor);
  if (version.tag !== 0x02) {
    throw new Error('invalid PKCS#8 version');
  }
  cursor = version.next;

  const algorithm = readTlv(pkcs8Der, cursor);
  if (algorithm.tag !== 0x30) {
    throw new Error('invalid PKCS#8 algorithm identifier');
  }
  cursor = algorithm.next;

  const privateOctets = readTlv(pkcs8Der, cursor);
  if (privateOctets.tag !== 0x04) {
    throw new Error('invalid PKCS#8 private key payload');
  }

  const sec1Der = pkcs8Der.slice(privateOctets.start, privateOctets.end);
  return extractSec1PrivateScalar(sec1Der);
}

function parsePemBlock(pem: string): { label: string; der: Uint8Array } {
  const match = pem.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) {
    throw new Error('invalid PEM');
  }

  const label = match[1]!;
  const b64 = match[2]!.replace(/\s+/g, '');
  return {
    label,
    der: fromBase64(b64),
  };
}

function decodePrivateScalarFromPem(base64Pem: string): Uint8Array {
  const { label, der } = parsePemBlock(base64Pem);
  if (label === 'EC PRIVATE KEY') {
    return extractSec1PrivateScalar(der);
  }
  if (label === 'PRIVATE KEY') {
    return extractPkcs8PrivateScalar(der);
  }
  if (label === 'EC RAW PRIVATE KEY') {
    return leftPad32(der);
  }
  throw new Error(`unsupported PEM type: ${label}`);
}

async function loadPemFromFile(path: string): Promise<string> {
  const dynamicImport = new Function('p', 'return import(p)') as (pathToImport: string) => Promise<{ readFile: (pathToRead: string) => Promise<Uint8Array> }>;
  const fs = await dynamicImport('node:fs/promises');
  const file = await fs.readFile(path);
  return toBase64(file);
}

export class ECDSASigner {
  readonly privateKey: Uint8Array;

  constructor(privateKey: Uint8Array) {
    if (privateKey.length !== 32) {
      throw new Error('private key must be 32 bytes');
    }
    this.privateKey = privateKey;
  }

  static fromPem(input: string): ECDSASigner {
    if (!input) {
      throw new Error('private key PEM is empty');
    }
    return new ECDSASigner(decodePrivateScalarFromPem(input));
  }

  async signBytesCompact(data: Uint8Array): Promise<Uint8Array> {
    const hash = await sha256(data);
    const signature = await secp256k1.signAsync(hash, this.privateKey);

    if (signature.recovery === undefined) {
      throw new Error('missing recovery id in signature');
    }

    return concatBytes([
      Uint8Array.of(27 + 4 + signature.recovery),
      signature.toCompactRawBytes(),
    ]);
  }

  async signStringCompactBase64(data: string): Promise<string> {
    return toBase64(await this.signBytesCompact(utf8Encode(data)));
  }

  getPublicKeyCompressed(): Uint8Array {
    return secp256k1.getPublicKey(this.privateKey, true);
  }

  getPublicKeyUncompressed(): Uint8Array {
    return secp256k1.getPublicKey(this.privateKey, false);
  }
}

export async function getPrivateKeyPemFromConfig(config: LmwrntwrkConfig): Promise<string> {
  if (config.privateKeyPEMFile) {
    return loadPemFromFile(config.privateKeyPEMFile);
  }

  if (config.privateKey) {
    return config.privateKey
  }

  if (config.privateKeyPEM) {
    return config.privateKeyPEM;
  }

  throw new Error('No PrivateKey configured.');
}

function identifyKeyFormat(input: string): 'hex' | 'pem' | 'pem_base64' {
  const trimmed = input.trim();
  if (trimmed.startsWith('-----BEGIN')) {
    return 'pem';
  }

  if (/^(0x)?[0-9a-fA-F]{64}$/.test(trimmed)) {
    return 'hex';
  }

  if (/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return 'pem_base64';
  }

  throw new Error("Unrecognized private key format.");
}

export async function signerFromConfig(config: LmwrntwrkConfig): Promise<ECDSASigner> {
  const privateKey = await getPrivateKeyPemFromConfig(config)
  switch (identifyKeyFormat(privateKey)) {
    case 'hex': return new ECDSASigner(hexToBytes(privateKey.replaceAll(/^0x/g, '')))
    case 'pem': return ECDSASigner.fromPem(privateKey)
    case 'pem_base64': return ECDSASigner.fromPem(new TextDecoder().decode(fromBase64(privateKey)))
  }
}
