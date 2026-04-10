# LimeWire Network TypeScript SDK

`lmwrntwrk-sdk-ts` is the official TypeScript SDK for [LimeWire Network](https://limewire.network), a decentralized file storage network. It allows developers to easily integrate decentralized storage into their applications using familiar S3-compatible APIs and the standard [AWS SDK for JavaScript (v3)](https://aws.amazon.com/sdk-for-javascript/).

The SDK is isomorphic: it runs in Node.js (v18+) and modern browsers.

## Prerequisites

- **Node.js 18 or later** (for server-side usage).
- **AWS SDK for JavaScript v3** (`@aws-sdk/client-s3`).

## Installation

```bash
npm install @limewire/lmwrntwrk-sdk-ts
```

## Browser Usage

The SDK integrates seamlessly with the standard `@aws-sdk/client-s3`.
When using the SDK in a browser environment, ensure your `privateKey` is provided as a string (Hex or PEM). The `privateKeyPEMFile` option is only supported in Node.js.

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { applyLmwrntwrkMiddleware, generateCredentials } from '@limewire/lmwrntwrk-sdk-ts';

// 1. Setup your LimeWire configuration
const config = {
  privateKey: '<private-key-in-pem-or-raw-hex>',
};

// 2. Generate S3-compatible credentials from the private key
const credentials = await generateCredentials(config);

// 3. Initialize the standard S3 Client
const s3 = new S3Client({
  region: 'lmwrntwrk',
  forcePathStyle: true,
  endpoint: 'https://sp1.strg.com',
  credentials
});

// 4. Apply the LimeWire middleware to the S3 Client
applyLmwrntwrkMiddleware(s3, config);

// 5. Use the S3 client as usual
await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'hello.txt',
  Body: 'Hello LimeWire Network!'
}));
```

## How it Works

The LimeWire Network TypeScript SDK seamlessly integrates with the official AWS SDK for JavaScript (v3) to provide a familiar S3-compatible interface for decentralized storage. By providing a middleware that handles the underlying decentralized routing, request signing, and data validation, it allows developers to use standard S3 operations. This approach enables you to leverage the full power of the AWS SDK ecosystem to interact with the LimeWire Network as a storage backend. For more information, please visit the official [LimeWire Network website](https://limewire.network).

## Included Helpers

- `applyLmwrntwrkMiddleware(client, config)`: Injects LimeWire logic into the S3 client.
- `generateCredentials(config)`: Derives `accessKeyId` and `secretAccessKey` from your private key.
- `addLmwrntwrkParamsToPresignedUrl(config, url, maxCount)`: Adds signing parameters to S3 presigned URLs.
- `staticValidatorUrlResolver(...urls)`: A helper to provide fixed validator URLs.

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Latest updates and breaking changes.
