import pkg from "../package.json" with { type: "json" };
export const SignatureHeader = 'x-lmwrntwrk-signature';
export const RequestIdHeader = 'x-lmwrntwrk-request-id';
export const ChunkSizeHeader = 'x-lmwrntwrk-chunk-size';
export const FooterLengthHeader = 'x-lmwrntwrk-footer-length';

export const QueryParamRequestID = 'x-lmwrntwrk-request-id';
export const QueryParamSignature = 'x-lmwrntwrk-signature';
export const QueryParamMaxRequestCount = 'x-max-request-count';
export const AwsSignatureQueryParam = 'X-Amz-Signature';

export const MagicBytes = new Uint8Array([0xfa, 0xce, 0xaf]);
export const FooterVersion = 1;
export const FooterLength = 109;
export const DefaultChunkSize = 10 * 1024 * 1024;
export const MaxAllowedPresignedRequestDurationSeconds = 30 * 60;

export const DefaultGraphEndpoint = "https://graph.limewire.network/subgraphs/name/lmwrntwrk-v1";
export const LmwrntwrkSdkVersion = pkg.version;
export const LmwrntwrkUserAgent = `LmwrNtwrkTsSdk/${LmwrntwrkSdkVersion}`;
