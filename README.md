# LimeWire Network TypeScript SDK

TypeScript wrapper utilities for AWS SDK v3 S3 clients that add LMWRNTWRK request signing, footer generation, and validator event dispatch.

The SDK is isomorphic: it runs in Node.js and modern browsers.

Check out the [CHANGELOG.md](CHANGELOG.md) for the latest updates.

## Install

```bash
npm install @limewire/lmwrntwrk-sdk-ts
```

## Browser usage

Use `privateKeyPEM` (base64 encoded PEM). `privateKeyPEMFile` is Node-only.

```ts
import { S3Client } from '@aws-sdk/client-s3';
import { applyLmwrntwrkMiddleware, staticValidatorUrlResolver } from '@limewire/lmwrntwrk-sdk-ts';

const s3 = new S3Client({ region: 'us-east-1' });

applyLmwrntwrkMiddleware(s3, {
  privateKey: '<private-key-in-pem-or-raw-hex>',
});
```

## Included helpers

- `applyLmwrntwrkMiddleware(client, config)`
- `addLmwrntwrkParamsToPresignedUrl(config, presignedUrl, maxRequestCount)`
- `extractPresignedParams(url)`
- `removeLmwrntwrkQueryParamsFromUrl(url)`
- `generateAccessKey(config)` / `generateSecretKey(config)`
- `generateCredentials(config)` (derives `{ accessKeyId, secretAccessKey }` from private key)
