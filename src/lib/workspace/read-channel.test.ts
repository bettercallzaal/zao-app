// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { readChannelFeed, normalizeChannelCast } from './read-channel';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const cast = (index: number) => ({
  parent_url: 'https://warpcast.com/~/channel/zao',
  hash: index.toString(16).padStart(40, 'a'),
  timestamp: new Date(1700000000000 + index * 1000).toISOString(),
  text: 'A channel cast',
  author: { fid: index + 1, username: 'artist', display_name: 'Artist' },
  embeds: [{ url: 'https://artist.bandcamp.com/track/song' }],
});

it('keeps all multi-shard casts, sorts newest first, and preserves a real-length cursor', async () => {
  vi.stubEnv('ZAO_WORKSPACE_FEED_NODE_URL', 'https://channel-adapter.test');
  const cursor = 'c'.repeat(890);
  const fetcher = vi.fn(
    async (_url: string) =>
      new Response(
        JSON.stringify({ casts: Array.from({ length: 24 }, (_, i) => cast(i)), next: { cursor } }),
      ),
  );
  vi.stubGlobal('fetch', fetcher);
  const feed = await readChannelFeed();
  expect(feed.posts).toHaveLength(24);
  expect(feed.posts[0].fid).toBe(24);
  expect(feed.posts[0].hash).toMatch(/^0x[0-9a-f]{40}$/);
  expect(feed.posts[0].embeds).toEqual(['https://artist.bandcamp.com/track/song']);
  expect(feed.nextPageToken).toBe(cursor);
  await readChannelFeed(cursor);
  expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('cursor')).toBe(cursor);
  expect(fetcher.mock.calls[0][0]).toContain('/v2/farcaster/feed/parent_urls?');
});

it('refuses an unrelated feed even when the upstream ignores the channel filter', async () => {
  vi.stubEnv('ZAO_WORKSPACE_FEED_NODE_URL', 'https://wrong-channel.test');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            casts: [{ ...cast(1), parent_url: 'https://warpcast.com/~/channel/other' }],
          }),
        ),
    ),
  );
  await expect(readChannelFeed()).rejects.toThrow('Invalid channel casts');
});

it('does not turn an error payload or unreadable casts into an empty successful feed', async () => {
  vi.stubEnv('ZAO_WORKSPACE_FEED_NODE_URL', 'https://bad-channel.test');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ error: 'unavailable' }))),
  );
  await expect(readChannelFeed()).rejects.toThrow('Invalid channel feed');
  expect(normalizeChannelCast({ ...cast(1), timestamp: 'not a date' })).toBeNull();
  expect(normalizeChannelCast({ ...cast(1), author: { fid: -1 } })).toBeNull();
});
