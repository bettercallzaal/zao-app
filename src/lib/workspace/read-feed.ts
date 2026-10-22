import type { WorkspaceFeed, WorkspacePost } from './model';

interface NodeMessage {
  hash: string;
  data: {
    fid: number;
    timestamp: number;
    castAddBody?: { text?: string; embeds?: { url?: string }[] };
  };
}

const cache = new Map<string, { expires: number; value: WorkspaceFeed }>();

async function readNode(base: string, path: string) {
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Community node unavailable');
  const body = await response.text();
  if (body.length > 4_000_000) throw new Error('Node response too large');
  return JSON.parse(body);
}

export async function readWorkspaceFeed(
  options: { fid?: number; hash?: string; token?: string } = {},
): Promise<WorkspaceFeed> {
  // Server-controlled only. A caller cannot turn this route into an arbitrary URL proxy.
  const base = (process.env.ZAO_WORKSPACE_NODE_URL || 'https://haatz.quilibrium.com').replace(
    /\/$/,
    '',
  );
  const params = options.hash
    ? new URLSearchParams({
        fid: String(options.fid),
        hash: options.hash,
        pageSize: '12',
        reverse: 'true',
      })
    : new URLSearchParams({
        url: 'https://warpcast.com/~/channel/zao',
        pageSize: '12',
        reverse: 'true',
      });
  if (options.token) params.set('pageToken', options.token);
  const path = `/v1/castsByParent?${params}`;
  const key = `${base}${path}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const data = await readNode(base, path);
  if (!Array.isArray(data.messages)) throw new Error('Invalid community feed');
  const messages = (data.messages as NodeMessage[]).filter(
    (m) => m?.data?.castAddBody && /^0x[\da-f]{40}$/i.test(m.hash),
  );
  const users = new Map<number, { username: string; name: string; avatar: string }>();
  const ids = [...new Set(messages.map((m) => m.data.fid))];
  // Four profile requests at a time. One missing profile must not erase the feed.
  for (let i = 0; i < ids.length; i += 4) {
    await Promise.all(
      ids.slice(i, i + 4).map(async (fid) => {
        try {
          const profile = await readNode(base, `/v1/userDataByFid?fid=${fid}`);
          const fields = new Map<string, string>(
            (profile.messages || []).map(
              (m: { data: { userDataBody: { type: string; value: string } } }) => [
                m.data.userDataBody.type,
                m.data.userDataBody.value,
              ],
            ),
          );
          users.set(fid, {
            username: fields.get('USER_DATA_TYPE_USERNAME') || `fid:${fid}`,
            name: fields.get('USER_DATA_TYPE_DISPLAY') || `Farcaster ${fid}`,
            avatar: fields.get('USER_DATA_TYPE_PFP') || '',
          });
        } catch {
          /* Display the cast with its FID if profile hydration fails. */
        }
      }),
    );
  }
  const posts: WorkspacePost[] = messages.map((m) => ({
    hash: m.hash,
    fid: m.data.fid,
    text: m.data.castAddBody?.text || '',
    timestamp: (m.data.timestamp + 1609459200) * 1000,
    ...(users.get(m.data.fid) || {
      username: `fid:${m.data.fid}`,
      name: `Farcaster ${m.data.fid}`,
      avatar: '',
    }),
    embeds: (m.data.castAddBody?.embeds || [])
      .map((embed) => embed.url)
      .filter((url): url is string => typeof url === 'string'),
  }));
  const result = {
    posts,
    source: process.env.ZAO_WORKSPACE_NODE_URL ? "ZAO's Hypersnap node" : 'Public Hypersnap node',
    checkedAt: new Date().toISOString(),
    nextPageToken: typeof data.nextPageToken === 'string' ? data.nextPageToken : null,
  };
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, { value: result, expires: Date.now() + 20_000 });
  return result;
}
