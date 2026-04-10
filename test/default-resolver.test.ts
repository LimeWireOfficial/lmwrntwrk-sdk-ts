import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  applyLmwrntwrkMiddleware, 
  generateCredentials,
} from '../src/index.js';
import { buildTestPrivateKeyPemBase64 } from './test-helpers.js';

test('Default Validator URL Resolver with GraphQL', async () => {
  // 1. Setup your configuration WITHOUT validatorUrlResolver
  const privateKey = buildTestPrivateKeyPemBase64();
  
  const config = {
    privateKey,
    // validatorUrlResolver is NOT specified here, so it should use the default GraphQL-based one
  };

  // 2. Mock fetch to intercept the GraphQL query and the validator event send
  const originalFetch = global.fetch;
  let graphqlCalled = false;
  let validatorEventCalled = false;

  global.fetch = async (url, init) => {
    const urlStr = url.toString();
    if (urlStr.includes('graph.limewire.network')) {
      graphqlCalled = true;
      return {
        ok: true,
        json: async () => ({
          data: {
            validators: [{ endpointUrl: 'https://mock-validator.local/events' }]
          }
        })
      } as any;
    }
    if (urlStr.includes('mock-validator.local')) {
      validatorEventCalled = true;
      return { ok: true } as any;
    }
    return { ok: true } as any;
  };

  try {
    const mockS3Client = {
      middlewareStack: {
        add: (middleware: any) => {
          mockS3Client.appliedMiddleware = middleware;
        }
      },
      appliedMiddleware: null as any
    };

    applyLmwrntwrkMiddleware(mockS3Client as any, config);
    
    const next = async () => {
      return {
        response: {
          headers: {
            'x-lmwrntwrk-sp-signature': 'sp-sig',
            'x-lmwrntwrk-sp-payload': '{}'
          },
          body: new Uint8Array(0)
        }
      };
    };

    const middlewareHandler = mockS3Client.appliedMiddleware(next);
    
    await middlewareHandler({
      request: {
        method: 'PUT',
        path: '/bucket/key',
        headers: {
          'authorization': 'AWS4-HMAC-SHA256 ...',
          'host': 's3.example.com'
        },
        body: new TextEncoder().encode('test')
      }
    });

    assert.ok(graphqlCalled, 'Should have called GraphQL to resolve validator URL');
    assert.ok(validatorEventCalled, 'Should have sent event to the resolved validator URL');

  } finally {
    global.fetch = originalFetch;
  }
});
