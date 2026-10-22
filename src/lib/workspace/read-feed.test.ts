// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readWorkspaceFeed } from './read-feed';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('workspace node integration', () => {
  it('preserves embeds and casts when a profile fails, and bounds requests to fixed routes', async () => {
    vi.stubEnv('ZAO_WORKSPACE_NODE_URL', 'http://127.0.0.1:3381');
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('userDataByFid')) throw new Error('profile offline');
      return {
        ok: true,
        text: async () =>
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
      };
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
});
