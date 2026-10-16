// @vitest-environment node
/**
 * A visitor (verified Farcaster account, not a ZAO member, let in by the open
 * front door) can never write. Every member write handler is called with a
 * REAL visitor cookie session (iron-session stubbed to hold one) and the flag
 * ON, and must refuse with 401/403 before touching the database or Neynar.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
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

/**
 * Routes that write WITHOUT a member session by design. Everything else under
 * src/app/api that exports POST/PUT/PATCH/DELETE is a member write and is
 * tested below, so a new write route is covered the day it is added.
 */
const NOT_MEMBER_WRITES: Record<string, string> = {
  'auth/verify': 'signs a person in (creates the session)',
  'auth/logout': 'clears the caller’s own session',
  'auth/register': 'pre-session wallet registration, gated by the allowlist',
  'miniapp/auth-context': 'read-only context lookup; saves no session',
  'miniapp/webhook': 'Farcaster webhook, verified by signature, not by session',
};

const API = join(process.cwd(), 'src/app/api');
function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : routeFiles(p);
    return e.name === 'route.ts' ? [p] : [];
  });
}
const WRITES: [string, string][] = routeFiles(API)
  .map((p) => relative(API, p).split(sep).slice(0, -1).join('/'))
  .filter((route) => !(route in NOT_MEMBER_WRITES))
  .flatMap((route) =>
    [
      ...readFileSync(join(API, route, 'route.ts'), 'utf8').matchAll(
        /export async function (POST|PUT|PATCH|DELETE)\b/g,
      ),
    ].map((m): [string, string] => [route, m[1]]),
  );

beforeAll(() => {
  vi.stubEnv('FARCASTER_OPEN_FRONT_DOOR', '1');
});
afterAll(() => vi.unstubAllEnvs());

it('finds the member write routes (not an empty scan)', () => {
  expect(WRITES.length).toBeGreaterThan(40);
});

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
    const mod = (await import(/* @vite-ignore */ `@/app/api/${route}/route`)) as Record<
      string,
      Handler
    >;
    const handler = mod[method];
    expect(handler, `${route} exports ${method}`).toBeTypeOf('function');
    const req = new NextRequest(new URL(`/api/${route}`, 'http://localhost:3000'), {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hi', fid: 1, targetFid: 1, castHash: `0x${'a'.repeat(40)}` }),
    });
    // Dynamic segments get a well-formed value so validation is not what refuses.
    const params = Object.fromEntries(
      [...route.matchAll(/\[(\w+)\]/g)].map((m) => [m[1], '7c9e6679-7425-40de-944b-e07fc1f90ae7']),
    );
    const res = await handler(req, { params: Promise.resolve(params) });
    expect([401, 403], `${route} ${method} answered ${res.status}`).toContain(res.status);
    expect(touched).toEqual([]);
  });
});
