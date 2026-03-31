import { readUnknownBody } from './bytes.ts';

export async function readBodyToBytes(body: unknown): Promise<Uint8Array | null> {
  return readUnknownBody(body);
}
