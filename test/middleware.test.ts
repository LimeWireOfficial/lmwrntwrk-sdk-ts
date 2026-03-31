import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLmwrntwrkMiddleware } from '../src/middleware.ts';
import { utf8Encode } from '../src/bytes.ts';
import type { MiddlewareArgs, MiddlewareResult } from '../src/types.ts';
import { buildTestPrivateKeyPemBase64 } from './test-helpers.ts';

function buildClient() {
  let middleware: ((next: (args: MiddlewareArgs) => Promise<MiddlewareResult>) => (args: MiddlewareArgs) => Promise<MiddlewareResult>) | undefined;

  const client = {
    middlewareStack: {
      add(fn: typeof middleware) {
        middleware = fn
      },
      addRelativeTo(fn: typeof middleware) {
        middleware = fn;
      },
    },
  };

  return {
    client,
    getMiddleware: () => middleware,
  };
}

test('middleware signs request, appends footer, and sends validator event', async () => {
  const capture: { url?: string; body?: string } = {};

  const { client, getMiddleware } = buildClient();
  applyLmwrntwrkMiddleware(client, {
    privateKeyPEM: buildTestPrivateKeyPemBase64(),
    chunkSize: 8,
    validatorUrlResolver: () => 'https://validator.local/events',
    fetchImpl: async (url, init) => {
      capture.url = url;
      capture.body = init.body;
      return {};
    },
  });

  const mw = getMiddleware();
  assert.ok(mw);

  const next = async (args: MiddlewareArgs): Promise<MiddlewareResult> => {
    const request = args.request;
    assert.ok(request.headers['x-lmwrntwrk-request-id']);
    assert.ok(request.headers['x-lmwrntwrk-signature']);
    assert.equal(request.headers['x-lmwrntwrk-footer-length'], '109');
    assert.equal(request.headers['x-lmwrntwrk-chunk-size'], '8');
    assert.equal((request.body as Uint8Array).length, 5 + 109);

    return {
      response: {
        headers: {
          'x-lmwrntwrk-sp-signature': 'sp-sig',
          'x-lmwrntwrk-sp-footer-signature': 'sp-footer-sig',
          'x-lmwrntwrk-sp-payload': '{"some":"payload"}',
        },
        body: utf8Encode('ok'),
      },
    };
  };

  const handler = mw(next, {});
  await handler({
    request: {
      method: 'PUT',
      path: '/bucket/key',
      query: { 'x-id': 'PutObject' },
      headers: {
        authorization: 'AWS4-HMAC-SHA256 credential=abc',
        host: 's3.example.com',
      },
      body: utf8Encode('hello'),
    },
  });

  assert.equal(capture.url, 'https://validator.local/events');
  assert.ok(capture.body);

  const payload = JSON.parse(capture.body ?? '{}');
  assert.equal(payload.storageProviderS3Signature, 'sp-sig');
  assert.equal(payload.storageProviderPayload, '{"some":"payload"}');
  assert.equal(payload.request.method, 'PUT');
  assert.equal(payload.request.url, '/bucket/key?x-id=PutObject');
  assert.equal(payload.request.body, '');
  assert.equal(payload.response.body, 'ok');
  assert.ok(payload.footer);
});

test('middleware rejects request without authorization header', async () => {
  const { client, getMiddleware } = buildClient();
  applyLmwrntwrkMiddleware(client, {
    privateKeyPEM: buildTestPrivateKeyPemBase64(),
  });

  const mw = getMiddleware();
  assert.ok(mw);
  const handler = mw(async () => ({ response: { headers: {} } }), {});

  await assert.rejects(
    () =>
      handler({
        request: {
          method: 'GET',
          path: '/bucket/key',
          headers: {},
        },
      }),
    /missing authorization header/,
  );
});
