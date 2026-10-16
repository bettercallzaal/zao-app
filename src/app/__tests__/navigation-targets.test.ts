// @vitest-environment node
/**
 * Every place the app SENDS someone must land on a page this app ships (or a
 * static file under public/). On 2026-10-16 sign-in sent members to /os, a
 * page this app does not have, so a successful sign-in ended on a 404.
 *
 * Covered forms (see the probe test below, which must catch every one):
 * - server redirect('/x'), client router.push|replace('/x')
 * - an API's redirect: '/x' field
 * - any href-like prop or key: href="/x", href={'/x'}, href: '/x',
 *   backHref="/x", backHref = '/x' (a default), location.href = '/x'
 * - location.assign|replace('/x')
 * - Link object hrefs: href={{ pathname: '/x' }}
 * - template literals: `/x/${id}` needs a dynamic page such as /x/[id]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = join(process.cwd(), 'src/app');
const SRC = join(process.cwd(), 'src');
const PUBLIC = join(process.cwd(), 'public');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(p);
    return [p];
  });
}

/** Page URL segments; route groups do not appear in URLs, [x] is dynamic. */
const pageRoutes: string[][] = walk(APP)
  .filter((p) => p.endsWith(`${sep}page.tsx`))
  .map((p) =>
    relative(APP, p)
      .split(sep)
      .slice(0, -1)
      .filter((s) => !(s.startsWith('(') && s.endsWith(')'))),
  );
/** Static files are served at their own path (e.g. /manifest.json). */
const publicFiles = new Set(
  walk(PUBLIC).map((f) => `/${relative(PUBLIC, f).split(sep).join('/')}`),
);

const DYNAMIC = '\u0000';

/** Does `target` (a path, `\u0000` marking a template expression) land somewhere real? */
function lands(target: string): boolean {
  const path = target.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (!path.includes(DYNAMIC) && publicFiles.has(path)) return true;
  const segs = path.split('/').filter(Boolean);
  return pageRoutes.some(
    (route) =>
      route.length === segs.length &&
      route.every((r, i) => {
        const dynamicPage = r.startsWith('[') && r.endsWith(']');
        if (segs[i].includes(DYNAMIC)) return dynamicPage;
        return dynamicPage || r === segs[i];
      }),
  );
}

// A quoted or backticked internal path: '/x', "/x" or `/x/${id}`.
const PATH = String.raw`(?:'(\/[^'\s]*)'|"(\/[^"\s]*)"|\x60(\/(?:\$\{[^}]*\}|[^\x60\s$]|\$(?!\{))*)\x60)`;
const PATTERNS = [
  String.raw`\bredirect\(\s*${PATH}`,
  String.raw`\brouter\.(?:push|replace)\(\s*${PATH}`,
  String.raw`\bredirect:\s*${PATH}`,
  // href-like props and keys, including backHref and location.href = '/x'
  String.raw`\b\w*[hH]ref\s*(?:=|:)\s*\{?\s*${PATH}`,
  String.raw`\blocation\.(?:assign|replace)\(\s*${PATH}`,
  String.raw`\bpathname:\s*${PATH}`,
].map((p) => new RegExp(p, 'g'));

/** Every internal navigation target in a source text. Template expressions become DYNAMIC. */
function extractTargets(src: string): string[] {
  return PATTERNS.flatMap((re) =>
    [...src.matchAll(re)].map((m) => {
      const raw = m[1] ?? m[2] ?? m[3] ?? '';
      return raw.replace(/\$\{[^}]*\}/g, DYNAMIC);
    }),
  ).filter((t) => t.startsWith('/') && !t.startsWith('//') && !t.startsWith('/api/'));
}

const targets = walk(SRC)
  .filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p))
  .flatMap((p) =>
    extractTargets(readFileSync(p, 'utf8')).map((target) => ({
      file: relative(SRC, p),
      target: target.replaceAll(DYNAMIC, '{dynamic}'),
      lands: lands(target),
    })),
  );

describe('navigation targets', () => {
  it('finds the pages and the navigation calls (not an empty scan)', () => {
    expect(pageRoutes.some((r) => r.join('/') === 'chat')).toBe(true);
    expect(targets.length).toBeGreaterThan(5);
  });

  it('the extractor catches every covered form (probe: must find all 10 dead targets)', () => {
    const probe = [
      "redirect('/dead-redirect');",
      "router.push('/dead-push');",
      "return NextResponse.json({ redirect: '/dead-field' });",
      '<Link href="/dead-href">x</Link>',
      "window.location.href = '/dead-location';",
      "location.assign('/dead-assign');",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: probe source text containing a template literal
      '<Link href={`/dead-template/${id}`}>x</Link>',
      // biome-ignore lint/suspicious/noTemplateCurlyInString: probe source text containing a template literal
      'href: `/dead-template-spaces/${row.username || row.id}`,',
      "export function PageHeader({ backHref = '/dead-back' }) {}",
      "<Link href={{ pathname: '/dead-object' }}>x</Link>",
    ].join('\n');
    const found = extractTargets(probe);
    expect(found).toHaveLength(10);
    expect(found.every((t) => !lands(t))).toBe(true);
  });

  it('a template path only lands on a dynamic page', () => {
    expect(lands('/chat')).toBe(true);
    expect(lands(`/chat/${DYNAMIC}`)).toBe(false);
    expect(lands('/manifest.json')).toBe(true);
  });

  it('every navigation target lands on a page this app ships', () => {
    const dead = targets.filter((t) => !t.lands).map(({ file, target }) => ({ file, target }));
    expect(dead).toEqual([]);
  });

  it('sign-in lands on /chat', () => {
    const verify = targets.filter((t) => t.file.endsWith(join('auth', 'verify', 'route.ts')));
    expect(verify.map((t) => t.target)).toContain('/chat');
  });
});
