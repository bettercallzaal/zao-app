// @vitest-environment node
/**
 * Every place the app SENDS someone (a server redirect, a client push, a
 * redirect field an API returns, or an href link) must land on a page this
 * app ships. On
 * 2026-10-16 sign-in sent members to /os, a page this app does not have, so a
 * successful sign-in ended on a 404.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = join(process.cwd(), 'src/app');
const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return [p];
  });
}

/** '/chat' for src/app/(auth)/chat/page.tsx; route groups do not appear in URLs. */
const pages = new Set(
  walk(APP)
    .filter((p) => p.endsWith(`${sep}page.tsx`))
    .map((p) => {
      const segs = relative(APP, p)
        .split(sep)
        .slice(0, -1)
        .filter((s) => !(s.startsWith('(') && s.endsWith(')')));
      return `/${segs.join('/')}`;
    }),
);

/** Static files under public/ are served at their own path (e.g. /manifest.json). */
const PUBLIC = join(process.cwd(), 'public');
for (const f of walk(PUBLIC)) pages.add(`/${relative(PUBLIC, f).split(sep).join('/')}`);

const PATTERNS = [
  /\bredirect\(\s*['"`](\/[^'"`?#]*)/g,
  /\brouter\.(?:push|replace)\(\s*['"`](\/[^'"`?#]*)/g,
  /\bredirect:\s*['"`](\/[^'"`?#]*)/g,
  // Links: JSX href="/x", href={'/x'}, and nav config objects href: '/x'.
  /\bhref=\{?\s*['"`](\/[^'"`?#]*)/g,
  /\bhref:\s*['"`](\/[^'"`?#]*)/g,
];

const targets = walk(SRC)
  .filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p))
  .flatMap((p) => {
    const src = readFileSync(p, 'utf8');
    return PATTERNS.flatMap((re) =>
      [...src.matchAll(re)].map((m) => ({ file: relative(SRC, p), target: m[1] })),
    );
  })
  .filter((t) => !t.target.includes('${') && !t.target.startsWith('/api/'));

describe('navigation targets', () => {
  it('finds the pages and the navigation calls (not an empty scan)', () => {
    expect(pages.has('/chat')).toBe(true);
    expect(targets.length).toBeGreaterThan(5);
  });

  it('every redirect, push and link lands on a page this app ships', () => {
    const dead = targets.filter((t) => !pages.has(t.target.replace(/\/$/, '') || '/'));
    expect(dead).toEqual([]);
  });

  it('sign-in lands on /chat', () => {
    const verify = targets.filter((t) => t.file.endsWith(join('auth', 'verify', 'route.ts')));
    expect(verify.map((t) => t.target)).toContain('/chat');
  });
});
