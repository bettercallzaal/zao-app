import { describe, expect, it } from 'vitest';
import {
  composeUrl,
  filterWorkspacePosts,
  musicLinks,
  parseWorkspaceCommand,
  type WorkspacePost,
} from './model';

const post: WorkspacePost = {
  hash: `0x${'a'.repeat(40)}`,
  fid: 1,
  name: 'Artist',
  username: 'artist',
  avatar: '',
  timestamp: 1700000000000,
  text: 'A new independent release',
  embeds: ['https://open.spotify.com/track/example', 'javascript:alert(1)'],
};

describe('workspace command boundary', () => {
  it('treats arbitrary text as a read-only search, never as a cast', () => {
    expect(parseWorkspaceCommand('post this publicly')).toEqual({
      command: 'review',
      query: 'post this publicly',
    });
    expect(parseWorkspaceCommand('show my saved posts')).toEqual({ command: 'saved', query: '' });
  });
  it('rejects unsupported slash commands rather than inventing execution', () => {
    expect(() => parseWorkspaceCommand('/send money')).toThrow('Choose /review');
  });
  it('searches the saved collection and discovers music without following unsafe URLs', () => {
    expect(filterWorkspacePosts([post], 'music', 'independent')).toEqual([post]);
    expect(filterWorkspacePosts([post], 'review', 'absent')).toEqual([]);
    expect(musicLinks(post)).toEqual(['https://open.spotify.com/track/example']);
  });
  it('encodes the exact editable public reply without running a publishing action', () => {
    const url = new URL(composeUrl('!zao music — keep & share', post.hash));
    expect(url.origin).toBe('https://farcaster.xyz');
    expect(url.searchParams.get('text')).toBe('!zao music — keep & share');
    expect(url.searchParams.get('parentCastHash')).toBe(post.hash);
  });
});
