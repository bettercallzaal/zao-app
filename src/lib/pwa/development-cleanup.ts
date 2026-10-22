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
  if (cacheStorage) {
    const keys = await cacheStorage.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith('zaoos-')).map((key) => cacheStorage.delete(key)),
    );
  }
  return removed.some(Boolean);
}
