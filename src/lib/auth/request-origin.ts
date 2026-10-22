/** Cookie-authenticated browser writes must come from this app, even in an iframe. */
export function allowsBrowserMutation(request: Request, configuredAppUrl?: string): boolean {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(request.method))
    return true;
  // This receiver authenticates the signed webhook itself, not a browser session.
  if (url.pathname === '/api/miniapp/webhook') return true;
  const allowed = new Set([url.origin]);
  if (configuredAppUrl) {
    try {
      allowed.add(new URL(configuredAppUrl).origin);
    } catch {
      /* Invalid config never grants access. */
    }
  }
  const origin = request.headers.get('origin');
  if (origin !== null) {
    try {
      return allowed.has(new URL(origin).origin);
    } catch {
      return false;
    }
  }
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') return false;
  if (site === 'same-origin') return true;
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  // Non-browser jobs without a session still pass through route-specific auth.
  return !/(?:^|;\s*)zaoos_session=/.test(request.headers.get('cookie') || '');
}
