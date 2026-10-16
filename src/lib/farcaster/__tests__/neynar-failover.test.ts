// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The read-proxy URL is read at module load, so each test that needs a
// different FARCASTER_READ_API_BASE reloads neynar.ts after setting it.
const env = vi.hoisted(() => ({
  NEYNAR_API_KEY: 'test-neynar-key',
  FARCASTER_READ_API_BASE: undefined as string | undefined,
}));

vi.mock('@/lib/env', () => ({ ENV: env }));

const READ_BASE = 'https://read.example.test';
const READ_PREFIX = `${READ_BASE}/v2/farcaster`;
const NEYNAR_PREFIX = 'https://api.neynar.com/v2/farcaster';

type NeynarModule = typeof import('../neynar');

async function load(readBase: string | undefined): Promise<NeynarModule> {
  vi.resetModules();
  env.FARCASTER_READ_API_BASE = readBase;
  return import('../neynar');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Resolves only when the signal aborts, like a proxy that never answers. */
function hang(signal: AbortSignal | null | undefined): Promise<never> {
  return new Promise((_, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener('abort', () => reject(signal.reason));
  });
}

type Handler = (url: string, init: RequestInit) => Promise<Response> | Response;

let fetchMock: ReturnType<typeof vi.fn>;
let timeoutBudgets: number[];

function stubFetch(handler: Handler) {
  fetchMock = vi.fn(async (url: string, init: RequestInit) => handler(url, init));
  vi.stubGlobal('fetch', fetchMock);
}

function calledUrls(): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

beforeEach(() => {
  timeoutBudgets = [];
  // Record each budget that AbortSignal.timeout is asked for, and fire quickly
  // so the tests do not wait out the real 5s and 10s budgets.
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
    timeoutBudgets.push(ms);
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')),
      5,
    );
    return controller.signal;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  env.FARCASTER_READ_API_BASE = undefined;
});

describe('read failover with a read proxy configured', () => {
  it('falls through to Neynar when the proxy times out, with a fresh Neynar budget', async () => {
    const { getTrendingFeed } = await load(READ_BASE);
    stubFetch((url, init) => {
      if (url.startsWith(READ_PREFIX)) return hang(init.signal);
      if (init.signal?.aborted) throw init.signal.reason;
      return json({ casts: [{ hash: '0xneynar' }] });
    });

    const result = await getTrendingFeed(10, '24h');

    expect(result.casts[0].hash).toBe('0xneynar');
    expect(calledUrls()).toEqual([
      expect.stringContaining(READ_PREFIX),
      expect.stringContaining(NEYNAR_PREFIX),
    ]);
    expect(timeoutBudgets).toEqual([5000, 10000]);
  });

  it('falls through to Neynar when the proxy returns non-OK', async () => {
    const { getTrendingFeed } = await load(READ_BASE);
    stubFetch((url) => {
      if (url.startsWith(READ_PREFIX)) return json({ error: 'down' }, 503);
      return json({ casts: [{ hash: '0xneynar' }] });
    });

    const result = await getTrendingFeed();

    expect(result.casts[0].hash).toBe('0xneynar');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls through to Neynar when a 200 from the proxy has the wrong shape', async () => {
    const { getTrendingFeed } = await load(READ_BASE);
    stubFetch((url) => {
      if (url.startsWith(READ_PREFIX)) return json({ message: 'placeholder' });
      return json({ casts: [{ hash: '0xneynar' }] });
    });

    const result = await getTrendingFeed();

    expect(result.casts[0].hash).toBe('0xneynar');
    expect(calledUrls()).toHaveLength(2);
    expect(calledUrls()[1]).toContain(NEYNAR_PREFIX);
  });

  it('uses the proxy response and skips Neynar when the proxy succeeds with a valid shape', async () => {
    const { getTrendingFeed } = await load(READ_BASE);
    stubFetch(() => json({ casts: [{ hash: '0xproxy' }] }));

    const result = await getTrendingFeed();

    expect(result.casts[0].hash).toBe('0xproxy');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrls()[0]).toContain(READ_PREFIX);
  });

  it('does not retry when the caller cancels its own request', async () => {
    const { fetchWithFailover } = await load(READ_BASE);
    const controller = new AbortController();
    stubFetch((_url, init) => {
      controller.abort(new DOMException('caller cancelled', 'AbortError'));
      return hang(init.signal);
    });

    await expect(
      fetchWithFailover(
        '/feed/trending?limit=1',
        { signal: controller.signal },
        {
          validate: () => true,
        },
      ),
    ).rejects.toThrow('caller cancelled');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrls()[0]).toContain(READ_PREFIX);
  });

  it('surfaces the Neynar error when both providers fail', async () => {
    const { getTrendingFeed } = await load(READ_BASE);
    stubFetch(() => json('boom', 500));

    await expect(getTrendingFeed()).rejects.toThrow('Neynar trending feed error 500');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('read failover with no read proxy configured', () => {
  it('makes exactly one Neynar request', async () => {
    const { getTrendingFeed } = await load(undefined);
    stubFetch(() => json({ casts: [{ hash: '0xneynar' }] }));

    const result = await getTrendingFeed();

    expect(result.casts[0].hash).toBe('0xneynar');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledUrls()[0]).toContain(NEYNAR_PREFIX);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-neynar-key');
    expect(timeoutBudgets).toEqual([10000]);
  });
});
