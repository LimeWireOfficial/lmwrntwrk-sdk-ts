import { randomBytes } from './bytes.ts';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeBase32(value: bigint, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const index = Number(value & 31n);
    out = CROCKFORD[index] + out;
    value >>= 5n;
  }
  return out;
}

export function generateUlid(nowMs = Date.now()): string {
  const time = BigInt(nowMs);
  const timestamp = encodeBase32(time, 10);

  const random = randomBytes(10);
  let randomBig = 0n;
  for (const b of random) {
    randomBig = (randomBig << 8n) | BigInt(b);
  }

  return timestamp + encodeBase32(randomBig, 16);
}
