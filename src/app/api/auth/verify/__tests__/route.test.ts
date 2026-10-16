// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePostRequest } from '@/test-utils/api-helpers';

const { mockVerifySignInMessage, mockSaveSession, mockGetUserByFid, mockCheckAllowlist, mockFrom } =
  vi.hoisted(() => ({
    mockVerifySignInMessage: vi.fn(),
    mockSaveSession: vi.fn(),
    mockGetUserByFid: vi.fn(),
    mockCheckAllowlist: vi.fn(),
    mockFrom: vi.fn(),
  }));
const mockSaveVisitorSession = vi.hoisted(() => vi.fn());

vi.mock('@farcaster/auth-client', () => ({
  createAppClient: () => ({ verifySignInMessage: mockVerifySignInMessage }),
  viemConnector: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({
  saveSession: mockSaveSession,
  saveVisitorSession: mockSaveVisitorSession,
}));
vi.mock('@/lib/db/supabase', () => ({ supabaseAdmin: { from: mockFrom } }));
vi.mock('@/lib/farcaster/neynar', () => ({ getUserByFid: mockGetUserByFid }));
vi.mock('@/lib/gates/allowlist', () => ({ checkAllowlist: mockCheckAllowlist }));
vi.mock('@/lib/notifications', () => ({ createInAppNotification: vi.fn(async () => {}) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { POST } from '../route';

/** Any supabase chain: every method chains, awaiting it resolves `result`. */
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'upsert', 'delete', 'eq', 'gt', 'lt', 'maybeSingle']) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(async () => result);
  // biome-ignore lint/suspicious/noThenProperty: mocks an awaitable Supabase query chain
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

const BODY = { message: 'm', signature: '0x1', nonce: 'n', domain: 'example.test' };
const USER = {
  username: 'u',
  display_name: 'U',
  pfp_url: 'p',
  custody_address: '0xcustody',
  verified_addresses: { eth_addresses: ['0xverified'] },
};

beforeEach(() => {
  mockFrom.mockImplementation(() => chain({ data: { nonce: 'n' }, error: null }));
  mockVerifySignInMessage.mockResolvedValue({ success: true, isError: false, fid: 42 });
  mockGetUserByFid.mockResolvedValue(USER);
  mockSaveSession.mockResolvedValue(undefined);
});
afterEach(() => vi.clearAllMocks());

describe('POST /api/auth/verify - membership answers', () => {
  it('a member (by FID) gets a session', async () => {
    mockCheckAllowlist.mockResolvedValue({ allowed: true });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(200);
    expect(mockSaveSession).toHaveBeenCalled();
  });

  it('a completed "not a member" answer is a 403', async () => {
    mockCheckAllowlist.mockResolvedValue({ allowed: false });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(403);
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('a FAILED FID lookup is a 502, never "Not on allowlist", even if the wallet lookups miss', async () => {
    mockCheckAllowlist
      .mockRejectedValueOnce(new Error('allowlist lookup failed: fidMatch'))
      .mockResolvedValue({ allowed: false });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('Could not verify membership. Please try again.');
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('a failed FID lookup still lets a member in through a verified wallet', async () => {
    mockCheckAllowlist
      .mockRejectedValueOnce(new Error('allowlist lookup failed: fidMatch'))
      .mockResolvedValue({ allowed: true });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(200);
    expect(mockSaveSession).toHaveBeenCalled();
  });

  it('a failed wallet lookup is a 502', async () => {
    mockCheckAllowlist
      .mockResolvedValueOnce({ allowed: false })
      .mockRejectedValue(new Error('allowlist lookup failed: custodyMatch'));
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(502);
  });
});

describe('POST /api/auth/verify - open front door (FARCASTER_OPEN_FRONT_DOOR)', () => {
  beforeEach(() => {
    mockSaveVisitorSession.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    '',
    '0',
    'true',
  ])('flag %j: a non-member still gets 403 and no session', async (flag) => {
    vi.stubEnv('FARCASTER_OPEN_FRONT_DOOR', flag);
    mockCheckAllowlist.mockResolvedValue({ allowed: false });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(403);
    expect(mockSaveVisitorSession).not.toHaveBeenCalled();
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('flag on: a non-member gets a visitor session, never a member one, and goes to /feed', async () => {
    vi.stubEnv('FARCASTER_OPEN_FRONT_DOOR', '1');
    mockCheckAllowlist.mockResolvedValue({ allowed: false });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, role: 'visitor', redirect: '/feed' });
    expect(mockSaveVisitorSession).toHaveBeenCalledWith({
      fid: 42,
      username: 'u',
      displayName: 'U',
      pfpUrl: 'p',
    });
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('flag on: a FAILED FID lookup is a 502, never a downgrade to visitor', async () => {
    vi.stubEnv('FARCASTER_OPEN_FRONT_DOOR', '1');
    mockCheckAllowlist
      .mockRejectedValueOnce(new Error('allowlist lookup failed: fidMatch'))
      .mockResolvedValue({ allowed: false });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(502);
    expect(mockSaveVisitorSession).not.toHaveBeenCalled();
  });

  it('flag on: a member still gets a member session, not a visitor one', async () => {
    vi.stubEnv('FARCASTER_OPEN_FRONT_DOOR', '1');
    mockCheckAllowlist.mockResolvedValue({ allowed: true });
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(200);
    expect(mockSaveSession).toHaveBeenCalled();
    expect(mockSaveVisitorSession).not.toHaveBeenCalled();
  });

  it('flag on: returns 500 when the visitor session cannot be saved', async () => {
    vi.stubEnv('FARCASTER_OPEN_FRONT_DOOR', '1');
    mockCheckAllowlist.mockResolvedValue({ allowed: false });
    mockSaveVisitorSession.mockRejectedValue(new Error('cookie store down'));
    const res = await POST(makePostRequest('/api/auth/verify', BODY));
    expect(res.status).toBe(500);
  });
});
