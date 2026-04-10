import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  applyLmwrntwrkMiddleware, 
  generateCredentials, 
  staticValidatorUrlResolver 
} from '../src/index.js';
import { buildTestPrivateKeyPemBase64 } from './test-helpers.js';

/**
 * This test file serves as an onboarding example of how to use the LimeWire Network SDK
 * with an S3-compatible client (like AWS SDK v3).
 */

test('Demo: AWS SDK v3 S3 Upload with LimeWire Middleware', async () => {
  // 1. Setup your configuration
  // In a real app, 'privateKey' would be your actual private key (PEM or hex).
  // For this example, we use a helper to generate a test private key.
  const privateKey = buildTestPrivateKeyPemBase64();
  
  const config = {
    privateKey,
    validatorUrlResolver: staticValidatorUrlResolver(
      'https://v1.limewire.network/events'
    ),
  };

  // 2. Generate S3-compatible credentials from the LimeWire private key.
  // These credentials will be used for standard AWS SigV4 signing.
  const credentials = await generateCredentials(config);
  
  assert.ok(credentials.accessKeyId, 'Should generate an accessKeyId');
  assert.ok(credentials.secretAccessKey, 'Should generate a secretAccessKey');

  // 3. Mock S3 Client structure (representing AWS SDK S3Client)
  // The SDK expects a 'middlewareStack' with an 'add' method.
  const mockS3Client = {
    middlewareStack: {
      add: (middleware: any, options: any) => {
        assert.equal(options.name, 'lmwrntwrkMiddleware');
        // In a real AWS SDK client, this would inject the middleware into the request lifecycle.
        mockS3Client.appliedMiddleware = middleware;
      }
    },
    appliedMiddleware: null as any
  };

  // 4. Apply the LimeWire middleware to the S3 Client
  applyLmwrntwrkMiddleware(mockS3Client as any, config);
  
  assert.ok(mockS3Client.appliedMiddleware, 'Middleware should be applied to the client');

  // 5. Example of how the middleware processes a request
  // (Simulating what happens inside s3Client.send(new PutObjectCommand(...)))
  const next = async (args: any) => {
    const { request } = args;
    
    // The middleware should have added LimeWire-specific headers
    assert.ok(request.headers['x-lmwrntwrk-request-id'], 'Should have request ID header');
    assert.ok(request.headers['x-lmwrntwrk-signature'], 'Should have signature header');
    
    return {
      response: {
        headers: {},
        body: new Uint8Array(0)
      }
    };
  };

  const middlewareHandler = mockS3Client.appliedMiddleware(next);
  
  await middlewareHandler({
    request: {
      method: 'PUT',
      path: '/my-bucket/example.txt',
      headers: {
        'authorization': 'AWS4-HMAC-SHA256 ...', // Standard AWS auth header
        'host': 'storage.limewire.network'
      },
      body: new TextEncoder().encode('Hello LimeWire!')
    }
  });

});
