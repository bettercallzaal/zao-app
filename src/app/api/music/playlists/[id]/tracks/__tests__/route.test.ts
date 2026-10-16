import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chainMock, makeRequest } from '@/test-utils/api-helpers';

// Playlist track DELETE ownership (doc 841 round-2 security-authz HIGH:
// "IDOR: Unauthorized playlist track deletion without ownership verification").

const { mockGetSessionData, mockFrom, mockAddToPlaylist } = vi.hoisted(() => ({
  mockGetSessionData: vi.fn(),
  mockFrom: vi.fn(),
  mockAddToPlaylist: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSessionData: () => mockGetSessionData() }));
vi.mock('@/lib/db/supabase', () => ({ supabaseAdmin: { from: mockFrom } }));
vi.mock('@/lib/music/library', () => ({ addToPlaylist: mockAddToPlaylist }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { DELETE, POST } from '../route';

const SONG_ID = '550e8400-e29b-41d4-a716-446655440000';

function delReq() {
  return makeRequest('/api/music/playlists/p1/tracks', {
    method: 'DELETE',
    body: JSON.stringify({ songId: SONG_ID }),
    headers: { 'Content-Type': 'application/json' },
  });
}
const PLAYLIST_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ctx = { params: Promise.resolve({ id: PLAYLIST_ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks does NOT drain mockReturnValueOnce queues; reset mockFrom so a
  // test that queues more returns than it consumes can't leak into the next one.
  mockFrom.mockReset();
  mockGetSessionData.mockResolvedValue({ fid: 100 });
});

describe('DELETE /api/music/playlists/[id]/tracks - ownership (IDOR)', () => {
  it('rejects unauthenticated with 401', async () => {
    mockGetSessionData.mockResolvedValue(null);
    const res = await DELETE(delReq(), ctx);
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-UUID playlist id, before any database call', async () => {
    const res = await DELETE(delReq(), { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 when caller does not own a non-collaborative playlist (the IDOR fix)', async () => {
    // Playlist owned by a DIFFERENT fid, not collaborative.
    const playlistChain = chainMock({
      data: { created_by_fid: 999, collaborative: false },
      error: null,
    });
    const deleteChain = chainMock({ error: null });
    mockFrom.mockReturnValueOnce(playlistChain.chain).mockReturnValueOnce(deleteChain.chain);

    const res = await DELETE(delReq(), ctx);
    expect(res.status).toBe(403);
    // The destructive delete must NOT have run.
    expect(deleteChain.chain.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when the playlist does not exist', async () => {
    const playlistChain = chainMock({ data: null, error: null });
    mockFrom.mockReturnValueOnce(playlistChain.chain);
    const res = await DELETE(delReq(), ctx);
    expect(res.status).toBe(404);
  });

  it('allows the owner to delete a track (200)', async () => {
    const playlistChain = chainMock({
      data: { created_by_fid: 100, collaborative: false },
      error: null,
    });
    const deleteChain = chainMock({ error: null });
    mockFrom.mockReturnValueOnce(playlistChain.chain).mockReturnValueOnce(deleteChain.chain);

    const res = await DELETE(delReq(), ctx);
    expect(res.status).toBe(200);
    expect(deleteChain.chain.delete).toHaveBeenCalled();
  });

  it('allows deletion on a collaborative playlist owned by another user (200)', async () => {
    const playlistChain = chainMock({
      data: { created_by_fid: 999, collaborative: true },
      error: null,
    });
    const deleteChain = chainMock({ error: null });
    mockFrom.mockReturnValueOnce(playlistChain.chain).mockReturnValueOnce(deleteChain.chain);

    const res = await DELETE(delReq(), ctx);
    expect(res.status).toBe(200);
  });
});

function postReq(body: unknown = { songId: SONG_ID }) {
  return makeRequest('/api/music/playlists/p1/tracks', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/music/playlists/[id]/tracks - ownership', () => {
  it('rejects unauthenticated with 401, before any database call', async () => {
    mockGetSessionData.mockResolvedValue(null);
    const res = await POST(postReq(), ctx);
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockAddToPlaylist).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-UUID playlist id, before any database call', async () => {
    const res = await POST(postReq(), { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-UUID song id', async () => {
    const res = await POST(postReq({ songId: 'not-a-uuid' }), ctx);
    expect(res.status).toBe(400);
    expect(mockAddToPlaylist).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller does not own a non-collaborative playlist', async () => {
    const playlistChain = chainMock({
      data: { created_by_fid: 999, collaborative: false },
      error: null,
    });
    mockFrom.mockReturnValueOnce(playlistChain.chain);
    const res = await POST(postReq(), ctx);
    expect(res.status).toBe(403);
    expect(mockAddToPlaylist).not.toHaveBeenCalled();
  });

  it('returns 404 when the playlist does not exist', async () => {
    mockFrom.mockReturnValueOnce(chainMock({ data: null, error: null }).chain);
    const res = await POST(postReq(), ctx);
    expect(res.status).toBe(404);
    expect(mockAddToPlaylist).not.toHaveBeenCalled();
  });

  it('lets the owner add a track (200)', async () => {
    mockFrom.mockReturnValueOnce(
      chainMock({ data: { created_by_fid: 100, collaborative: false }, error: null }).chain,
    );
    mockAddToPlaylist.mockResolvedValue(undefined);
    const res = await POST(postReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockAddToPlaylist).toHaveBeenCalledWith(PLAYLIST_ID, SONG_ID, 100);
  });

  it('lets anyone signed in add to a collaborative playlist (200)', async () => {
    mockFrom.mockReturnValueOnce(
      chainMock({ data: { created_by_fid: 999, collaborative: true }, error: null }).chain,
    );
    mockAddToPlaylist.mockResolvedValue(undefined);
    const res = await POST(postReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockAddToPlaylist).toHaveBeenCalledWith(PLAYLIST_ID, SONG_ID, 100);
  });

  it('returns a sanitized 500 when the playlist lookup errors', async () => {
    mockFrom.mockReturnValueOnce(
      chainMock({ data: null, error: { message: 'db down: secret detail' } }).chain,
    );
    const res = await POST(postReq(), ctx);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret detail');
    expect(mockAddToPlaylist).not.toHaveBeenCalled();
  });
});
