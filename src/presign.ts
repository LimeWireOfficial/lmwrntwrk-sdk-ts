import { AwsSignatureQueryParam, MaxAllowedPresignedRequestDurationSeconds, QueryParamMaxRequestCount, QueryParamRequestID, QueryParamSignature } from './constants.ts';
import { signerFromConfig } from './crypto.ts';
import { generateUlid } from './ulid.ts';
import type { LmwrntwrkConfig } from './types.ts';

export interface LmwrntwrkPresignInfo {
  requestId: string;
  signature: string;
  awsSignature: string;
  maxRequestCount: number;
}

export async function addLmwrntwrkParamsToPresignedUrl(
  config: LmwrntwrkConfig,
  presignedUrl: string,
  maxRequestCount: number,
): Promise<string> {
  if (!presignedUrl) {
    throw new Error('presignedUrl is empty');
  }
  if (maxRequestCount <= 0) {
    throw new Error('maxRequestCount must be > 0');
  }

  const url = new URL(presignedUrl);
  const expires = url.searchParams.get('X-Amz-Expires');
  if (expires !== null) {
    const expiresNum = Number.parseInt(expires, 10);
    if (!Number.isFinite(expiresNum)) {
      throw new Error('invalid X-Amz-Expires value');
    }
    if (expiresNum > MaxAllowedPresignedRequestDurationSeconds) {
      throw new Error(`X-Amz-Expires exceeds maximum of ${MaxAllowedPresignedRequestDurationSeconds}s allowed on LMWRNTWRK`);
    }
  }

  const awsSignature = url.searchParams.get(AwsSignatureQueryParam);
  if (!awsSignature) {
    throw new Error(`query parameter ${AwsSignatureQueryParam} not found in presigned URL`);
  }

  const requestId = generateUlid();
  const signer = await signerFromConfig(config);
  const signature = await signer.signStringCompactBase64(requestId + String(maxRequestCount) + awsSignature);

  url.searchParams.set(QueryParamRequestID, requestId);
  url.searchParams.set(QueryParamSignature, encodeURIComponent(signature));
  url.searchParams.set(QueryParamMaxRequestCount, String(maxRequestCount));

  return url.toString();
}

export function extractPresignedParams(presignedUrl: string): LmwrntwrkPresignInfo {
  if (!presignedUrl) {
    throw new Error('presignedUrl is empty');
  }
  const url = new URL(presignedUrl);

  const requestId = url.searchParams.get(QueryParamRequestID);
  if (!requestId) {
    throw new Error(`query parameter ${QueryParamRequestID} not found in URL`);
  }

  const escapedSignature = url.searchParams.get(QueryParamSignature);
  if (!escapedSignature) {
    throw new Error(`query parameter ${QueryParamSignature} not found in URL`);
  }

  const awsSignature = url.searchParams.get(AwsSignatureQueryParam);
  if (!awsSignature) {
    throw new Error(`query parameter ${AwsSignatureQueryParam} not found in URL`);
  }

  const maxRequestCountRaw = url.searchParams.get(QueryParamMaxRequestCount);
  if (!maxRequestCountRaw) {
    throw new Error(`query parameter ${QueryParamMaxRequestCount} not found in URL`);
  }
  const maxRequestCount = Number.parseInt(maxRequestCountRaw, 10);
  if (!Number.isFinite(maxRequestCount) || maxRequestCount < 0) {
    throw new Error(`${QueryParamMaxRequestCount} must be >= 0`);
  }

  return {
    requestId,
    signature: decodeURIComponent(escapedSignature),
    awsSignature,
    maxRequestCount,
  };
}

export function removeLmwrntwrkQueryParamsFromUrl(input: URL | string): URL {
  const url = typeof input === 'string' ? new URL(input) : new URL(input.toString());
  url.searchParams.delete(QueryParamRequestID);
  url.searchParams.delete(QueryParamSignature);
  url.searchParams.delete(QueryParamMaxRequestCount);
  return url;
}
