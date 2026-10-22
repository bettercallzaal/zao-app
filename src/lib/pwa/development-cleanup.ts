import { clearZaoOfflineCaches } from './clear-caches';

/** Remove only this app's worker/caches, preserving localStorage and other apps. */
export async function removeDevelopmentWorkers(
  serviceWorker: ServiceWorkerContainer,
  cacheStorage: CacheStorage | undefined,
  origin: string,
): Promise<boolean> {
  const registrations = await serviceWorker.getRegistrations();
  const own = registrations.filter((registration) =>
    [registration.active, registration.waiting, registration.installing].some((worker) => {
      if (!worker) return false;
      const url = new URL(worker.scriptURL);
      return url.origin === origin && url.pathname === '/sw.js';
    }),
  );
  const removed = await Promise.all(own.map((registration) => registration.unregister()));
  await clearZaoOfflineCaches(cacheStorage);
  return removed.some(Boolean);
}
