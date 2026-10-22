// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const offline = new Response('Public offline page');
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue(offline),
    keys: vi.fn().mockResolvedValue(['zaoos-v3', 'another-app']),
    delete: vi.fn(),
  };
  const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
  const self = {
    location: new URL('https://zao.example/sw.js'),
    addEventListener: (name: string, callback: (event: unknown) => void) =>
      handlers.set(name, callback),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  runInNewContext(readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8'), {
    self,
    caches,
    fetch: fetcher,
    URL,
  });
  return { handlers, caches, cache, offline };
}

it.each([
  '/api/members',
  '/api/music/private',
  '/chat?_rsc=test',
  'https://other.example/image.png',
])('does not intercept or cache private/foreign reads: %s', (path) => {
  const { handlers, caches } = worker();
  const respondWith = vi.fn();
  handlers.get('fetch')!({
    request: { method: 'GET', url: new URL(path, 'https://zao.example').href, mode: 'cors' },
    respondWith,
  });
  expect(respondWith).not.toHaveBeenCalled();
  expect(caches.open).not.toHaveBeenCalled();
});
it('offline navigation returns the public offline shell, never a cached member page', async () => {
  const { handlers, caches, offline } = worker();
  let pending!: Promise<Response>;
  handlers.get('fetch')!({
    request: { method: 'GET', url: 'https://zao.example/chat', mode: 'navigate' },
    respondWith: (value: Promise<Response>) => {
      pending = value;
    },
  });
  expect(await pending).toBe(offline);
  expect(caches.match).toHaveBeenCalledExactlyOnceWith('/offline');
});
it('precache excludes the login page and activation only clears ZAO caches', async () => {
  const { handlers, caches, cache } = worker();
  let pending!: Promise<unknown>;
  const event = {
    waitUntil: (value: Promise<unknown>) => {
      pending = value;
    },
  };
  handlers.get('install')!(event);
  await pending;
  expect(cache.addAll.mock.calls[0][0]).not.toContain('/');
  handlers.get('activate')!(event);
  await pending;
  expect(caches.delete).toHaveBeenCalledExactlyOnceWith('zaoos-v3');
});
