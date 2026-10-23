import { type NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import {allowsBrowserMutation} from '@/lib/auth/request-origin';

const MINUTE = 60_000;

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

// Rate limit configs ordered from most-specific to least-specific prefix.
// The first matching prefix wins, so sub-routes must appear before their parent.
const RATE_LIMITS: [string, RateLimitConfig][] = [
  ['/api/public/v1/', { limit: 30, windowMs: MINUTE }],
  ['/api/miniapp/auth-context', {limit:10,windowMs:MINUTE}],
  ['/api/miniapp/auth', {limit:10,windowMs:MINUTE}],
  ['/api/workspace', { limit: 30, windowMs: MINUTE }],
  // Chat sub-routes (before /api/chat catch-all paths)
  ['/api/chat/send', { limit: 10, windowMs: MINUTE }],
  ['/api/chat/hide', { limit: 10, windowMs: MINUTE }],
  ['/api/chat/react', { limit: 30, windowMs: MINUTE }],
  ['/api/chat/messages', { limit: 30, windowMs: MINUTE }],
  ['/api/chat/thread', { limit: 30, windowMs: MINUTE }],
  ['/api/chat/search', { limit: 30, windowMs: MINUTE }],
  ['/api/chat/schedule', { limit: 20, windowMs: MINUTE }],

  // Users sub-routes
  ['/api/users/follow', { limit: 15, windowMs: MINUTE }],
  ['/api/users', { limit: 20, windowMs: MINUTE }],

  // Music sub-routes
  ['/api/music/submissions', { limit: 2, windowMs: MINUTE }],
  ['/api/music/metadata', { limit: 20, windowMs: MINUTE }],
  ['/api/music/radio', { limit: 10, windowMs: MINUTE }],

  // Top-level routes (no sub-route ordering concerns)
  ['/api/auth', { limit: 10, windowMs: MINUTE }],
  ['/api/search', { limit: 30, windowMs: MINUTE }],
  ['/api/upload', { limit: 10, windowMs: MINUTE }],
  ['/api/notifications', { limit: 20, windowMs: MINUTE }],
  ['/api/members', { limit: 10, windowMs: MINUTE }],
  ['/api/miniapp', { limit: 10, windowMs: MINUTE }],
  ['/api/platforms', { limit: 10, windowMs: MINUTE }],
  ['/api/neynar', { limit: 15, windowMs: MINUTE }],
];

function getRateLimitConfig(pathname: string): RateLimitConfig | null {
  for (const [prefix, config] of RATE_LIMITS) {
    if (pathname.startsWith(prefix)) return config;
  }
  return null;
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // Convert to base64 without using Buffer (Edge Runtime compatible)
  return btoa(String.fromCharCode(...array));
}

function buildCspHeader(nonce: string): string {
  // React's development stack traces need eval; production keeps strict CSP.
  const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval} https://neynarxyz.github.io https://api.neynar.com https://open.spotify.com https://www.youtube.com https://w.soundcloud.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https: wss:",
    "font-src 'self' https:",
    "frame-src 'self' https://open.spotify.com https://www.youtube.com https://w.soundcloud.com https://embed.sound.xyz https://audius.co https://relay.farcaster.xyz https://app.neynar.com https://embed.tidal.com https://*.bandcamp.com https://embed.music.apple.com https://meet.jit.si https://nouns.build https://empirebuilder.world https://incented.co https://clanker.world https://www.wavewarz.com https://wavewarz.com https://wavewarz-intelligence.vercel.app https://player.twitch.tv https://embed.twitch.tv https://www.twitch.tv https://clips.twitch.tv https://juke.audio",
    // Allow any origin to embed our pages — the app is a Farcaster miniapp
    // and we don't know every client iframe origin (Warpcast, Base App,
    // Coinbase Wallet, third-party Farcaster clients). Replaces the legacy
    // X-Frame-Options: DENY which was blocking the miniapp from rendering.
    'frame-ancestors *',
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join('; ');
}

function addSecurityHeaders(
  response: NextResponse,
  nonce?: string,
  _pathname?: string,
): NextResponse {
  if (_pathname?.startsWith('/api/public/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Accept');
    response.headers.set('Access-Control-Expose-Headers', 'Retry-After');
  }
  if (_pathname?.startsWith('/api/') && !_pathname.startsWith('/api/workspace/') && !_pathname.startsWith('/api/public/')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  // Intentionally NOT setting X-Frame-Options. Modern browsers honor the CSP
  // `frame-ancestors *` directive above, which allows the miniapp to be
  // embedded by any Farcaster client iframe. Setting XFO would override the
  // CSP and break embedding.
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  // microphone delegated to juke.audio so speakers can publish audio inside
  // the Juke embed iframe (/live/[spaceId]); the iframe also needs allow="microphone".
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self "https://juke.audio"), geolocation=()',
  );
  if (nonce) {
    response.headers.set('Content-Security-Policy', buildCspHeader(nonce));
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/public/')) {
    if (request.method === 'OPTIONS') return addSecurityHeaders(new NextResponse(null, { status: 204 }), undefined, pathname);
    if (!['GET', 'HEAD'].includes(request.method)) {
      const response = NextResponse.json({ error: 'read_only' }, { status: 405, headers: { Allow: 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store' } });
      return addSecurityHeaders(response, undefined, pathname);
    }
  }
  if (!allowsBrowserMutation(request, process.env.NEXT_PUBLIC_APP_URL)) {
    return addSecurityHeaders(NextResponse.json({error:'Cross-origin write refused'}, {status:403}), undefined, pathname);
  }

  // ZAOstock spinout: redirect /stock/* and /api/stock/* to zaostock.com
  // Project graduated 2026-04-29. Live at https://zaostock.com.
  if (
    pathname === '/stock' ||
    pathname.startsWith('/stock/') ||
    pathname.startsWith('/api/stock/')
  ) {
    const newPath = pathname.replace(/^\/api\/stock/, '/api').replace(/^\/stock/, '');
    const target = `https://zaostock.com${newPath || '/'}${request.nextUrl.search}`;
    return NextResponse.redirect(target, 301);
  }

  // Fast path for page routes — skip rate limiting entirely, just add headers
  if (!pathname.startsWith('/api/')) {
    const nonce = generateNonce();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (pathname.startsWith('/messages')) {
      response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
      response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    }
    return addSecurityHeaders(response, nonce, pathname);
  }

  // Apply rate limiting to API routes only
  const config = getRateLimitConfig(pathname);
  if (config) {
    // Vercel strips user-supplied X-Forwarded-For and sets trusted values.
    // On non-Vercel deployments, ensure a trusted reverse proxy sets these headers.
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const key = `${ip}:${pathname.startsWith('/api/public/v1/') ? '/api/public/v1/' : pathname}`;
    const result = await rateLimit(key, config.limit, config.windowMs);

    if (!result.success) {
      const errorResponse = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      errorResponse.headers.set('Retry-After', String(Math.ceil(config.windowMs / 1000)));
      errorResponse.headers.set('Cache-Control', 'no-store');
      return addSecurityHeaders(errorResponse, undefined, pathname);
    }
  }

  // API routes: no nonce, just security headers
  const response = NextResponse.next();
  return addSecurityHeaders(response, undefined, pathname);
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
