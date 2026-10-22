export interface WorkspacePost {
  hash: string;
  fid: number;
  text: string;
  timestamp: number;
  username: string;
  name: string;
  avatar: string;
  embeds: string[];
}

export interface WorkspaceFeed {
  posts: WorkspacePost[];
  source: string;
  checkedAt: string;
  nextPageToken: string | null;
}

export function isWorkspacePost(value: unknown): value is WorkspacePost {
  if (!value || typeof value !== 'object') return false;
  const post = value as Partial<WorkspacePost>;
  return (
    typeof post.hash === 'string' &&
    /^0x[\da-f]{40}$/i.test(post.hash) &&
    Number.isSafeInteger(post.fid) &&
    (post.fid || 0) > 0 &&
    typeof post.timestamp === 'number' &&
    Number.isFinite(post.timestamp) &&
    Math.abs(post.timestamp) <= 8.64e15 &&
    typeof post.text === 'string' &&
    typeof post.name === 'string' &&
    typeof post.username === 'string' &&
    typeof post.avatar === 'string' &&
    Array.isArray(post.embeds) &&
    post.embeds.every((url) => typeof url === 'string')
  );
}

export const COMMANDS = [
  {
    id: 'review',
    label: 'Review the community',
    description: 'Read recent posts from /zao.',
    prompt: '/review',
  },
  {
    id: 'music',
    label: 'Find music',
    description: 'Find music links and conversations.',
    prompt: '/music',
  },
  {
    id: 'saved',
    label: 'My saved posts',
    description: 'Return to posts saved on this device.',
    prompt: '/saved',
  },
  {
    id: 'curate',
    label: 'Curate a post',
    description: 'Select a post and add your own note.',
    prompt: '/curate',
  },
  {
    id: 'feedback',
    label: 'Give feedback',
    description: 'Prepare a public feedback cast.',
    prompt: '/feedback',
  },
] as const;
export type CommandId = (typeof COMMANDS)[number]['id'];

export function parseWorkspaceCommand(input: string): { command: CommandId; query: string } {
  const value = input.trim();
  if (value.startsWith('/')) {
    const [name, ...rest] = value.slice(1).split(/\s+/);
    if (!COMMANDS.some((command) => command.id === name.toLowerCase())) {
      throw new Error('Choose /review, /music, /saved, /curate, or /feedback.');
    }
    return { command: name.toLowerCase() as CommandId, query: rest.join(' ') };
  }
  if (!value) return { command: 'review', query: '' };
  if (/^(show|open)( me)? (my )?saved( posts)?[.!]?$/i.test(value))
    return { command: 'saved', query: '' };
  // Natural text is a search of the loaded community posts, not a fabricated AI answer.
  return { command: 'review', query: value };
}

export function safePublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function musicLinks(post: WorkspacePost): string[] {
  const links = [...post.embeds, ...(post.text.match(/https?:\/\/[^\s<>]+/g) || [])];
  return [...new Set(links.map(safePublicUrl).filter((url): url is string => !!url))].filter(
    (url) =>
      /spotify\.com|soundcloud\.com|audius\.co|bandcamp\.com|youtube\.com|youtu\.be|sound\.xyz|music\.apple\.com|tidal\.com|\.(mp3|wav|ogg)(\?|$)/i.test(
        url,
      ),
  );
}

export function filterWorkspacePosts(
  posts: WorkspacePost[],
  command: CommandId,
  query: string,
): WorkspacePost[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return posts.filter((post) => {
    if (
      command === 'music' &&
      !musicLinks(post).length &&
      !/\bmusic|\bsong|\balbum|\bartist|\bconcert|\brelease|\bplaylist/i.test(post.text)
    )
      return false;
    const haystack = `${post.text} ${post.name} ${post.username}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function castUrl(hash: string): string {
  return `https://farcaster.xyz/~/conversations/${encodeURIComponent(hash)}`;
}

export function composeUrl(text: string, parentHash?: string): string {
  const params = new URLSearchParams({ text });
  if (parentHash) params.set('parentCastHash', parentHash);
  return `https://farcaster.xyz/~/compose?${params}`;
}
