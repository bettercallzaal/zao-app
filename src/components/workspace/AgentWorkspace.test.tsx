import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentWorkspace } from './AgentWorkspace';

const post = {
  hash: `0x${'a'.repeat(40)}`,
  fid: 1,
  name: 'Test artist',
  username: 'artist',
  avatar: '',
  text: 'Listen to my independent release',
  timestamp: 1700000000000,
  embeds: [],
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [post],
        source: 'Test node',
        checkedAt: '2026-10-22T10:00:00Z',
        nextPageToken: null,
      }),
    }),
  );
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('agent-first workspace', () => {
  it('reviews real response data, saves locally and returns to saved posts', async () => {
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    fireEvent.click(screen.getByRole('button', { name: '☆ Save' }));
    fireEvent.click(screen.getByRole('button', { name: /My saved posts/ }));
    expect(screen.getByRole('heading', { name: 'My saved posts' })).toBeInTheDocument();
    expect(screen.getByText(post.text)).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('zao-workspace-v1')).toContain(post.hash));
    expect(
      vi
        .mocked(fetch)
        .mock.calls.every(
          ([, options]) => !options || !('method' in options) || options.method === 'GET',
        ),
    ).toBe(true);
  });
  it('switches to cast without losing the private command, and requires a note before curation', async () => {
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    fireEvent.change(screen.getByLabelText('Workspace command or search'), {
      target: { value: '/review independent' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Curate ↗' }));
    fireEvent.click(screen.getByRole('button', { name: /Preview cast/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add your own');
    fireEvent.change(screen.getByLabelText('Cast draft'), {
      target: { value: '!zao music — A great independent release.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Preview cast/ }));
    const link = screen.getByRole('link', { name: /Open Farcaster/ });
    expect(new URL(link.getAttribute('href')!).searchParams.get('parentCastHash')).toBe(post.hash);
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    fireEvent.click(screen.getByRole('button', { name: '⌘ Command' }));
    expect(screen.getByLabelText('Workspace command or search')).toHaveValue('/review independent');
  });
  it('prepares feedback as an editable draft without publishing it', async () => {
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    fireEvent.change(screen.getByLabelText('Workspace command or search'), {
      target: { value: '/feedback Favorites should sync across devices.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run command/ }));
    expect(screen.getByLabelText('Cast draft')).toHaveValue(
      '!zao-feedback idea — Favorites should sync across devices.',
    );
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores the reply target with a saved draft after a reload', async () => {
    localStorage.setItem(
      'zao-workspace-v1',
      JSON.stringify({ castText: '!zao music — My note.', parent: post }),
    );
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    fireEvent.click(screen.getByRole('button', { name: '↗ Cast' }));
    expect(screen.getByText(/Replying to @artist/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Preview cast/ }));
    expect(
      new URL(
        screen.getByRole('link', { name: /Open Farcaster/ }).getAttribute('href')!,
      ).searchParams.get('parentCastHash'),
    ).toBe(post.hash);
  });

  it('protects the existing draft and reply target until replacement is chosen', async () => {
    localStorage.setItem(
      'zao-workspace-v1',
      JSON.stringify({ castText: 'My unfinished reply', parent: post }),
    );
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    fireEvent.click(screen.getAllByRole('button', { name: /Give feedback/ })[0]);
    expect(screen.getByLabelText('Cast draft')).toHaveValue('My unfinished reply');
    expect(screen.getByText(/Replying to @artist/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep current draft' }));
    expect(screen.queryByRole('button', { name: 'Replace draft' })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Give feedback/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Replace draft' }));
    expect(screen.getByLabelText('Cast draft')).toHaveValue('!zao-feedback idea — ');
    expect(screen.queryByText(/Replying to @artist/)).not.toBeInTheDocument();
  });

  it('refuses a 201st save instead of silently losing it on reload', async () => {
    const saved = Array.from({ length: 200 }, (_, i) => ({
      ...post,
      hash: `0x${i.toString(16).padStart(40, '0')}`,
    }));
    localStorage.setItem('zao-workspace-v1', JSON.stringify({ saved }));
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    fireEvent.click(screen.getByRole('button', { name: '☆ Save' }));
    expect(screen.getByRole('status')).toHaveTextContent('200 saved posts');
    const persisted = JSON.parse(localStorage.getItem('zao-workspace-v1')!);
    expect(persisted.saved).toHaveLength(200);
    expect(persisted.saved.map((p: typeof post) => p.hash)).toEqual(saved.map((p) => p.hash));
  });

  it('handles malformed replies without crashing the workspace', async () => {
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ posts: [null] }),
    } as Response);
    fireEvent.click(screen.getByRole('button', { name: 'Review conversation' }));
    await screen.findByText(/Replies could not be loaded/);
    expect(screen.getByRole('link', { name: /Open original/ })).toBeInTheDocument();
  });

  it('does not offer a connection retry for a draft validation error and names the dialog', async () => {
    render(<AgentWorkspace />);
    await screen.findByText(post.text);
    fireEvent.click(screen.getByRole('button', { name: '↗ Cast' }));
    fireEvent.click(screen.getByRole('button', { name: /Preview cast/ }));
    expect(screen.queryByRole('button', { name: 'Retry connection' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cast draft'), { target: { value: 'A complete note' } });
    fireEvent.click(screen.getByRole('button', { name: /Preview cast/ }));
    expect(screen.getByRole('dialog', { name: 'One last look.' })).toBeInTheDocument();
  });
});
