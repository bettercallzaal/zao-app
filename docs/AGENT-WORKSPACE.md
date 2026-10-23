# Community workspace pilot

The reader pilot lives at `/workspace/review` in `bettercallzaal/zao-app`, on branch
`main`. The `/` and `/workspace` entry points now show the ZAO Client application
directory; see [the directory research](CLIENT-OF-CLIENTS-RESEARCH-2026-10-22.md).
The reader provides a central Command/Cast input, favorite
commands, public ZAO posts, conversation review, local saves, and editable
curation and feedback drafts.

## Start testing

```powershell
npm ci
$env:ZAO_WORKSPACE_NODE_URL = 'http://127.0.0.1:3381'
$env:ZAO_WORKSPACE_FEED_NODE_URL = 'https://haatz.quilibrium.com'
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open <http://127.0.0.1:3100/workspace/review> for the reader, or
<http://127.0.0.1:3100/workspace> for the directory. The enriched v2 channel API and raw
thread node can be selected independently. Both overrides are optional; without
them the workspace uses `https://haatz.quilibrium.com`. The separate public
feed override avoids an observed listing/index issue in the older local node.
A deployed preview must
use a node URL reachable from its server; localhost on Vercel is not your PC.
Never expose the node's administrative interfaces to make this work.

## Test these workflows

1. Review the community and open a conversation. Refresh or load more posts.
   Check the source and timestamps; a successful read does not prove that the
   node includes every cast on every Farcaster fork.
2. Save a post, open My saved, and reload. Favorite a command and reload.
   These preferences are stored only in this browser, without account sync.
3. Choose Curate on a post. Add a reason after `!zao music —`, then preview.
   Reload while editing to verify that both the draft and reply target survive.
   Open Farcaster to review the outgoing reply under your own account.
4. Choose Give feedback and describe an idea or bug after
   `!zao-feedback idea —`. Preview it and open Farcaster. Publishing is an
   explicit action inside your Farcaster client; opening a composer is not a
   confirmed post. No feedback cast was published during automated testing.
5. Switch between Command and Cast to check separate drafts. Try `/music`,
   `/saved`, `/review`, `/curate`, `/feedback`, or search words. Unsupported
   slash commands produce an error. Search covers loaded posts only.
6. Test a narrow mobile screen. Disconnect the node and retry: show a clear
   failure while preserving saved posts and drafts.

## Scope and boundaries

This is a command-driven workspace, not an LLM agent yet. It does not generate
AI summaries, run arbitrary tools, or publish on behalf of an operator signer.
The public read endpoint accepts only bounded feed, pagination, and thread
parameters against a server-configured node. It does not accept target URLs.
Production rate limiting uses the app's existing Upstash configuration. Signer
authority checks are always enforced for production writes; browser mutations
also require a trusted origin. Mini App member sessions use verified QuickAuth.

Curation and feedback markers are a proposed convention, not a shared index.
There is no aggregation service or moderation queue for them yet. Music links
open their platforms; inline playback was not added in this pilot. A Mini App
can use the host composer; the standalone browser uses the external Farcaster
composer or Copy draft.

For Ohnahji to test remotely, create a deployment preview with the existing
app's production environment configuration and a reachable read-only node.
This branch does not deploy infrastructure or enable Tailscale Funnel.

## Validation

TypeScript checks passed. Focused workspace and navigation checks passed:
19 tests across five files. Browser checks covered real node reads, saves,
favorites, draft preview, feedback preparation, and 320/390px mobile layouts.

```powershell
npm run typecheck
npm test -- src/lib/workspace src/components/workspace src/app/api/workspace src/app/__tests__/navigation-targets.test.ts
```

The full suite passed 910 tests and failed 34 existing Windows path-dependent
tests: 33 shell-script tests and one visitor/member path assertion. These
failures are outside the workspace changes. `npm run build` compiled and passed
TypeScript, then stopped while collecting `/api/auth/kick` because this checkout
lacks `NEXT_PUBLIC_SUPABASE_URL`. A production preview requires the existing
app's normal secrets and service configuration; it has not been deployed.

## Next useful loop

### Development hydration compatibility

Theme startup now uses a nonce-bearing `next/script` before hydration. The
next-themes provider still manages theme changes, but its duplicate script is
an inert custom data block so React can remount it without the executable-script
warning. Five additional tests cover startup preferences and client remounts.

The audit found that old local service workers could mix cached development
JavaScript with fresh HTML. Development now removes ZAO's worker and its caches
while preserving browser saves and drafts. The temporary blocking-metadata
workaround was removed; Next.js uses its default metadata streaming behavior.

### Community testing

Run `npm run diagnose:workspace` to compare node heights, raw/enriched listings,
cursor lengths, and exact cast read-back. Run `npm run check:deployment` to
check missing/invalid configuration names without printing secret values.
The latter intentionally fails for local-only URLs and missing production keys.

See [the research report](HYPERSNAP-CLIENT-RESEARCH-2026-10-22.md) for measured
source differences, pinned client examples, and the implementation decisions.

The production service worker caches only build assets and the public offline
shell. Member HTML, API responses, and React Server Component payloads are
network-only. Device-local workspace saves and drafts survive logout.

Collect feedback from Zaal and Ohnahji, then implement a shared curation index
for the agreed comment format, account-synced saves, and a feedback review
queue. Add an agent backend only after defining its tools, data sources, and
which actions require a user-reviewed draft.
