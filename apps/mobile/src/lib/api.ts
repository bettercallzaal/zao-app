// Reads the web app's public API (src/app/api/public/v1 in the web repo).
// EXPO_PUBLIC_ZAO_API_BASE is baked in eas.json: EAS ignores .env.local.
// No default: zaoos.com serves ZAO OS, not this app, so guessing a host would
// show the wrong data or a 404. Set it to the zao-app production origin.
const API_BASE = (process.env.EXPO_PUBLIC_ZAO_API_BASE ?? '').replace(/\/$/, '');

// Mirrors WorkspacePost in src/lib/workspace/model.ts.
export interface Post {
  hash: string;
  fid: number;
  text: string;
  timestamp: number;
  username: string;
  name: string;
  avatar: string;
  embeds: string[];
}

export interface ChannelPage {
  posts: Post[];
  nextCursor: string | null;
}

export async function readChannel(cursor?: string): Promise<ChannelPage> {
  if (!API_BASE) throw new Error('Feed not configured: EXPO_PUBLIC_ZAO_API_BASE is not set');
  const url = `${API_BASE}/api/public/v1/channel${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Feed read failed: HTTP ${res.status} from ${url}`);
  const body = (await res.json()) as { posts?: unknown; nextCursor?: unknown };
  if (!Array.isArray(body.posts)) throw new Error('Feed read failed: no posts in response');
  return {
    posts: body.posts as Post[],
    nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null,
  };
}
