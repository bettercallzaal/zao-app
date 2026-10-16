// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts/vercel-ignore.sh');
// Isolate from the machine's git config and hooks so the test is deterministic.
const GIT_ENV = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', ...GIT_ENV },
  }).trim();
}

function write(cwd: string, path: string, body: string): void {
  mkdirSync(dirname(join(cwd, path)), { recursive: true });
  writeFileSync(join(cwd, path), body);
}

/** A repo with one base commit, then one commit touching `paths`. */
function repoWithChange(paths: string[]): { cwd: string; base: string } {
  const cwd = mkdtempSync(join(tmpdir(), 'vercel-ignore-'));
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.email', 'test@example.invalid');
  git(cwd, 'config', 'user.name', 'test');
  write(cwd, 'src/app/page.tsx', 'export default 1;\n');
  write(cwd, 'README.md', '# app\n');
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-qm', 'base');
  const base = git(cwd, 'rev-parse', 'HEAD');
  for (const p of paths) write(cwd, p, `changed ${p}\n`);
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-qm', 'change');
  return { cwd, base };
}

/** Runs the real script; exit 0 = SKIP, 1 = BUILD. */
function decide(cwd: string, env: Record<string, string>): { code: number | null; log: string } {
  const r = spawnSync('bash', [SCRIPT], {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', ...GIT_ENV, ...env },
  });
  return { code: r.status, log: `${r.stdout}${r.stderr}` };
}

describe('scripts/vercel-ignore.sh', { timeout: 30_000 }, () => {
  it('skips every non-production deploy, even a source change', () => {
    const { cwd } = repoWithChange(['src/app/page.tsx']);
    const r = decide(cwd, { VERCEL_ENV: 'preview' });
    expect(r.code).toBe(0);
    expect(r.log).toContain('non-production');
  });

  it.each([
    ['docs only', ['README.md', 'docs/notes.md']],
    ['a co-located test', ['src/app/api/x/__tests__/route.test.ts']],
    ['a test file next to its source', ['src/components/Foo.test.tsx', 'src/lib/bar.test.ts']],
    ['test helpers', ['src/test-utils/api-helpers.ts']],
    ['CI config', ['.github/workflows/ci.yml']],
  ])('production: %s -> SKIP', (_label, paths) => {
    const { cwd, base } = repoWithChange(paths);
    const r = decide(cwd, { VERCEL_ENV: 'production', VERCEL_GIT_PREVIOUS_SHA: base });
    expect(r.code, r.log).toBe(0);
    expect(r.log).toContain('-> SKIP');
  });

  it.each([
    ['app source', ['src/app/page.tsx']],
    ['source plus a test', ['src/lib/bar.ts', 'src/lib/bar.test.ts']],
    ['dependencies', ['package.json']],
    ['public assets', ['public/logo.svg']],
    ['vercel.json', ['vercel.json']],
    ['the script itself', ['scripts/vercel-ignore.sh']],
  ])('production: %s -> BUILD', (_label, paths) => {
    const { cwd, base } = repoWithChange(paths);
    const r = decide(cwd, { VERCEL_ENV: 'production', VERCEL_GIT_PREVIOUS_SHA: base });
    expect(r.code, r.log).toBe(1);
    expect(r.log).toContain('-> BUILD');
  });

  it('falls back to the parent commit when the previous deploy SHA is unknown', () => {
    const { cwd } = repoWithChange(['README.md']);
    const r = decide(cwd, {
      VERCEL_ENV: 'production',
      VERCEL_GIT_PREVIOUS_SHA: 'f'.repeat(40),
    });
    expect(r.code, r.log).toBe(0);
    expect(r.log).toContain('vs HEAD^');
  });

  it('builds (safe default) when no diff base exists at all', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'vercel-ignore-'));
    git(cwd, 'init', '-q');
    git(cwd, 'config', 'user.email', 'test@example.invalid');
    git(cwd, 'config', 'user.name', 'test');
    write(cwd, 'README.md', '# only commit\n');
    git(cwd, 'add', '-A');
    git(cwd, 'commit', '-qm', 'only');
    const r = decide(cwd, { VERCEL_ENV: 'production' });
    expect(r.code).toBe(1);
    expect(r.log).toContain('safe default');
  });
});
