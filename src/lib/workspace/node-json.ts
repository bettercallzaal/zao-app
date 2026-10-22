export async function readNodeJson(base: string, path: string, signal: AbortSignal) {
  const response = await fetch(`${base}${path}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Community node unavailable');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty node response');
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4_000_000) {
        await reader.cancel();
        throw new Error('Node response too large');
      }
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
