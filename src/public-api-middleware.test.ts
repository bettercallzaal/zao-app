// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
import { rateLimit } from '@/lib/rate-limit';
import { middleware } from './middleware';

beforeEach(() => {
  vi.mocked(rateLimit).mockReset();
});

it('answers cross-origin preflight without consuming an upstream rate limit', async () => {
  const response = await middleware(
    new NextRequest('https://zao.example/api/public/v1/search', {
      method: 'OPTIONS',
      headers: { Origin: 'https://builder.example' },
    }),
  );
  expect(response.status).toBe(204);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(rateLimit).not.toHaveBeenCalled();
});

it('rejects public API writes even from same-origin callers', async () => {
  const response = await middleware(
    new NextRequest('https://zao.example/api/public/v1/cast', { method: 'POST' }),
  );
  expect(response.status).toBe(405);
  expect(response.headers.get('Allow')).toBe('GET, HEAD, OPTIONS');
  expect(rateLimit).not.toHaveBeenCalled();
});

it('shares one per-IP budget across all public endpoints', async () => {
  vi.mocked(rateLimit).mockResolvedValue({ success: true, remaining: 29 });
  for (const path of ['search?q=x', 'cast?hash=x', 'channel']) {
    await middleware(
      new NextRequest(`https://zao.example/api/public/v1/${path}`, {
        headers: { 'x-real-ip': '192.0.2.1' },
      }),
    );
  }
  expect(vi.mocked(rateLimit).mock.calls.map((call) => call[0])).toEqual(
    Array(3).fill('192.0.2.1:/api/public/v1/'),
  );
});

it('keeps rate-limit errors uncached and readable by browser API consumers', async () => {
  vi.mocked(rateLimit).mockResolvedValue({ success: false, remaining: 0 });
  const response = await middleware(
    new NextRequest('https://zao.example/api/public/v1/search?q=x'),
  );
  expect(response.status).toBe(429);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Retry-After')).toBe('60');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
});
