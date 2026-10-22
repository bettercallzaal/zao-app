import {
  isWorkspacePost,
  MAX_WORKSPACE_CURSOR_LENGTH,
  type WorkspaceFeed,
  type WorkspacePost,
} from './model';
import { readNodeJson } from './node-json';

const PUBLIC_NODE = 'https://haatz.quilibrium.com';
const CHANNEL_PARENT_URL = 'https://warpcast.com/~/channel/zao';
const cache = new Map<string, { expires: number; value: WorkspaceFeed }>();

export function normalizeChannelCast(value: unknown): WorkspacePost | null {
  if (!value || typeof value !== 'object') return null;
  const cast = value as Record<string, unknown>;
  const author =
    cast.author && typeof cast.author === 'object' ? (cast.author as Record<string, unknown>) : {};
  if (
    typeof cast.hash !== 'string' ||
    typeof cast.timestamp !== 'string' ||
    typeof cast.text !== 'string'
  )
    return null;
  const hash = `0x${cast.hash.replace(/^0x/i, '').toLowerCase()}`;
  const post = {
    hash,
    fid: author.fid,
    text: cast.text,
    timestamp: Date.parse(cast.timestamp),
    username: typeof author.username === 'string' ? author.username : `fid:${author.fid}`,
    name: typeof author.display_name === 'string' ? author.display_name : `Farcaster ${author.fid}`,
    avatar: typeof author.pfp_url === 'string' ? author.pfp_url : '',
    embeds: Array.isArray(cast.embeds)
      ? cast.embeds.flatMap((embed: unknown) => {
          if (!embed || typeof embed !== 'object') return [];
          const url = (embed as { url?: unknown }).url;
          return typeof url === 'string' ? [url] : [];
        })
      : [],
  };
  return isWorkspacePost(post) ? post : null;
}

export async function readChannelFeed(token?: string): Promise<WorkspaceFeed> {
  // Separate server-owned read sources: an older node can hold a cast while
  // its channel index omits it. Never silently substitute a different source.
  const base = (
    process.env.ZAO_WORKSPACE_FEED_NODE_URL ||
    process.env.ZAO_WORKSPACE_NODE_URL ||
    PUBLIC_NODE
  ).replace(/\/$/, '');
  const params = new URLSearchParams({
    parent_urls: CHANNEL_PARENT_URL,
    limit: '12',
    with_recasts: 'false',
  });
  if (token) params.set('cursor', token);
  const path = `/v2/farcaster/feed/parent_urls?${params}`;
  const key = `${base}${path}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const data = await readNodeJson(base, path, AbortSignal.timeout(7000));
  // A per-shard limit is not a global limit. Preserve every bounded returned
  // cast rather than taking the first shard and losing the newer shard.
  if (!Array.isArray(data?.casts) || data.casts.length > 96)
    throw new Error('Invalid channel feed');
  const posts: WorkspacePost[] = data.casts
    .filter((cast: unknown) => {
      if (!cast || typeof cast !== 'object') return false;
      const record = cast as Record<string, unknown>;
      return (
        record.parent_url === CHANNEL_PARENT_URL || record.root_parent_url === CHANNEL_PARENT_URL
      );
    })
    .map(normalizeChannelCast)
    .filter((post: WorkspacePost | null): post is WorkspacePost => post !== null);
  if (data.casts.length && !posts.length) throw new Error('Invalid channel casts');
  const cursor = data.next?.cursor;
  if (cursor != null && (typeof cursor !== 'string' || cursor.length > MAX_WORKSPACE_CURSOR_LENGTH))
    throw new Error('Invalid channel cursor');
  const result: WorkspaceFeed = {
    posts: [...new Map(posts.map((post) => [post.hash, post])).values()].sort(
      (a, b) => b.timestamp - a.timestamp,
    ),
    source:
      base === PUBLIC_NODE ? 'Public Hypersnap channel API' : 'Configured Hypersnap channel API',
    checkedAt: new Date().toISOString(),
    nextPageToken: cursor || null,
  };
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, { value: result, expires: Date.now() + 20_000 });
  return result;
}
