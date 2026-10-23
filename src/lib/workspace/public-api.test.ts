// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { handlePublicRead, publicOptions } from './public-api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const request = (query: string) => new Request(`http://localhost/api/public/v1/search?${query}`);

it('rejects invalid parameters before contacting the node', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  for (const query of [
    'q=from:someone',
    'q=x&limit=21',
    'q=x&q=y',
    'q=x&url=http://internal',
    'q=x&cursor=',
  ]) {
    expect((await handlePublicRead(request(query), 'search')).status).toBe(400);
  }
  expect(fetcher).not.toHaveBeenCalled();
});

it('normalizes the actual nested search envelope and strips upstream private fields', async () => {
  vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'https://public-api-test.test');
  const fetcher = vi.fn(async () =>
    Response.json({
      result: {
        casts: [
          {
            hash: 'a'.repeat(40),
            timestamp: '2026-10-22T00:00:00Z',
            text: 'Hypersnap client',
            author: {
              fid: 1,
              username: 'artist',
              custody_address: 'secret-address',
              verifications: ['wallet'],
            },
            embeds: [],
          },
        ],
        next: { cursor: 'next' },
      },
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  const response = await handlePublicRead(request('q=hypersnap&limit=5'), 'search');
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.posts[0].hash).toBe(`0x${'a'.repeat(40)}`);
  expect(body.nextCursor).toBe('next');
  expect(JSON.stringify(body)).not.toMatch(/custody|wallet|secret-address|public-api-test/);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  await handlePublicRead(request('q=hypersnap&limit=5'), 'search');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('fails closed on unavailable configuration with readable CORS errors', async () => {
  vi.stubEnv('ZAO_WORKSPACE_NODE_URL', '');
  const response = await handlePublicRead(request('q=test'), 'search');
  expect(response.status).toBe(503);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(publicOptions().status).toBe(204);
});

it('validates exact hashes and rejects malformed upstream casts', async () => {
  expect((await handlePublicRead(request('hash=no'), 'cast')).status).toBe(400);
  vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'https://malformed-api-test.test');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ cast: { text: 'missing identity' } })),
  );
  expect((await handlePublicRead(request(`hash=0x${'b'.repeat(40)}`), 'cast')).status).toBe(503);
});

it('bounds upstream concurrency while coalescing duplicate requests', async () => {
  vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'https://capacity-api-test.test');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetcher = vi.fn(async () => {
    await gate;
    return Response.json({ result: { casts: [], next: {} } });
  });
  vi.stubGlobal('fetch', fetcher);
  const reads = Array.from({ length: 4 }, (_, i) =>
    handlePublicRead(request(`q=capacity${i}`), 'search'),
  );
  const duplicate = handlePublicRead(request('q=capacity0'), 'search');
  const busy = await handlePublicRead(request('q=capacity5'), 'search');
  expect(busy.status).toBe(503);
  expect(fetcher).toHaveBeenCalledTimes(4);
  release();
  expect(
    (await Promise.all([...reads, duplicate])).every((response) => response.status === 200),
  ).toBe(true);
});

it('rejects oversized upstream responses', async () => {
  vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'https://oversized-api-test.test');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('x'.repeat(4_000_001))),
  );
  expect((await handlePublicRead(request('q=oversize'), 'search')).status).toBe(503);
});
