import { createPrivateKey } from 'node:crypto';
import * as secp256k1 from '@noble/secp256k1';

function toBase64Url(input: Uint8Array): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function buildTestPrivateKeyPemBase64(): string {
  const d = Buffer.from('0102030405060708090001020304050607080900010203040506070809000102', 'hex');
  const pubUncompressed = secp256k1.getPublicKey(d, false);
  const x = pubUncompressed.subarray(1, 33);
  const y = pubUncompressed.subarray(33, 65);

  const keyObject = createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'secp256k1',
      d: toBase64Url(d),
      x: toBase64Url(x),
      y: toBase64Url(y),
    },
    format: 'jwk',
  });

  const pem = keyObject.export({ format: 'pem', type: 'pkcs8' }) as string;
  return Buffer.from(pem, 'utf8').toString('base64');
}
