export async function clearZaoOfflineCaches(cacheStorage: CacheStorage | undefined): Promise<void> {
  if (!cacheStorage) return;
  const keys = await cacheStorage.keys();
  await Promise.all(
    keys.filter((key) => key.startsWith('zaoos-')).map((key) => cacheStorage.delete(key)),
  );
}
