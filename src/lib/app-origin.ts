export function publicAppOrigin(value = process.env.NEXT_PUBLIC_APP_URL): string {
  const url = new URL(value || 'https://zaoos.com');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('NEXT_PUBLIC_APP_URL must be an HTTP(S) origin without credentials or a path');
  }
  return url.origin;
}
