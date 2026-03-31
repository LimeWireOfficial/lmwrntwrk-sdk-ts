const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function utf8Encode(input: string): Uint8Array {
  return textEncoder.encode(input);
}

export function utf8Decode(input: Uint8Array): string {
  return textDecoder.decode(input);
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function getCrypto(): Crypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj) {
    throw new Error('crypto is not available in this environment');
  }
  return cryptoObj;
}

export function randomBytes(size: number): Uint8Array {
  const out = new Uint8Array(size);
  getCrypto().getRandomValues(out);
  return out;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await getCrypto().subtle.digest('SHA-256', data as any);
  return new Uint8Array(digest);
}

export async function sha1(data: Uint8Array): Promise<Uint8Array> {
  const digest = await getCrypto().subtle.digest('SHA-1', data as any);
  return new Uint8Array(digest);
}

export function uint64ToBigEndian(value: number): Uint8Array {
  const out = new Uint8Array(8);
  let n = BigInt(value);
  for (let i = 7; i >= 0; i -= 1) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

function isReadableStream(value: unknown): value is ReadableStream {
  return typeof ReadableStream !== 'undefined' && value instanceof ReadableStream;
}

export async function readAsyncIterable(iterable: AsyncIterable<unknown>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of iterable) {
    if (typeof chunk === 'string') {
      chunks.push(utf8Encode(chunk));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(chunk);
    } else if (chunk instanceof ArrayBuffer) {
      chunks.push(new Uint8Array(chunk));
    } else {
      throw new Error('unsupported stream chunk type');
    }
  }
  return concatBytes(chunks);
}

export async function readStream(stream: ReadableStream): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value instanceof Uint8Array) {
      chunks.push(value);
    } else {
      chunks.push(new Uint8Array(value));
    }
  }
  return concatBytes(chunks);
}

export async function readUnknownBody(body: unknown): Promise<Uint8Array | null> {
  if (body === undefined || body === null) {
    return null;
  }
  if (typeof body === 'string') {
    return utf8Encode(body);
  }
  if (body instanceof Uint8Array) {
    return body;
  }
  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return new Uint8Array(await body.arrayBuffer());
  }
  if (isReadableStream(body)) {
    return readStream(body);
  }
  if (isAsyncIterable(body)) {
    return readAsyncIterable(body);
  }
  throw new Error('unsupported request/response body type');
}
