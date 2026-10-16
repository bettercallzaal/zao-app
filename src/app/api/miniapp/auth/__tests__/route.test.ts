// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRequest } from '@/test-utils/api-helpers';

const { mockVerifyJwt, mockSaveSession, mockGetUserByFid, mockCheckAllowlist, LookupError } =
  vi.hoisted(() => ({
    mockVerifyJwt: vi.fn(),
    mockSaveSession: vi.fn(),
    mockGetUserByFid: vi.fn(),
    mockCheckAllowlist: vi.fn(),
    LookupError: class AllowlistLookupError extends Error {},
  }));

vi.mock('@farcaster/quick-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@farcaster/quick-auth')>()),
  createClient: () => ({ verifyJwt: mockVerifyJwt }),
}));
vi.mock('@/lib/auth/session', () => ({ saveSession: mockSaveSession }));
vi.mock('@/lib/env', () => ({ ENV: { NEXT_PUBLIC_SIWF_DOMAIN: 'example.test' } }));
vi.mock('@/lib/farcaster/neynar', () => ({ getUserByFid: mockGetUserByFid }));
vi.mock('@/lib/gates/allowlist', () => ({
  checkAllowlist: mockCheckAllowlist,
  AllowlistLookupError: LookupError,
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { Errors } from '@farcaster/quick-auth';
import { GET } from '../route';

function req(auth: string | null = 'Bearer good.jwt.token') {
  return makeRequest('/api/miniapp/auth', auth ? { headers: { Authorization: auth } } : undefined);
}
const USER = {
  username: 'u',
  display_name: 'U',
  pfp_url: 'p',
  verified_addresses: { eth_addresses: ['0xabc'] },
};

beforeEach(() => {
  mockVerifyJwt.mockResolvedValue({ sub: '42' });
  mockGetUserByFid.mockResolvedValue(USER);
  mockCheckAllowlist.mockResolvedValue({ allowed: true });
  mockSaveSession.mockResolvedValue(undefined);
});
afterEach(() => vi.clearAllMocks());

describe('GET /api/miniapp/auth', () => {
  it('401 without a Bearer token', async () => {
    expect((await GET(req(null))).status).toBe(401);
    expect(mockVerifyJwt).not.toHaveBeenCalled();
  });

  it('401 Invalid token for a bad token (quick-auth InvalidTokenError)', async () => {
    mockVerifyJwt.mockRejectedValue(new Errors.InvalidTokenError('expired'));
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid token');
    expect(mockCheckAllowlist).not.toHaveBeenCalled();
  });

  it('401 Invalid token for a bad signature (raw jose error)', async () => {
    mockVerifyJwt.mockRejectedValue(
      Object.assign(new Error('sig'), { code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' }),
    );
    expect((await GET(req())).status).toBe(401);
  });

  it('401 when the token subject is not a FID', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'not-a-number' });
    expect((await GET(req())).status).toBe(401);
  });

  it('503, not "Invalid token", when Farcaster keys cannot be fetched', async () => {
    mockVerifyJwt.mockRejectedValue(Object.assign(new Error('t'), { code: 'ERR_JWKS_TIMEOUT' }));
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).not.toBe('Invalid token');
  });

  it('503 membership error, not "Invalid token", when the allowlist lookup fails', async () => {
    mockCheckAllowlist.mockRejectedValue(new LookupError('allowlist lookup failed: fidMatch'));
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('Could not verify membership. Please try again.');
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('502, not "Invalid token", when the profile lookup fails', async () => {
    mockGetUserByFid.mockRejectedValue(new Error('neynar down'));
    const res = await GET(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error).not.toBe('Invalid token');
  });

  it('a member gets a session and hasAccess true', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).hasAccess).toBe(true);
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ fid: 42 }));
  });

  it('a non-member gets hasAccess false and no session', async () => {
    mockCheckAllowlist.mockResolvedValue({ allowed: false });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).hasAccess).toBe(false);
    expect(mockSaveSession).not.toHaveBeenCalled();
  });
});
