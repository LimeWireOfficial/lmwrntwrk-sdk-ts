import { readBodyToBytes } from "./body.js";
import { signerFromConfig } from "./crypto.js";
import {
  DefaultChunkSize,
  RequestIdHeader,
  SignatureHeader,
} from "./constants.js";
import { applyFooterToRequest } from "./footer.js";
import { generateUlid } from "./ulid.js";
import { generateValidatorPayload, sendDataToValidator } from "./validator.js";
import type {
  LmwrntwrkConfig,
  MiddlewareArgs,
  MiddlewareClient,
  MiddlewareResult,
  ValidatorUrlResolver,
} from "./types.ts";
import { getS3ActionFromRequest, isActionAllowed } from "./allowlist.js";
import { GraphQLClient } from "./graph.js";
import { newCachingValidatorResolver } from "./resolver.js";

let defaultValidatorUrlResolver: ValidatorUrlResolver | undefined;

function getDefaultValidatorUrlResolver(): ValidatorUrlResolver {
  if (!defaultValidatorUrlResolver) {
    const client = new GraphQLClient();
    defaultValidatorUrlResolver = newCachingValidatorResolver(client);
  }
  return defaultValidatorUrlResolver;
}

function getHeader(
  headers: Record<string, string | undefined>,
  key: string,
): string {
  const direct = headers[key];
  if (direct !== undefined) {
    return direct;
  }
  const lower = headers[key.toLowerCase()];
  if (lower !== undefined) {
    return lower;
  }
  const upper = headers[key.toUpperCase()];
  return upper ?? "";
}

function defaultFetchImpl(
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
): Promise<unknown> {
  return fetch(input, init as RequestInit);
}

export function applyLmwrntwrkMiddleware(
  client: MiddlewareClient,
  config: LmwrntwrkConfig,
): void {
  client.middlewareStack.add(
    (next: (args: MiddlewareArgs) => Promise<MiddlewareResult>) => {
      return async (args: MiddlewareArgs): Promise<MiddlewareResult> => {
        const request = args.request;
        const action = getS3ActionFromRequest(request);
        if (!isActionAllowed(action)) {
          throw new Error(`Request '${action}' not allowed`);
        }

        const auth = getHeader(request.headers, "authorization");
        if (!auth) {
          throw new Error("missing authorization header");
        }

        const signer = await signerFromConfig(config);
        const requestId = generateUlid();
        const signature = await signer.signStringCompactBase64(
          requestId + auth,
        );

        request.headers[RequestIdHeader] = requestId;
        request.headers[SignatureHeader] = signature;

        const chunkSize =
          config.chunkSize && config.chunkSize > 0
            ? config.chunkSize
            : DefaultChunkSize;
        const body = await readBodyToBytes(request.body);

        const shouldRecordRequestBody =
          action === "s3:CompleteMultipartUpload" ||
          action === "s3:PutObjectTagging";
        let requestBodyForPayload = new Uint8Array(0) as Uint8Array;
        let footerData;

        if (body) {
          if (shouldRecordRequestBody) {
            requestBodyForPayload = body as Uint8Array;
          }
          footerData = await applyFooterToRequest(
            request,
            body,
            signer,
            chunkSize,
          );
        }

        const result = await next(args);

        if (!result.response) {
          return result;
        }

        const payload = await generateValidatorPayload(
          request,
          result.response,
          requestBodyForPayload,
          footerData,
          action,
        );

        if (!payload) {
          return result;
        }

        const resolver =
          config.validatorUrlResolver ?? getDefaultValidatorUrlResolver();

        const validatorUrl = await resolver();
        if (!validatorUrl) {
          return result;
        }

        try {
          console.log(`sending to url ${validatorUrl}: ${payload}`);
          await sendDataToValidator(
            payload,
            validatorUrl,
            config.fetchImpl ?? defaultFetchImpl,
          );
        } catch {
          // Validator failures are non-fatal for SDK callers.
        }

        return result;
      };
    },
    {
      name: "lmwrntwrkMiddleware",
      step: "deserialize",
      priority: "low",
      override: true,
    },
  );
}
