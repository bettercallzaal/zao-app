// @vitest-environment node
/**
 * Runs the real scripts/smoke-live.sh against a throwaway local HTTP server
 * that imitates a healthy deploy, then breaks one thing at a time. Never
 * touches a real deploy.
 */
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts/smoke-live.sh');
const SHELL = '<html><head><title>The ZAO app</title></head><body>THE ZAO</body></html>';
const NOT_FOUND = '<html><body><p>This page doesn&#39;t exist.</p></body></html>';

type Reply = { status: number; body: string; location?: string };
type Site = Record<string, Reply>;

const healthy = (): Site => ({
  '/': { status: 200, body: SHELL },
  '/chat': { status: 307, body: '', location: '/' },
  '/feed': { status: 404, body: NOT_FOUND },
  '/api/auth/session': { status: 401, body: JSON.stringify({ authenticated: false }) },
  '/api/chat/messages?channel=zao': {
    status: 401,
    body: JSON.stringify({ error: 'Unauthorized' }),
  },
  '/manifest.json': { status: 200, body: JSON.stringify({ name: 'The ZAO app' }) },
  '/.well-known/farcaster.json': {
    status: 200,
    body: JSON.stringify({ miniapp: { name: 'The ZAO app' } }),
  },
});

let server: Server | null = null;
afterEach(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  server = null;
});

async function serve(site: Site): Promise<string> {
  const srv = createServer((req, res) => {
    const reply = site[req.url ?? ''] ?? { status: 404, body: NOT_FOUND };
    res.writeHead(reply.status, reply.location ? { location: reply.location } : {});
    res.end(reply.body);
  });
  server = srv;
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
  return `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
}

function run(...args: string[]): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const p = spawn('bash', [SCRIPT, ...args], { env: { PATH: process.env.PATH ?? '' } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
}

describe('scripts/smoke-live.sh', { timeout: 30_000 }, () => {
  it('passes a healthy deploy: exit 0, one PASS line per check', async () => {
    const r = await run(await serve(healthy()));
    expect(r.code, r.out).toBe(0);
    expect(r.out.match(/^PASS /gm)).toHaveLength(8);
    expect(r.out).not.toContain('FAIL');
  });

  it.each<[string, (s: Site) => void, string]>([
    [
      'the landing page lost the app shell',
      (s) => (s['/'] = { status: 200, body: '<html>oops</html>' }),
      '/ renders the app shell',
    ],
    [
      '/chat errors',
      (s) => (s['/chat'] = { status: 500, body: SHELL }),
      '/chat renders the app shell',
    ],
    [
      'the front door is open (/feed 200)',
      (s) => (s['/feed'] = { status: 200, body: SHELL }),
      '/feed should be the not-found page',
    ],
    [
      '/feed 404 but an error page',
      (s) => (s['/feed'] = { status: 404, body: 'boom' }),
      '/feed should be the not-found page',
    ],
    [
      'session route returns HTML',
      (s) => (s['/api/auth/session'] = { status: 200, body: SHELL }),
      '/api/auth/session should return JSON',
    ],
    [
      'messages readable without a session',
      (s) => (s['/api/chat/messages?channel=zao'] = { status: 200, body: '{"casts":[]}' }),
      '/api/chat/messages without a session should be 401',
    ],
    [
      'manifest has the wrong name',
      (s) => (s['/manifest.json'] = { status: 200, body: '{"name":"zcaster"}' }),
      '/manifest.json should parse',
    ],
    [
      'manifest is not JSON',
      (s) => (s['/manifest.json'] = { status: 200, body: SHELL }),
      '/manifest.json should parse',
    ],
    [
      'farcaster.json is missing',
      (s) => delete s['/.well-known/farcaster.json'],
      '/.well-known/farcaster.json should parse',
    ],
    [
      'a page still says ZAO OS',
      (s) => (s['/'] = { status: 200, body: `${SHELL} ZAO OS` }),
      'page body (home) contains the old name "ZAO OS"',
    ],
    [
      'a page still says zcaster',
      (s) => (s['/feed'] = { status: 404, body: `${NOT_FOUND} Zcaster` }),
      'page body (feed) contains the old name "zcaster"',
    ],
  ])('fails when %s', async (_label, breakIt, expectedLine) => {
    const site = healthy();
    breakIt(site);
    const r = await run(await serve(site));
    expect(r.code, r.out).toBe(1);
    expect(r.out).toContain(`FAIL  ${expectedLine}`);
  });

  it('exit 2 without a base URL', async () => {
    expect((await run()).code).toBe(2);
  });

  it('exit 2 when the base URL does not answer', async () => {
    const r = await run('http://127.0.0.1:9');
    expect(r.code).toBe(2);
    expect(r.out).toContain('CANNOT RUN');
  });
});
