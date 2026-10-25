import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The phone app's estate view is public-only. It must never point at the
// local status server, the vault, or any loopback or private-network host.
const MOBILE = path.resolve(__dirname, '../apps/mobile');

// Read as text, not imported: apps/mobile/tsconfig.json extends the Expo base,
// which the web repo's install does not have, so vite cannot transform it.
const estateSource = readFileSync(path.join(MOBILE, 'src/lib/estate.ts'), 'utf8');
const estateSurfaces = [
  ...estateSource.matchAll(/\{\s*name:\s*'([^']*)',\s*url:\s*'([^']*)'\s*\}/g),
].map((m) => ({ name: m[1], url: m[2] }));

function problem(url: string, name = ''): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'not a URL';
  }
  if (u.protocol !== 'https:') return 'not https';
  if (u.port) return 'explicit port';
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal'))
    return 'local host';
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))
    return 'private address';
  if (host.startsWith('[') || host.includes(':')) return 'ip literal';
  if (/vault|7477/i.test(url + name)) return 'names private state';
  return null;
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    if (f === 'node_modules' || f.startsWith('.expo')) return [];
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe('mobile estate view', () => {
  it('the checker catches each bad shape (control)', () => {
    expect(problem('http://127.0.0.1:7477/status')).not.toBeNull();
    expect(problem('https://127.0.0.1/status')).not.toBeNull();
    expect(problem('https://localhost/x')).not.toBeNull();
    expect(problem('https://192.168.1.5')).not.toBeNull();
    expect(problem('https://example.com', 'zao vault')).not.toBeNull();
    expect(problem('https://zaoos.com')).toBeNull();
  });

  it('lists only public https surfaces', () => {
    // Every url literal in the file is one parsed entry, so a reshaped entry cannot slip past.
    expect(estateSurfaces.length).toBe((estateSource.match(/url:\s*['"`]/g) ?? []).length);
    expect(estateSurfaces.length).toBeGreaterThan(0);
    for (const s of estateSurfaces) expect(problem(s.url, s.name), s.url).toBeNull();
  });

  it('no file in apps/mobile names a loopback host or the status port', () => {
    const scanned = files(MOBILE).filter((f) => /\.(ts|tsx|json)$/.test(f));
    expect(scanned.length).toBeGreaterThan(5);
    for (const f of scanned) {
      const text = readFileSync(f, 'utf8');
      expect(/127\.0\.0\.1|localhost|:7477\b/i.test(text), f).toBe(false);
    }
  });
});
