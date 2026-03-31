import { ChunkSizeHeader, DefaultChunkSize, FooterLengthHeader, FooterLength, FooterVersion, MagicBytes } from './constants.ts';
import type { FooterData, HashWithLength } from './types.ts';
import { ECDSASigner } from './crypto.ts';
import { concatBytes, sha256, uint64ToBigEndian } from './bytes.ts';

export async function createFooterData(body: Uint8Array, signer: ECDSASigner, chunkSize = DefaultChunkSize): Promise<FooterData> {
  const hashes: HashWithLength[] = [];

  for (let offset = 0; offset < body.length; offset += chunkSize) {
    const chunk = body.subarray(offset, Math.min(offset + chunkSize, body.length));
    hashes.push({ hash: await sha256(chunk), length: chunk.length });
  }

  const allHashes = concatBytes(hashes.map((h) => h.hash));
  const hashesDigest = await sha256(allHashes);
  const sizeBytes = uint64ToBigEndian(body.length);

  const signatureInput = concatBytes([hashesDigest, sizeBytes]);
  const signature = await signer.signBytesCompact(signatureInput);

  const footerBytes = concatBytes([
    MagicBytes,
    Uint8Array.of(FooterVersion),
    hashesDigest,
    sizeBytes,
    signature,
  ]);

  return {
    footerBytes,
    signature,
    totalSize: body.length,
    hashes,
  };
}

export async function applyFooterToRequest(
  request: { headers: Record<string, string | undefined>; body?: unknown },
  body: Uint8Array,
  signer: ECDSASigner,
  chunkSize: number,
): Promise<FooterData> {
  const footer = await createFooterData(body, signer, chunkSize);
  request.body = concatBytes([body, footer.footerBytes]);
  request.headers[FooterLengthHeader] = String(FooterLength);
  request.headers[ChunkSizeHeader] = String(chunkSize);
  request.headers['content-length'] = String(body.length + FooterLength);
  return footer;
}
