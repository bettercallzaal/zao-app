// @vitest-environment node
/**
 * A visitor (verified Farcaster account, not a ZAO member, let in by the open
 * front door) can never write. Every member write handler is called with a
 * REAL visitor cookie session (iron-session stubbed to hold one) and the flag
 * ON, and must refuse with 401/403 before touching the database or Neynar.
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { visitor, touched } = vi.hoisted(() => ({
  visitor: {
    fid: 777,
    username: 'visitor',
    displayName: 'Visitor',
    pfpUrl: '',
    authMethod: 'farcaster',
    signerUuid: null as string | null,
    isAdmin: false,
    isMember: false,
    save: async () => {},
    destroy: () => {},
  },
  touched: [] as string[],
}));

vi.mock('iron-session', () => ({ getIronSession: async () => visitor }));
vi.mock('next/headers', () => ({ cookies: async () => ({}), headers: async () => new Headers() }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));
vi.mock('@/lib/env', () => ({
  ENV: new Proxy({}, { get: (_t, k) => (k === 'SESSION_SECRET' ? 'x'.repeat(32) : 'placeholder') }),
}));
// Any database or Neynar access by a refused request is a failure.
vi.mock('@/lib/db/supabase', () => ({
  supabaseAdmin: new Proxy(
    {},
    {
      get: (_t, k) => {
        touched.push(`supabase.${String(k)}`);
        throw new Error(`visitor request reached supabase.${String(k)}`);
      },
    },
  ),
}));
vi.mock(
  '@/lib/farcaster/neynar',
  () =>
    new Proxy(
      {},
      {
        get: (_t, k) => {
          if (k === 'then' || k === '__esModule') return undefined;
          return async () => {
            touched.push(`neynar.${String(k)}`);
            throw new Error(`visitor request reached neynar.${String(k)}`);
          };
        },
      },
    ),
);
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

// [route module under src/app/api, method] for every member write in the app.
const WRITES: [string, 'POST' | 'PUT' | 'PATCH' | 'DELETE'][] = [
  ['casts/delete', 'POST'],
  ['casts/summary', 'POST'],
  ['chat/hide', 'POST'],
  ['chat/react', 'POST'],
  ['chat/react', 'DELETE'],
  ['chat/schedule', 'POST'],
  ['chat/schedule', 'DELETE'],
  ['chat/schedule', 'PATCH'],
  ['chat/send', 'POST'],
  ['music/comments', 'POST'],
  ['music/comments', 'DELETE'],
  ['music/library', 'POST'],
  ['music/library/like', 'POST'],
  ['music/library/play', 'POST'],
  ['music/library/react', 'POST'],
  ['music/playlists', 'POST'],
  ['music/scrobble', 'POST'],
  ['music/submissions', 'POST'],
  ['music/submissions', 'DELETE'],
  ['neynar/cast', 'POST'],
  ['neynar/follow', 'POST'],
  ['neynar/like', 'POST'],
  ['neynar/recast', 'POST'],
  ['notifications', 'PATCH'],
  ['upload', 'POST'],
  ['users/block', 'POST'],
  ['users/block', 'DELETE'],
  ['users/follow', 'POST'],
  ['users/follow', 'DELETE'],
  ['users/mute', 'POST'],
  ['users/mute', 'DELETE'],
  ['users/profile', 'PATCH'],
  ['users/socials', 'PATCH'],
  ['users/wallet-visibility', 'PATCH'],
  ['auth/signer', 'POST'],
  ['auth/signer/save', 'POST'],
  ['auth/lastfm/disconnect', 'POST'],
  ['auth/listenbrainz', 'POST'],
  ['auth/listenbrainz', 'DELETE'],
  ['platforms/facebook', 'DELETE'],
  ['platforms/kick', 'DELETE'],
  ['platforms/twitch', 'DELETE'],
];

beforeAll(() => {
  vi.stubEnv('FARCASTER_OPEN_FRONT_DOOR', '1');
});
afterAll(() => vi.unstubAllEnvs());

describe.each([
  ['a visitor', null],
  // A visitor can never obtain a signer (the signer routes are members-only),
  // but even one carrying a signer UUID must be refused, so the refusal comes
  // from membership and not only from the missing signer.
  ['a visitor carrying a signer', 'leaked-signer-uuid'],
])('%s can never write', (_label, signerUuid) => {
  it.each(WRITES)('%s %s refuses before any data access', async (route, method) => {
    visitor.signerUuid = signerUuid;
    touched.length = 0;
    const mod = (await import(`@/app/api/${route}/route`)) as Record<string, Handler>;
    const handler = mod[method];
    expect(handler, `${route} exports ${method}`).toBeTypeOf('function');
    const req = new NextRequest(new URL(`/api/${route}`, 'http://localhost:3000'), {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hi', fid: 1, targetFid: 1, castHash: `0x${'a'.repeat(40)}` }),
    });
    const res = await handler(req, { params: Promise.resolve({}) });
    expect([401, 403], `${route} ${method} answered ${res.status}`).toContain(res.status);
    expect(touched).toEqual([]);
  });
});
