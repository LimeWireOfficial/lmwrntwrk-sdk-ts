export { applyLmwrntwrkMiddleware } from "./middleware.ts";
export {
  addLmwrntwrkParamsToPresignedUrl,
  extractPresignedParams,
  removeLmwrntwrkQueryParamsFromUrl,
} from "./presign.ts";
export {
  ECDSASigner,
  signerFromConfig,
  getPrivateKeyPemFromConfig,
} from "./crypto.ts";
export {
  generateAccessKey,
  generateSecretKey,
  generateCredentials,
  generateAccessKeyFromPublicKeyBytes,
  generateSecretKeyFromPublicKeyBytes,
  addressFromUncompressed,
  base58Encode,
} from "./keys.ts";
export { generateUlid } from "./ulid.ts";
export * from "./constants.ts";
export * from "./types.ts";

export function staticValidatorUrlResolver(...urls: string[]) {
  if (urls.length === 0) {
    throw new Error("no validator url provided");
  }
  return () => urls[Math.floor(Math.random() * urls.length)];
}
