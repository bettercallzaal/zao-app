# Community workspace pilot

The pilot lives at `/workspace` in `bettercallzaal/zao-app`, on branch
`feat/agent-workspace`. It provides a central Command/Cast input, favorite
commands, public ZAO posts, conversation review, local saves, and editable
curation and feedback drafts.

## Start testing

```powershell
npm ci
$env:ZAO_WORKSPACE_NODE_URL = 'http://127.0.0.1:3381'
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open <http://127.0.0.1:3100/workspace>. The node override is optional: without
it the workspace uses `https://haatz.quilibrium.com`. A deployed preview must
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
Production rate limiting uses the app's existing Upstash configuration.

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

Collect feedback from Zaal and Ohnahji, then implement a shared curation index
for the agreed comment format, account-synced saves, and a feedback review
queue. Add an agent backend only after defining its tools, data sources, and
which actions require a user-reviewed draft.
