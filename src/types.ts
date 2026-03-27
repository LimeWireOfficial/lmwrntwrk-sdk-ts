export type ValidatorUrlResolver = () =>
  | string
  | undefined
  | Promise<string | undefined>;

export interface LmwrntwrkConfig {
  /** 
   * The ECDSA private key. 
   * Supports: 
   * 1. Raw Hex string (64 chars)
   * 2. PEM format string (starts with -----BEGIN...)
   * 3. Base64 Encoded PEM Format
  */
  privateKey?: string;
 
  /** @deprecated use privateKey instead */
  privateKeyPEM?: string;
  privateKeyPEMFile?: string;
  chunkSize?: number;
  validatorUrlResolver?: ValidatorUrlResolver;
  fetchImpl?: (
    input: string,
    init: { method: string; headers: Record<string, string>; body: string },
  ) => Promise<unknown>;
}

export interface HttpLikeRequest {
  method: string;
  path: string;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | undefined>;
  body?: unknown;
}

export interface HttpLikeResponse {
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface MiddlewareArgs {
  request: HttpLikeRequest;
}

export interface MiddlewareResult {
  response?: HttpLikeResponse;
}

export interface MiddlewareClient {
  middlewareStack: {
    add: (
      middleware: (next: any, context: any) => any,
      options: {
        step:
          | "initialize"
          | "serialize"
          | "build"
          | "finalizeRequest"
          | "deserialize";
        priority?: "high" | "normal" | "low";
        name?: string;
        override?: boolean;
      },
    ) => void;
    addRelativeTo: (
      middleware: (
        next: (args: MiddlewareArgs) => Promise<MiddlewareResult>,
        context: unknown,
      ) => (args: MiddlewareArgs) => Promise<MiddlewareResult>,
      options: {
        relation: "after" | "before";
        toMiddleware: string;
        name: string;
        override?: boolean;
      },
    ) => void;
  };
}

export interface HashWithLength {
  hash: Uint8Array;
  length: number;
}

export interface FooterData {
  footerBytes: Uint8Array;
  signature: Uint8Array;
  totalSize: number;
  hashes: HashWithLength[];
}

export interface FooterPayload {
  clientSignature: string;
  fileSize: number;
  hashes: [string, string][];
  storageProviderSignature: string;
}

export interface StoreEventRequestJson {
  footer?: FooterPayload;
  request: {
    body?: string;
    headers: Record<string, string>;
    method: string;
    url: string;
  };
  response: {
    body?: string;
    headers: Record<string, string>;
  };
  storageProviderPayload: string;
  storageProviderS3Signature: string;
}
