// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRawWorkspaceFeed as readWorkspaceFeed } from './read-feed';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('workspace node integration', () => {
  it('preserves embeds and casts when a profile fails, and bounds requests to fixed routes', async () => {
    vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'http://127.0.0.1:3381');
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('userDataByFid')) throw new Error('profile offline');
      return new Response(
        JSON.stringify({
          messages: [
            {
              hash: `0x${'b'.repeat(40)}`,
              data: {
                fid: 12,
                timestamp: 1,
                castAddBody: {
                  text: 'music',
                  embeds: [{ url: 'https://audius.co/artist/song' }],
                },
              },
            },
          ],
          nextPageToken: 'next',
        }),
      );
    });
    vi.stubGlobal('fetch', fetcher);
    const feed = await readWorkspaceFeed();
    expect(feed.posts).toHaveLength(1);
    expect(feed.posts[0]).toMatchObject({
      fid: 12,
      name: 'Farcaster 12',
      timestamp: 1609459201000,
      embeds: ['https://audius.co/artist/song'],
    });
    expect(feed.nextPageToken).toBe('next');
    expect(fetcher.mock.calls[0][0]).toContain('/v1/castsByParent?url=https%3A%2F%2Fwarpcast.com');
  });

  it('preserves multi-shard rows while bounding profile fan-out', async () => {
    vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'https://malformed.test');
    const valid = (fid: number) => ({
      hash: `0x${String(fid).padStart(40, 'a')}`,
      data: { fid, timestamp: 1, castAddBody: { text: 'valid' } },
    });
    const fetcher = vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify({
            messages: url.includes('userDataByFid')
              ? []
              : [null, {}, { hash: 'bad' }, ...Array.from({ length: 30 }, (_, i) => valid(i + 1))],
          }),
        ),
    );
    vi.stubGlobal('fetch', fetcher);
    const feed = await readWorkspaceFeed();
    expect(feed.posts).toHaveLength(30);
    expect(fetcher).toHaveBeenCalledTimes(25);
  });

  it('returns casts when the shared profile deadline expires', async () => {
    vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'https://slow-profiles.test');
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      if (!url.includes('userDataByFid'))
        return new Response(
          JSON.stringify({
            messages: Array.from({ length: 12 }, (_, i) => ({
              hash: `0x${String(i).padStart(40, 'a')}`,
              data: { fid: i + 1, timestamp: 1, castAddBody: { text: 'still readable' } },
            })),
          }),
        );
      if (options.signal?.aborted) throw new Error('deadline');
      return new Promise<Response>((_, reject) =>
        options.signal?.addEventListener('abort', () => reject(new Error('deadline')), {
          once: true,
        }),
      );
    });
    vi.stubGlobal('fetch', fetcher);
    const reading = readWorkspaceFeed();
    await vi.waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(1));
    deadline.abort();
    const feed = await reading;
    expect(feed.posts).toHaveLength(12);
    expect(timeout).toHaveBeenCalledWith(7000);
    expect(fetcher.mock.calls.every(([, options]) => options.signal === deadline.signal)).toBe(
      true,
    );
  });

  it('cancels an oversized upstream body before buffering it all', async () => {
    vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'https://oversized.test');
    const cancel = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(4_000_001));
              },
              cancel,
            }),
          ),
      ),
    );
    await expect(readWorkspaceFeed()).rejects.toThrow('Node response too large');
    expect(cancel).toHaveBeenCalled();
  });
});
