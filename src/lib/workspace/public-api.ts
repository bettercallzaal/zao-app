import { readNodeJson } from './node-json';
import { normalizeChannelCast, readChannelFeed } from './read-channel';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept',
  'Access-Control-Expose-Headers': 'Retry-After',
  'Cache-Control': 'public, max-age=20',
};
type NodeRead = { data: unknown; checkedAt: string };
const cache = new Map<string, { expires: number; value: NodeRead }>();
const pending = new Map<string, Promise<NodeRead>>();

export function publicJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { ...headers, ...(status >= 400 ? { 'Cache-Control': 'no-store' } : {}) },
  });
}

export function publicOptions() {
  return new Response(null, { status: 204, headers });
}

async function queryNode(path: string) {
  // Server-owned destination only. Never accept an upstream URL from callers.
  const base = process.env.ZAO_WORKSPACE_NODE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Node not configured');
  const key = base + path;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const running = pending.get(key);
  if (running) return running;
  if (pending.size >= 4) throw new Error('Node busy');
  const task = readNodeJson(base, path, AbortSignal.timeout(7000)).then((data) => {
    const value = { data, checkedAt: new Date().toISOString() };
    if (cache.size >= 32) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 20_000, value });
    return value;
  });
  pending.set(key, task);
  try {
    return await task;
  } finally {
    pending.delete(key);
  }
}

export async function handlePublicRead(request: Request, operation: 'search' | 'cast' | 'channel') {
  const params = new URL(request.url).searchParams;
  const allowed =
    operation === 'search'
      ? ['q', 'limit', 'cursor']
      : operation === 'cast'
        ? ['hash']
        : ['cursor'];
  if ([...params.keys()].some((key) => !allowed.includes(key) || params.getAll(key).length !== 1))
    return publicJson({ error: 'invalid_parameters' }, 400);
  const cursor = params.get('cursor');
  if (cursor != null && (!cursor.length || cursor.length > 4096))
    return publicJson({ error: 'invalid_cursor' }, 400);
  const q = params.get('q')?.trim();
  const limit = params.get('limit') ?? '10';
  const hash = params.get('hash');
  if (
    operation === 'search' &&
    (!q || q.length > 160 || /[\x00-\x1f:]/.test(q) || !/^(?:[1-9]|1\d|20)$/.test(limit))
  )
    return publicJson(
      {
        error: 'invalid_search',
        message:
          'Use 1–160 characters of plain text and limit 1–20. Search operators are not supported.',
      },
      400,
    );
  if (operation === 'cast' && (!hash || !/^0x[\da-f]{40}$/i.test(hash)))
    return publicJson({ error: 'invalid_hash' }, 400);
  try {
    if (operation === 'channel') {
      const feed = await readChannelFeed(cursor || undefined);
      return publicJson({
        posts: feed.posts,
        nextCursor: feed.nextPageToken,
        source: feed.source,
        checkedAt: feed.checkedAt,
        coverage: 'ZAO channel index; may differ from exact cast lookup.',
      });
    }
    const upstream =
      operation === 'search'
        ? `/v2/farcaster/cast/search?${new URLSearchParams({ q: q!, limit, ...(cursor ? { cursor } : {}) })}`
        : `/v2/farcaster/cast?${new URLSearchParams({ identifier: hash!.toLowerCase(), type: 'hash' })}`;
    const { data: raw, checkedAt } = await queryNode(upstream);
    if (!raw || typeof raw !== 'object') throw new Error('Invalid node response');
    const envelope = raw as Record<string, unknown>;
    const value = envelope.result ?? envelope;
    if (!value || typeof value !== 'object') throw new Error('Invalid node response');
    const data = value as Record<string, unknown>;
    const metadata = {
      source: 'ZAO configured Hypersnap node',
      checkedAt,
      coverage: 'Node-local index; search ranking and completeness are not guaranteed.',
    };
    if (operation === 'cast') {
      if (!Object.hasOwn(data, 'cast')) throw new Error('Invalid cast response');
      if (data.cast == null) return publicJson({ error: 'cast_not_found' }, 404);
      const post = normalizeChannelCast(data.cast);
      if (!post) throw new Error('Invalid cast');
      return publicJson({ post, ...metadata });
    }
    if (!Array.isArray(data.casts) || data.casts.length > 96)
      throw new Error('Invalid search results');
    const posts = data.casts.map(normalizeChannelCast);
    if (posts.some((post: unknown) => post === null)) throw new Error('Invalid cast');
    const next = data.next;
    if (next != null && (typeof next !== 'object' || Array.isArray(next)))
      throw new Error('Invalid next page');
    const nextCursor = (next as { cursor?: unknown } | null)?.cursor ?? null;
    if (nextCursor !== null && (typeof nextCursor !== 'string' || nextCursor.length > 4096))
      throw new Error('Invalid cursor');
    // Preserve the bounded multi-shard batch: truncation can skip results on the next page.
    return publicJson({ posts, nextCursor, ...metadata });
  } catch {
    return publicJson(
      { error: 'node_unavailable', message: 'Node could not complete this read. Retry later.' },
      503,
    );
  }
}
