import type { WorkspaceFeed, WorkspacePost } from './model';
import { MAX_WORKSPACE_CURSOR_LENGTH } from './model';
import { readNodeJson as readNode } from './node-json';
import { readChannelFeed } from './read-channel';

interface NodeMessage {
  hash: string;
  data: {
    fid: number;
    timestamp: number;
    castAddBody?: { text?: string; embeds?: { url?: string }[] };
  };
}

function isNodeMessage(value: unknown): value is NodeMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as NodeMessage;
  return (
    typeof message.hash === 'string' &&
    /^0x[\da-f]{40}$/i.test(message.hash) &&
    Number.isSafeInteger(message.data?.fid) &&
    message.data.fid > 0 &&
    Number.isInteger(message.data?.timestamp) &&
    message.data.timestamp >= 0 &&
    message.data.timestamp <= 0xffffffff &&
    !!message.data.castAddBody &&
    typeof message.data.castAddBody.text === 'string' &&
    (message.data.castAddBody.embeds === undefined ||
      Array.isArray(message.data.castAddBody.embeds))
  );
}

const cache = new Map<string, { expires: number; value: WorkspaceFeed }>();

export async function readRawWorkspaceFeed(
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
  // One budget for feed + all profile batches, below Vercel's 10-second limit.
  const signal = AbortSignal.timeout(7000);
  const data = await readNode(base, path, signal);
  if (!Array.isArray(data.messages) || data.messages.length > 96)
    throw new Error('Invalid community feed');
  const messages = (data.messages.filter(isNodeMessage) as NodeMessage[]).sort(
    (a, b) => b.data.timestamp - a.data.timestamp,
  );
  const users = new Map<number, { username: string; name: string; avatar: string }>();
  const ids = [...new Set(messages.map((m) => m.data.fid))].slice(0, 24);
  // Four profile requests at a time. One missing profile must not erase the feed.
  for (let i = 0; i < ids.length; i += 4) {
    await Promise.all(
      ids.slice(i, i + 4).map(async (fid) => {
        try {
          const profile = await readNode(base, `/v1/userDataByFid?fid=${fid}`, signal);
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
      .map((embed) => embed?.url)
      .filter((url): url is string => typeof url === 'string'),
  }));
  const result = {
    posts,
    source: process.env.ZAO_WORKSPACE_NODE_URL ? "ZAO's Hypersnap node" : 'Public Hypersnap node',
    checkedAt: new Date().toISOString(),
    nextPageToken:
      typeof data.nextPageToken === 'string' &&
      data.nextPageToken.length <= MAX_WORKSPACE_CURSOR_LENGTH
        ? data.nextPageToken
        : null,
  };
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, { value: result, expires: Date.now() + 20_000 });
  return result;
}

export async function readWorkspaceFeed(
  options: { fid?: number; hash?: string; token?: string } = {},
): Promise<WorkspaceFeed> {
  return options.hash ? readRawWorkspaceFeed(options) : readChannelFeed(options.token);
}
