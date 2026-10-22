'use client';

import { useEffect, useRef, useState } from 'react';
import {
  castUrl,
  COMMANDS,
  composeUrl,
  filterWorkspacePosts,
  isWorkspacePost,
  musicLinks,
  parseWorkspaceCommand,
  type CommandId,
  type WorkspaceFeed,
  type WorkspacePost,
} from '@/lib/workspace/model';
import styles from './workspace.module.css';

const STORAGE = 'zao-workspace-v1';
const DEFAULT_FAVORITES: CommandId[] = ['review', 'music', 'saved', 'feedback'];

export function AgentWorkspace() {
  const [mode, setMode] = useState<'command' | 'cast'>('command');
  const [commandText, setCommandText] = useState('');
  const [castText, setCastText] = useState('');
  const [active, setActive] = useState<CommandId>('review');
  const [query, setQuery] = useState('');
  const [feed, setFeed] = useState<WorkspaceFeed | null>(null);
  const [saved, setSaved] = useState<WorkspacePost[]>([]);
  const [favorites, setFavorites] = useState<CommandId[]>(DEFAULT_FAVORITES);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<WorkspacePost | null>(null);
  const [parent, setParent] = useState<WorkspacePost | null>(null);
  const [thread, setThread] = useState<WorkspaceFeed | null>(null);
  const [threadState, setThreadState] = useState('');
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const threadController = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      if (Array.isArray(data.saved)) setSaved(data.saved.filter(isWorkspacePost).slice(0, 200));
      if (Array.isArray(data.favorites))
        setFavorites(data.favorites.filter((id: CommandId) => COMMANDS.some((c) => c.id === id)));
      if (typeof data.castText === 'string') setCastText(data.castText);
      if (isWorkspacePost(data.parent)) setParent(data.parent);
    } catch {
      /* A fresh workspace still works if browser storage is unavailable. */
    }
    setReady(true);
    void loadFeed();
    return () => {
      controller.current?.abort();
      threadController.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ saved, favorites, castText, parent }));
    } catch {
      setNotice('Browser storage is unavailable. Saves and drafts will last for this visit only.');
    }
  }, [saved, favorites, castText, parent, ready]);

  useEffect(() => {
    if (preview) dialog.current?.showModal();
    else dialog.current?.close();
  }, [preview]);

  async function loadFeed(more = false) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setError('');
    try {
      const token =
        more && feed?.nextPageToken ? `?pageToken=${encodeURIComponent(feed.nextPageToken)}` : '';
      const response = await fetch(`/api/workspace/feed${token}`, { signal: current.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not read the community.');
      if (!Array.isArray(data.posts) || !data.posts.every(isWorkspacePost))
        throw new Error('The community response could not be read.');
      if (!current.signal.aborted)
        setFeed((old) => ({
          ...data,
          posts:
            more && old
              ? [...new Map([...old.posts, ...data.posts].map((p) => [p.hash, p])).values()]
              : data.posts,
        }));
    } catch (failure) {
      if (!current.signal.aborted)
        setError(
          failure instanceof Error ? failure.message : 'The community connection is unavailable.',
        );
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }

  function draft(text: string, target: WorkspacePost | null = null) {
    setCastText(text);
    setParent(target);
    setMode('cast');
    setNotice('Draft only. Review it before opening Farcaster.');
    input.current?.focus();
  }

  function run(value = commandText) {
    setError('');
    setNotice('');
    try {
      const result = parseWorkspaceCommand(value);
      if (result.command === 'feedback') {
        draft(`!zao-feedback idea — ${result.query}`);
        return;
      }
      setMode('command');
      setActive(result.command);
      setQuery(result.query);
      setCommandText(value);
      if (result.command === 'curate')
        setNotice('Choose Curate on a post, then add the reason you want to share it.');
      else if (result.query)
        setNotice(
          `Searching ${result.command === 'saved' ? 'your saved' : 'the loaded'} posts for “${result.query}”.`,
        );
      else
        setNotice(
          result.command === 'saved'
            ? 'Your saved posts, kept on this device.'
            : 'Ready to review. Select a post for context or save it for later.',
        );
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  function toggleSave(post: WorkspacePost) {
    const exists = saved.some((p) => p.hash === post.hash);
    setSaved((old) => (exists ? old.filter((p) => p.hash !== post.hash) : [post, ...old]));
    setNotice(
      exists ? 'Removed from your saved posts.' : 'Saved on this device. Nothing was posted.',
    );
  }

  async function review(post: WorkspacePost) {
    setSelected(post);
    setThread(null);
    setThreadState('Loading conversation…');
    threadController.current?.abort();
    const current = new AbortController();
    threadController.current = current;
    try {
      const response = await fetch(
        `/api/workspace/feed?fid=${post.fid}&hash=${encodeURIComponent(post.hash)}`,
        { signal: current.signal },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!current.signal.aborted) {
        setThread(data);
        setThreadState(data.posts.length ? '' : 'No replies found in this node’s current data.');
      }
    } catch {
      if (!current.signal.aborted)
        setThreadState(
          'Replies could not be loaded. You can still open the original conversation.',
        );
    }
  }

  function preparePreview() {
    const text = castText.trim();
    if (!text || /^!zao(?:-feedback)?\s+\S+\s*[—-]\s*$/.test(text)) {
      setError('Add your own message or curator note before previewing.');
      return;
    }
    if (new TextEncoder().encode(text).length > 320) {
      setError('Keep this pilot cast within 320 bytes. Your draft is still here.');
      return;
    }
    setError('');
    setPreview(true);
  }

  async function openComposer() {
    setPublishing(true);
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      if (await sdk.isInMiniApp()) {
        const result = await sdk.actions.composeCast({
          text: castText.trim(),
          ...(parent ? { parent: { type: 'cast' as const, hash: parent.hash } } : {}),
        });
        setNotice(
          result?.cast
            ? `Posted on Farcaster: ${castUrl(result.cast.hash)}`
            : 'Composer closed. Your draft is still here.',
        );
        setPreview(false);
      } else {
        // Browser posting uses an ordinary user-controlled link, not an operator signer.
        setNotice(
          'Use Open Farcaster below. Opening the composer does not mean your draft was posted.',
        );
      }
    } catch {
      setNotice('The in-app composer is unavailable. Open Farcaster or copy your draft below.');
    } finally {
      setPublishing(false);
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(castText);
      setNotice('Draft copied. You can paste it into your preferred client.');
    } catch {
      setNotice('Copy was unavailable. Select and copy the draft text instead.');
    }
  }

  const posts = filterWorkspacePosts(active === 'saved' ? saved : feed?.posts || [], active, query);
  const activeCommand = COMMANDS.find((c) => c.id === active)!;
  const bytes = new TextEncoder().encode(castText).length;
  const isPinned = favorites.includes(active);

  return (
    <div className={styles.workspace}>
      <a className={styles.skip} href="#workspace-input">
        Skip to workspace input
      </a>
      <aside className={styles.rail}>
        <a href="/workspace" className={styles.brand}>
          <span className={styles.brandMark}>Z</span>
          <span>
            THE ZAO<small>Community workspace</small>
          </span>
        </a>
        <div className={styles.railLabel}>YOUR SPACE</div>
        <button
          type="button"
          className={`${styles.railButton} ${mode === 'command' ? styles.railActive : ''}`}
          onClick={() => {
            setMode('command');
            input.current?.focus();
          }}
        >
          <span>⌘</span> Workspace
        </button>
        <button type="button" className={styles.railButton} onClick={() => run('/saved')}>
          <span>☆</span> Saved posts <small>{saved.length}</small>
        </button>
        <div className={styles.railLabel}>
          FAVORITES <span>Click to run</span>
        </div>
        {favorites.map((id) => {
          const c = COMMANDS.find((item) => item.id === id)!;
          return (
            <button
              type="button"
              key={id}
              className={styles.railButton}
              onClick={() => run(c.prompt)}
            >
              <span>↗</span>
              {c.label}
            </button>
          );
        })}
        {!favorites.length && <p className={styles.railHint}>Pin a command to keep it here.</p>}
        <div className={styles.railBottom}>
          <a href="/chat">Open classic client ↗</a>
          <a href="https://thezao.com/nexus" target="_blank" rel="noopener noreferrer">
            Explore the ZAO ↗
          </a>
          <small>
            Private commands.
            <br />
            Public casts, when you choose.
          </small>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <span>
            <span className={styles.dot} /> Community workspace
          </span>
          <span className={styles.pilot}>PILOT v0.1</span>
        </header>
        <section className={styles.intro}>
          <p className={styles.eyebrow}>YOUR PEOPLE. YOUR NEXT MOVE.</p>
          <h1>
            What would you like
            <br />
            to <em>explore today?</em>
          </h1>
          <p>
            Review the community, find something worth sharing,
            <br className={styles.desktopBreak} /> and make it your own.
          </p>
        </section>

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            mode === 'command' ? run() : preparePreview();
          }}
        >
          <div className={styles.modeRow}>
            <div className={styles.modes} role="group" aria-label="Input mode">
              <button
                type="button"
                aria-pressed={mode === 'command'}
                onClick={() => {
                  setMode('command');
                  setError('');
                }}
              >
                ⌘ Command
              </button>
              <button
                type="button"
                aria-pressed={mode === 'cast'}
                onClick={() => {
                  setMode('cast');
                  setError('');
                }}
              >
                ↗ Cast
              </button>
            </div>
            <span>
              {mode === 'command'
                ? 'Only you see your commands'
                : 'Public after you publish in Farcaster'}
            </span>
          </div>
          {mode === 'cast' && parent && (
            <div className={styles.replyTarget}>
              Replying to @{parent.username}
              <button type="button" onClick={() => setParent(null)}>
                Remove reply target
              </button>
            </div>
          )}
          <label className={styles.srOnly} htmlFor="workspace-input">
            {mode === 'command' ? 'Workspace command or search' : 'Cast draft'}
          </label>
          <textarea
            id="workspace-input"
            ref={input}
            value={mode === 'command' ? commandText : castText}
            onChange={(event) =>
              mode === 'command'
                ? setCommandText(event.target.value)
                : setCastText(event.target.value)
            }
            placeholder={
              mode === 'command'
                ? 'Type / for commands, or search recent posts…'
                : 'What would you like to share with the community?'
            }
            rows={3}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                mode === 'command' ? run() : preparePreview();
              }
            }}
          />
          <div className={styles.composerFoot}>
            {mode === 'command' ? (
              <label className={styles.commandPicker}>
                <span>Choose a command</span>
                <select
                  aria-label="Choose a command"
                  value=""
                  onChange={(event) => {
                    setCommandText(event.target.value);
                    input.current?.focus();
                  }}
                >
                  <option value="" disabled>
                    / commands
                  </option>
                  {COMMANDS.map((c) => (
                    <option key={c.id} value={c.prompt}>
                      {c.prompt} — {c.description}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className={styles.byteCount}>
                {bytes} / 320 bytes · draft saved on this device
              </span>
            )}
            <button type="submit" className={styles.primary}>
              {mode === 'command' ? 'Run command' : 'Preview cast'} <span>↗</span>
            </button>
          </div>
        </form>
        <div className={styles.suggestions}>
          {COMMANDS.filter((c) => ['review', 'music', 'feedback'].includes(c.id)).map((c) => (
            <button type="button" key={c.id} onClick={() => run(c.prompt)}>
              {c.label} <span>↗</span>
            </button>
          ))}
        </div>
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        {error && (
          <div className={styles.error} role="alert">
            {error}
            <button type="button" onClick={() => loadFeed()}>
              Retry connection
            </button>
          </div>
        )}

        <section className={styles.results} aria-label="Command results">
          <div className={styles.resultHeader}>
            <div>
              <p className={styles.eyebrow}>READY FOR YOUR REVIEW</p>
              <h2>
                {active === 'curate' ? 'Choose something worth sharing' : activeCommand.label}
              </h2>
            </div>
            <div className={styles.resultTools}>
              <button
                type="button"
                aria-pressed={isPinned}
                onClick={() =>
                  setFavorites((old) =>
                    isPinned ? old.filter((id) => id !== active) : [...old, active],
                  )
                }
              >
                {isPinned ? '★ Pinned' : '☆ Pin command'}
              </button>
              <button type="button" disabled={busy} onClick={() => loadFeed()}>
                {busy ? 'Loading…' : '↻ Refresh'}
              </button>
            </div>
          </div>
          <p className={styles.source}>
            {active === 'saved'
              ? 'Saved on this device · may include older posts'
              : feed
                ? `${feed.source} · checked ${new Date(feed.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${feed.posts.length} loaded posts`
                : 'Reading public community posts…'}
          </p>
          <div className={styles.resultLayout}>
            <div className={styles.postList}>
              {!posts.length && (
                <div className={styles.empty}>
                  {busy
                    ? 'Finding the community conversation…'
                    : active === 'saved'
                      ? 'Your next great find belongs here. Save a post to return to it.'
                      : 'No matching posts in the loaded feed. Try another search or load more posts.'}
                </div>
              )}
              {posts.map((post) => (
                <article
                  key={post.hash}
                  className={`${styles.post} ${selected?.hash === post.hash ? styles.selectedPost : ''}`}
                >
                  <div className={styles.postHead}>
                    <span className={styles.avatar}>{post.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{post.name}</strong>
                      <span>@{post.username}</span>
                    </div>
                    <time dateTime={new Date(post.timestamp).toISOString()}>
                      {new Date(post.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <p className={styles.postText}>{post.text}</p>
                  {musicLinks(post).map((url) => (
                    <a
                      className={styles.musicLink}
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ♫ Listen on {new URL(url).hostname.replace('www.', '')} ↗
                    </a>
                  ))}
                  <div className={styles.postActions}>
                    <button type="button" onClick={() => review(post)}>
                      Review conversation
                    </button>
                    <button type="button" onClick={() => draft('!zao music — ', post)}>
                      Curate ↗
                    </button>
                    <button
                      type="button"
                      aria-pressed={saved.some((p) => p.hash === post.hash)}
                      onClick={() => toggleSave(post)}
                    >
                      {saved.some((p) => p.hash === post.hash) ? '★ Saved' : '☆ Save'}
                    </button>
                  </div>
                </article>
              ))}
              {active !== 'saved' && feed?.nextPageToken && (
                <button
                  type="button"
                  className={styles.loadMore}
                  disabled={busy}
                  onClick={() => loadFeed(true)}
                >
                  {busy ? 'Loading…' : 'Load more community posts'}
                </button>
              )}
            </div>
            <aside className={styles.context} aria-label="Review context">
              <p className={styles.eyebrow}>{selected ? 'IN FOCUS' : 'A LITTLE CONTEXT'}</p>
              {selected ? (
                <>
                  <h3>{selected.name}’s conversation</h3>
                  <p className={styles.contextText}>{selected.text}</p>
                  <a href={castUrl(selected.hash)} target="_blank" rel="noopener noreferrer">
                    Open original ↗
                  </a>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => draft('', selected)}
                  >
                    Draft a reply
                  </button>
                  <h4>Replies</h4>
                  <p className={styles.source} role="status">
                    {threadState}
                  </p>
                  {thread?.posts.map((post) => (
                    <div key={post.hash} className={styles.reply}>
                      <strong>{post.name}</strong>
                      <p>{post.text}</p>
                    </div>
                  ))}
                  {thread?.nextPageToken && (
                    <a href={castUrl(selected.hash)} target="_blank" rel="noopener noreferrer">
                      More replies on Farcaster ↗
                    </a>
                  )}
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => {
                      threadController.current?.abort();
                      setSelected(null);
                    }}
                  >
                    Close conversation
                  </button>
                </>
              ) : (
                <>
                  <h3>A workspace for your community.</h3>
                  <p>
                    Commands help you find and review public posts. Choose a conversation to bring
                    it into focus.
                  </p>
                  <p>
                    Save something privately, or curate it with a public reply and your own note.
                  </p>
                  <div className={styles.contextDivider} />
                  <small>
                    This pilot runs the commands shown above. It does not invent AI summaries or
                    publish on your behalf.
                  </small>
                </>
              )}
            </aside>
          </div>
        </section>
        <footer className={styles.footer}>
          Built for artists, curators, and the people who show up.
          <button type="button" onClick={() => run('/feedback')}>
            Give feedback ↗
          </button>
        </footer>
      </main>

      <dialog
        ref={dialog}
        className={styles.previewDialog}
        onCancel={() => setPreview(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPreview(false);
        }}
      >
        <div className={styles.previewHead}>
          <p className={styles.eyebrow}>YOUR PUBLIC CAST</p>
          <button type="button" aria-label="Close cast preview" onClick={() => setPreview(false)}>
            ×
          </button>
        </div>
        <h2>One last look.</h2>
        <p className={styles.source}>
          You will choose your account and publish in your Farcaster client.
        </p>
        {parent && (
          <p className={styles.replyTarget}>
            Reply to @{parent.username} ·{' '}
            <a href={castUrl(parent.hash)} target="_blank" rel="noopener noreferrer">
              View parent ↗
            </a>
          </p>
        )}
        <p className={styles.previewText}>{castText}</p>
        <div className={styles.previewActions}>
          <a
            className={styles.primary}
            href={composeUrl(castText.trim(), parent?.hash)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              setNotice('Farcaster composer opened. Finish posting there; your draft remains here.')
            }
          >
            Open Farcaster ↗
          </a>
          <button
            type="button"
            className={styles.secondary}
            disabled={publishing}
            onClick={openComposer}
          >
            {publishing ? 'Opening…' : 'Use in-app composer'}
          </button>
          <button type="button" className={styles.textButton} onClick={copyDraft}>
            Copy draft
          </button>
          <button type="button" className={styles.textButton} onClick={() => setPreview(false)}>
            Keep editing
          </button>
        </div>
        <p className={styles.source}>
          Opening a composer is not a confirmed post. Nothing is automatically sent.
        </p>
      </dialog>
    </div>
  );
}
