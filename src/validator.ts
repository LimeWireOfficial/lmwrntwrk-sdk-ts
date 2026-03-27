import { readBodyToBytes } from './body.ts';
import { toBase64, utf8Decode } from './bytes.ts';
import type { FooterData, HttpLikeRequest, HttpLikeResponse, StoreEventRequestJson } from './types.ts';

export function headersToLowercaseMap(headers: Record<string, string | string[] | undefined> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) {
    return out;
  }

  for (const [k, v] of Object.entries(headers)) {
    if (Array.isArray(v)) {
      out[k.toLowerCase()] = v[0] ?? '';
    } else {
      out[k.toLowerCase()] = v ?? '';
    }
  }

  return out;
}

function queryToString(query: Record<string, string | string[] | undefined> | undefined): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) {
      for (const vv of v) {
        params.append(k, vv);
      }
    } else if (v !== undefined) {
      params.set(k, v);
    }
  }
  const q = params.toString();
  return q ? `?${q}` : '';
}

export async function generateValidatorPayload(
  request: HttpLikeRequest,
  response: HttpLikeResponse,
  requestBody: Uint8Array,
  footer: FooterData | undefined,
  s3Action: string,
): Promise<string | null> {
  const responseHeaders = headersToLowercaseMap(response.headers);
  const spSignature = responseHeaders['x-lmwrntwrk-sp-signature'];
  if (!spSignature) {
    return null;
  }

  const spFooterSignature = responseHeaders['x-lmwrntwrk-sp-footer-signature'];
  const footerObject = footer && spFooterSignature
    ? {
        clientSignature: toBase64(footer.signature),
        fileSize: footer.totalSize,
        hashes: footer.hashes.map((h) => [toBase64(h.hash), String(h.length)] as [string, string]),
        storageProviderSignature: spFooterSignature,
      }
    : undefined;

  let responseBody = '';
  if (s3Action !== 's3:GetObject') {
    const bodyBytes = await readBodyToBytes(response.body);
    responseBody = bodyBytes ? utf8Decode(bodyBytes) : '';
    if (bodyBytes) {
      response.body = bodyBytes;
    }
  }

  const requestHeaders = headersToLowercaseMap(request.headers);
  if (!requestHeaders.host && requestHeaders[':authority']) {
    requestHeaders.host = requestHeaders[':authority'];
  }

  const payload: StoreEventRequestJson = {
    storageProviderS3Signature: spSignature,
    storageProviderPayload: responseHeaders['x-lmwrntwrk-sp-payload'] ?? '',
    footer: footerObject,
    request: {
      body: utf8Decode(requestBody),
      headers: requestHeaders,
      method: request.method,
      url: `${request.path}${queryToString(request.query)}`,
    },
    response: {
      body: responseBody,
      headers: responseHeaders,
    },
  };

  return JSON.stringify(payload);
}

export async function sendDataToValidator(
  payloadJson: string,
  validatorUrl: string,
  fetchImpl: (input: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<unknown>,
): Promise<void> {
  await fetchImpl(validatorUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: payloadJson,
  });
}
