// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/workspace/read-feed', () => ({ readWorkspaceFeed: vi.fn() }));
import { readWorkspaceFeed } from '@/lib/workspace/read-feed';
import { GET } from './route';

describe('public workspace read route', () => {
  it.each([
    '?hash=bad&fid=1',
    '?fid=1',
    '?hash=0x' + 'a'.repeat(40) + '&fid=-1',
    '?pageToken=' + 'x'.repeat(4097),
  ])('rejects invalid input without calling the node: %s', async (query) => {
    vi.mocked(readWorkspaceFeed).mockClear();
    expect((await GET(new NextRequest('http://localhost/api/workspace/feed' + query))).status).toBe(
      400,
    );
    expect(readWorkspaceFeed).not.toHaveBeenCalled();
  });
  it('keeps failures explicit rather than returning an empty successful feed', async () => {
    vi.mocked(readWorkspaceFeed).mockRejectedValueOnce(new Error('offline'));
    const result = await GET(new NextRequest('http://localhost/api/workspace/feed'));
    expect(result.status).toBe(503);
    expect((await result.json()).error).toContain('saved posts');
  });
  it('accepts a measured multi-shard cursor of 890 characters', async () => {
    vi.mocked(readWorkspaceFeed).mockResolvedValueOnce({
      posts: [],
      source: 'Test',
      checkedAt: new Date().toISOString(),
      nextPageToken: null,
    });
    const token = 'c'.repeat(890);
    expect(
      (await GET(new NextRequest('http://localhost/api/workspace/feed?pageToken=' + token))).status,
    ).toBe(200);
    expect(readWorkspaceFeed).toHaveBeenLastCalledWith({ hash: undefined, fid: undefined, token });
  });
});
