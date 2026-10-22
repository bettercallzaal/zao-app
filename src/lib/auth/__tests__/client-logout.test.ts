// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { endBrowserSession } from '../client-logout';
afterEach(() => vi.unstubAllGlobals());
it('purges only ZAO caches after confirmed logout without touching browser drafts', async () => {
  const deletion = vi.fn();
  vi.stubGlobal('window', {
    caches: { keys: async () => ['zaoos-v3', 'other-app'], delete: deletion },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  await endBrowserSession();
  expect(deletion).toHaveBeenCalledExactlyOnceWith('zaoos-v3');
});
it('does not claim success or clear caches when the server refuses logout', async () => {
  const keys = vi.fn();
  vi.stubGlobal('window', { caches: { keys } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(endBrowserSession()).rejects.toThrow('Sign out failed');
  expect(keys).not.toHaveBeenCalled();
});
