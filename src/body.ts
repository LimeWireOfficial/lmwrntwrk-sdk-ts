import { readUnknownBody } from './bytes.js';

export async function readBodyToBytes(body: unknown): Promise<Uint8Array | null> {
  return readUnknownBody(body);
}
