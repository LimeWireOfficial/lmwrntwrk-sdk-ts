export { applyLmwrntwrkMiddleware } from "./middleware.js";
export {
  addLmwrntwrkParamsToPresignedUrl,
  extractPresignedParams,
  removeLmwrntwrkQueryParamsFromUrl,
} from "./presign.js";
export {
  ECDSASigner,
  signerFromConfig,
  getPrivateKeyPemFromConfig,
} from "./crypto.js";
export {
  generateAccessKey,
  generateSecretKey,
  generateCredentials,
  generateAccessKeyFromPublicKeyBytes,
  generateSecretKeyFromPublicKeyBytes,
  addressFromUncompressed,
  base58Encode,
} from "./keys.js";
export { generateUlid } from "./ulid.js";
export * from "./constants.js";
export * from "./types.js";

export function staticValidatorUrlResolver(...urls: string[]) {
  if (urls.length === 0) {
    throw new Error("no validator url provided");
  }
  return () => urls[Math.floor(Math.random() * urls.length)];
}
