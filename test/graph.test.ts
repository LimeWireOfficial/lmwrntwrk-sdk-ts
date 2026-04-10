import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphQLClient } from '../src/graph.js';
import { newCachingValidatorResolver } from '../src/resolver.js';

test('GraphQLClient fetches validator endpoints', async (t) => {
  const mockEndpoints = ['http://validator1.local', 'http://validator2.local'];
  
  // Mock global fetch
  const originalFetch = global.fetch;
  global.fetch = async (url, init) => {
    return {
      ok: true,
      json: async () => ({
        data: {
          validators: mockEndpoints.map(url => ({ endpointUrl: url }))
        }
      })
    } as any;
  };

  try {
    const client = new GraphQLClient('http://mock-graph.local');
    const endpoints = await client.listEnabledValidatorEndpoints();
    
    assert.deepEqual(endpoints, mockEndpoints);
  } finally {
    global.fetch = originalFetch;
  }
});

test('CachingValidatorResolver caches endpoints', async (t) => {
  let callCount = 0;
  const mockEndpoints = ['http://validator1.local'];
  
  const mockClient = {
    listEnabledValidatorEndpoints: async () => {
      callCount++;
      return mockEndpoints;
    }
  } as any;

  const resolver = newCachingValidatorResolver(mockClient, 1000);
  
  const url1 = await resolver();
  assert.equal(url1, mockEndpoints[0]);
  assert.equal(callCount, 1);

  const url2 = await resolver();
  assert.equal(url2, mockEndpoints[0]);
  assert.equal(callCount, 1); // Should be cached
});

test('CachingValidatorResolver re-fetches after TTL', async (t) => {
  let callCount = 0;
  const mockEndpoints = ['http://validator1.local'];
  
  const mockClient = {
    listEnabledValidatorEndpoints: async () => {
      callCount++;
      return mockEndpoints;
    }
  } as any;

  const resolver = newCachingValidatorResolver(mockClient, -1); // Force immediate expire if implemented that way, or just wait
  
  // Actually I used expiresAt: Date.now() + this.cacheTTL
  // Let's use 0 for TTL to test re-fetch if possible, or mock Date.now()
  
  const resolver2 = newCachingValidatorResolver(mockClient, 0);
  
  await resolver2();
  assert.equal(callCount, 1);
  
  // Wait a bit to ensure Date.now() increases
  await new Promise(resolve => setTimeout(resolve, 1));
  
  await resolver2();
  assert.equal(callCount, 2);
});
