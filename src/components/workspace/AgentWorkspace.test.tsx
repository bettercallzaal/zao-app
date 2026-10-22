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
});
