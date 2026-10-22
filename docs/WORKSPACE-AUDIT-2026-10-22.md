# Workspace audit — October 22, 2026

Scope: the `/workspace` pilot, its read API, browser storage, service worker,
deployment limits, and installed dependency advisories. This is not a complete
audit of every legacy route, signer, contract, or node administration service.

## Fixed

| Finding | Result |
| --- | --- |
| An existing service worker could continue serving stale development JavaScript after registrations were disabled. | Development removes only ZAO's `/sw.js` registration and `zaoos-` caches, then reloads if that worker controlled the page. Local storage is preserved. The updated worker bypasses caching on loopback hosts and removes old ZAO caches. |
| The earlier hydration workaround made metadata block every response without addressing stale worker caches. | Restored Next.js's default metadata streaming after addressing worker/cache cleanup. |
| Curation, feedback, or reply shortcuts silently overwrote an unfinished cast draft and its parent. | Replacement requires an explicit choice in the workspace. Keeping the current draft preserves its reply target. |
| The UI allowed more than 200 saved posts but restored only 200 after reload. | New saves stop at 200 with an explanation. Existing saves are not truncated during restore. Duplicate restored posts/favorites are removed. |
| Music platform detection matched names anywhere in a URL, including lookalike domains and query strings. | Platform labels require an exact hostname or a subdomain boundary. Direct audio links are recognized by their URL pathname. |
| Malformed conversation data could crash rendering. | Both feed and replies validate post fields, metadata timestamps, and pagination tokens. Malformed replies leave the original conversation link available. |
| The reader buffered an unbounded upstream body before checking its size, accepted malformed casts, and could fan out beyond the requested page size. | Body reads stop at 4 MB, cast fields are validated, and at most 12 entries are processed per page. |
| An 8-second feed read plus three sequential 8-second profile batches exceeded Vercel's 10-second function setting. | Feed and profile batches share one 7-second upstream budget. Missing or slow profiles fall back to FID labels while retaining casts. |
| A draft validation error offered an unrelated connection retry. | Connection errors and draft errors render separately. |
| The preview dialog lacked an accessible name and composer/copy notices appeared behind it. | The dialog has a labelled title and includes status notices. |
| A successful connection check could be mistaken for a current, complete feed. | The UI also displays the newest loaded post's date and states that node data may not include every Farcaster post. |
| `.env.production` and other environment variants were not ignored. | `.env.*` is ignored except the tracked `.env.example`; the workspace node setting is documented without secrets. |

## Dependencies

- Updated `@sentry/nextjs` from 10.45.0 to 10.75.2, fixing
  [GHSA-mchm-gjx6-7h55](https://github.com/advisories/GHSA-mchm-gjx6-7h55).
  This app currently uses Turbopack and does not configure `tunnelRoute`, so it
  does not meet the advisory's affected conditions. Also adopted the supported
  `@sentry/nextjs/config` import.
- Updated Vite within major version 8 to address the reported development-tool
  advisories. This app serves pages using Next.js; Vite is used by its tests.
- The production audit now reports zero critical/high findings and seven
  moderate findings through Farcaster → Solana → jayson → stream-json/uuid.
  npm reports no available dependency fix for that chain.
- The full audit still reports five high findings through the development-only
  eslint-config-next → fast-glob → micromatch → braces chain. npm proposes a
  downgrade to Next 14's ESLint config. No forced downgrade or incompatible
  transitive override was applied.

Audit counts describe affected packages, not independent exploits, and do not
establish whether a vulnerable code path is reachable in this app.

## Validation

- TypeScript passed after the changes.
- 34 tests passed across eight focused files, including deadline fallback,
  oversized body cancellation, malformed rows, spoofed hosts, draft protection,
  save limits, theme startup/remounts, and scoped worker cleanup.
- Browser checks loaded 12 real casts from the configured local node, showed
  the freshness label, and preserved an existing draft when a new curation draft
  was declined. No cast was published.
- Browser worker recovery: installed a local ZAO worker and created a probe
  cache, then reloaded. Registration count became zero, ZAO caches were removed,
  local-storage probe data survived, and the workspace still loaded 12 posts.
- Fresh browser console checks showed no errors.
- The updated production bundle compiled successfully. The build was stopped
  after compilation while reducing local memory pressure; no completed
  production deployment is claimed. The app's required secrets remain absent.
- The broader run passed 918 tests, hit two authorization-test timeouts and
  one workspace worker-start timeout under memory pressure. Rerunning the
  affected authorization and workspace files alone passed all 97 tests. This
  is not a claim that the original full run was green.
- Three existing Windows-dependent test files were excluded from that broader
  run: `vercel-ignore.test.ts`, `smoke-live.test.ts`, and
  `visitor-member-boundary.test.ts`. Their prior shell/path failures remain
  outside this change.

## Still to verify

1. Node data freshness and coverage: the newest local `/zao` post observed was
   October 10. A successful API response does not establish network completeness
   or equivalence between Farcaster forks. Compare sources before promising
   a current community feed.
2. Vercel secrets, Upstash rate limiting, production auth, and a reachable node
   endpoint still require deployment configuration. Local public reads do not
   exercise these production flows.
3. Review production offline caching across sign-in/sign-out, all legacy write
   routes, signer permissions, and operator key storage in a separate pass.
4. Confirm hydration recovery in the user's extension-enabled browser. A clean
   embedded browser cannot establish the behavior of that browser's extensions.
5. Curation and feedback are still draft conventions without a shared index,
   moderation queue, or feedback dashboard. Saves remain local to this browser.

Loopback hosts intentionally do not provide service-worker offline caching.
Production offline behavior must be tested on a non-loopback origin.
