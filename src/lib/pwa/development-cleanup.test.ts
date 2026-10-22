// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { removeDevelopmentWorkers } from './development-cleanup';

it('removes only ZAO workers and caches, leaving other apps alone', async () => {
  const unregister = vi.fn().mockResolvedValue(true);
  const otherUnregister = vi.fn();
  const serviceWorker = {
    getRegistrations: async () => [
      { active: { scriptURL: 'http://localhost/sw.js' }, unregister },
      { active: { scriptURL: 'http://localhost/other-worker.js' }, unregister: otherUnregister },
    ],
  } as unknown as ServiceWorkerContainer;
  const cacheStorage = {
    keys: async () => ['zaoos-v2', 'another-app-cache'],
    delete: vi.fn().mockResolvedValue(true),
  } as unknown as CacheStorage;
  expect(await removeDevelopmentWorkers(serviceWorker, cacheStorage, 'http://localhost')).toBe(
    true,
  );
  expect(unregister).toHaveBeenCalledOnce();
  expect(otherUnregister).not.toHaveBeenCalled();
  expect(cacheStorage.delete).toHaveBeenCalledExactlyOnceWith('zaoos-v2');
});
