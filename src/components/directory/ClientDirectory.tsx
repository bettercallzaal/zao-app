'use client';

import { useState } from 'react';
import {
  APPS,
  CATEGORIES,
  filterApps,
  REVIEW_DATE,
  TIMELINE,
  type Category,
} from '@/lib/directory/catalog';
import styles from './directory.module.css';

function feedbackUrl(name?: string) {
  const text = name
    ? `!zao-feedback directory — ${name}\nWhat I tested:\nWhat worked:\nWhat needs correcting:\nSource link:`
    : '!zao-feedback directory — Suggest an app or correction\nApp name and link:\nWhat it does well:\nTradeoffs:\nSource:';
  return `https://farcaster.xyz/~/compose?${new URLSearchParams({ text })}`;
}

export function ClientDirectory() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [compare, setCompare] = useState<string[]>([]);
  const apps = filterApps(query, category);
  const selected = APPS.filter((app) => compare.includes(app.id));
  return (
    <div className={styles.directory}>
      <a className={styles.skip} href="#applications">
        Skip to applications
      </a>
      <header className={styles.header}>
        <a href="/workspace" className={styles.brand}>
          <span>Z</span>
          <div>
            ZAO CLIENT<small>A client of clients</small>
          </div>
        </a>
        <nav aria-label="Main navigation">
          <a href="#applications">Explore apps</a>
          <a href="#history">The history</a>
          <a href="/developers">Open API ↗</a>
        </nav>
      </header>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>MANY INTERFACES. MORE CHOICE.</p>
          <h1>
            Find your corner
            <br />
            of <em>Farcaster.</em>
          </h1>
          <p className={styles.intro}>
            A community guide to the apps people are building. See what each one does well,
            understand the tradeoffs, and choose where to go next.
          </p>
          <div className={styles.heroMeta}>
            <span>{APPS.length} researched listings</span>
            <span>Reviewed {REVIEW_DATE}</span>
            <span>No sign-in needed</span>
          </div>
        </section>

        <aside className={styles.context} aria-label="How to read this directory">
          <strong>Your account is one layer. Your app is another.</strong>
          <p>
            Clients, Mini Apps, messaging systems, and node services do different jobs. Shared
            Farcaster formats don’t guarantee the same feed, private messages, or delivery across
            forks.
          </p>
          <a href="#history">Understand the history ↓</a>
        </aside>

        <section id="applications" className={styles.explore} aria-labelledby="apps-heading">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>THE ECOSYSTEM, IN YOUR HANDS</p>
              <h2 id="apps-heading">Explore the applications</h2>
            </div>
            <a href={feedbackUrl()} target="_blank" rel="noopener noreferrer">
              Suggest an app ↗
            </a>
          </div>
          <label className={styles.search}>
            <span>Search apps</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try Hypersnap, audio, multi-account, or Felirami…"
            />
          </label>
          <div className={styles.filters} role="group" aria-label="Application category">
            {(['All', ...CATEGORIES] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className={styles.resultLine}>
            <p role="status">
              {apps.length} {apps.length === 1 ? 'listing' : 'listings'}
              {query && ` matching “${query}”`}
            </p>
            <p>Compare up to 3 · Pros and tradeoffs are ZAO’s editorial assessment</p>
          </div>
          {selected.length > 0 && (
            <section className={styles.comparison} aria-label="Selected app comparison">
              <div className={styles.sectionHead}>
                <h3>Your shortlist</h3>
                <button type="button" onClick={() => setCompare([])}>
                  Clear comparison
                </button>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <caption>Compare selected applications</caption>
                  <thead>
                    <tr>
                      <th scope="col">Application</th>
                      <th scope="col">Best fit</th>
                      <th scope="col">Network / service</th>
                      <th scope="col">Main tradeoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((app) => (
                      <tr key={app.id}>
                        <th scope="row">{app.name}</th>
                        <td>{app.fit}</td>
                        <td>{app.network}</td>
                        <td>{app.cons[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <div className={styles.grid}>
            {apps.map((app, index) => (
              <article key={app.id} id={`app-${app.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={app.category === 'History' ? styles.historical : styles.badge}>
                    {app.category}
                  </span>
                </div>
                <h3>{app.name}</h3>
                <p className={styles.tagline}>{app.tagline}</p>
                <p className={styles.platforms}>{app.platforms}</p>
                <div className={styles.fit}>
                  <span>GOOD FOR</span>
                  <p>{app.fit}</p>
                </div>
                <div className={styles.assessment}>
                  <div>
                    <h4>Pros</h4>
                    <ul>
                      {app.pros.map((pro) => (
                        <li key={pro}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Cons & tradeoffs</h4>
                    <ul>
                      {app.cons.map((con) => (
                        <li key={con}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <details className={styles.sources}>
                  <summary>
                    {app.basis} · {REVIEW_DATE}
                  </summary>
                  <p>Network / service: {app.network}</p>
                  <p>
                    Review basis describes the evidence we read, not a certification or a completed
                    sign-in test.
                  </p>
                  {app.sources.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.title} ↗
                    </a>
                  ))}
                </details>
                <div className={styles.cardActions}>
                  {app.url ? (
                    <a
                      className={styles.launch}
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {app.url.includes('github.com') ? 'View project' : 'Visit website'} ↗
                    </a>
                  ) : (
                    <a
                      className={styles.launch}
                      href={app.sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Historical source ↗
                    </a>
                  )}
                  <label>
                    <input
                      type="checkbox"
                      checked={compare.includes(app.id)}
                      disabled={compare.length >= 3 && !compare.includes(app.id)}
                      onChange={(event) =>
                        setCompare((ids) =>
                          event.target.checked
                            ? [...ids, app.id]
                            : ids.filter((id) => id !== app.id),
                        )
                      }
                    />{' '}
                    Compare<span className={styles.srOnly}> {app.name}</span>
                  </label>
                </div>
                <a
                  className={styles.correction}
                  href={feedbackUrl(app.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share your experience / suggest a correction ↗
                </a>
              </article>
            ))}
          </div>
          {apps.length === 0 && (
            <div className={styles.empty}>
              <h3>No matches yet.</h3>
              <p>Try another search, or suggest an application for the next review.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
              >
                Show every listing
              </button>
            </div>
          )}
        </section>

        <section className={styles.history} id="history" aria-labelledby="history-heading">
          <p className={styles.eyebrow}>HOW WE GOT HERE</p>
          <h2 id="history-heading">One story. Many ways forward.</h2>
          <p className={styles.intro}>
            Farcaster’s story is about identity, open data, and the freedom to build different
            experiences. These milestones explain why a directory of clients matters.
          </p>
          <ol className={styles.timeline}>
            {TIMELINE.map((event) => (
              <li key={event.title}>
                <span>{event.date}</span>
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.text}</p>
                  <a href={event.source} target="_blank" rel="noopener noreferrer">
                    {event.label} ↗
                  </a>
                  {event.context && (
                    <>
                      {' '}
                      ·{' '}
                      <a href={event.context} target="_blank" rel="noopener noreferrer">
                        Reporting and context ↗
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.method}>
          <h2>A living guide, built with the community.</h2>
          <p>
            This is a curated starting set, not every application ever built. Listings reflect
            public websites, repositories, and documented limitations as of {REVIEW_DATE}.
            Availability and policies can change. No sponsored rankings or numerical quality scores.
          </p>
          <p>
            Have a correction or a missing app? The feedback links open a draft in Farcaster for you
            to review and publish.
          </p>
          <div>
            <a href={feedbackUrl()} target="_blank" rel="noopener noreferrer">
              Contribute a review ↗
            </a>
            <a
              href="https://github.com/a16z/awesome-farcaster"
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse more ecosystem leads ↗
            </a>
            <a href="/workspace/review">Open the ZAO community reader →</a>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>THE ZAO · Built for people who show up.</span>
        <a href="/developers">Build with our read API ↗</a>
      </footer>
    </div>
  );
}
