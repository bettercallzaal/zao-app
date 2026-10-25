// Public Audius reads, no key. The web /api/music/radio route needs a session,
// so the phone resolves the same playlists itself.
const AUDIUS_API = 'https://api.audius.co/v1';
const APP_NAME = 'THE-ZAO';

// Same list as community.config.ts `music.radioPlaylists` in the web repo.
export const radioPlaylists = [
  { name: 'Ambition', artist: 'Stilo World', url: 'https://audius.co/dopestilo/album/ambition' },
  {
    name: 'Lofi Chill',
    artist: 'Various Artists',
    url: 'https://audius.co/audius/playlist/official-audius-exclusives',
  },
  {
    name: 'Electronic',
    artist: 'Various Artists',
    url: 'https://audius.co/audius/playlist/hot-new-on-audius-%F0%9F%94%A5',
  },
];

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  streamUrl: string;
  duration: number;
}

type RawTrack = {
  id?: string;
  title?: string;
  duration?: number;
  user?: { name?: string };
  artwork?: Record<string, string>;
};

function toTrack(t: RawTrack, fallbackArtist: string): Track | null {
  if (!t.id) return null;
  return {
    id: t.id,
    title: t.title ?? 'Untitled',
    artist: t.user?.name ?? fallbackArtist,
    artworkUrl: t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? '',
    streamUrl: `${AUDIUS_API}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
    duration: t.duration ?? 0,
  };
}

export async function readPlaylist(url: string, fallbackArtist: string): Promise<Track[]> {
  const res = await fetch(
    `${AUDIUS_API}/resolve?url=${encodeURIComponent(url)}&app_name=${APP_NAME}`,
  );
  if (!res.ok) throw new Error(`Audius resolve failed: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: unknown };
  const data = (Array.isArray(body.data) ? body.data[0] : body.data) as
    | { tracks?: RawTrack[]; playlist_contents?: { track_id?: string; track?: string }[] }
    | undefined;
  if (!data) return [];
  if (Array.isArray(data.tracks)) {
    return data.tracks.flatMap((t) => toTrack(t, fallbackArtist) ?? []);
  }
  const ids = (data.playlist_contents ?? []).flatMap((c) => c.track_id ?? c.track ?? []);
  if (!ids.length) return [];
  const bulk = await fetch(`${AUDIUS_API}/tracks?id=${ids.join(',')}&app_name=${APP_NAME}`);
  if (!bulk.ok) throw new Error(`Audius tracks failed: HTTP ${bulk.status}`);
  const tracks = ((await bulk.json()) as { data?: RawTrack[] }).data ?? [];
  return tracks.flatMap((t) => toTrack(t, fallbackArtist) ?? []);
}
