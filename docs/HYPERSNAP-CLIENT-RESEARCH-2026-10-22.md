# Hypersnap clients and starred-repository research

Verified October 22, 2026. Read 150 starred-repository metadata records and selected the directly relevant public projects below. Private inventory and downloaded source snapshots stay under `.git/zao-research` and are not published. This is targeted research, not a security certification of those projects.

## Sources pinned for review

| Project / reviewed revision | License reported by GitHub | What ZAO can learn |
| --- | --- | --- |
| [ael-dev3/Allthing @ 62370ee6e237](https://github.com/ael-dev3/Allthing/blob/62370ee6e237b2de813624d603da2a7d811ea5ee/crates/allthing-data/src/hypersnap.rs) | AGPL-3.0 | Enriched channel reads; preserve multi-shard pages; explicit parent URLs. AGPL source used as research, not copied. |
| [artlu99/forkcaster_xyz @ b515c086ced1](https://github.com/artlu99/forkcaster_xyz/blob/b515c086ced11b53de7a49d69321547bc112e167/worker/cast-source.ts) | MIT | Validated provider results, cancellation, and explicit misses/errors; useful for a future cast resolver. |
| [wlplease/jackcast @ 62faed7d1263](https://github.com/wlplease/jackcast/blob/62faed7d1263edd0134c71c0ec03bf4f92144bb2/docs/SNAPCHAIN-LAB.md) | MIT | Selfcaster-derived, Neynar-backed client; bounded friend feeds and explicit host capabilities. The node lab is documentation, not its default deployed backend. |
| [GenuineJack/selfcaster @ e1735dcfe836](https://github.com/GenuineJack/selfcaster/blob/e1735dcfe836d30bd3166626cb7b929be911940d/README.md) | MIT | Personal single-operator deployment model; distinguish it from a multi-member community client. |
| [99darwin/farcaster-audio @ 7e7389d00658](https://github.com/99darwin/farcaster-audio/blob/7e7389d00658a4fd6918f7da28b2ccae434ebc9c/backend/app/services/user_signer_service.py) | MIT | Direct protocol writes and encrypted-at-rest per-user signer management; a different operational model from our delegated composer. |
| [QuilibriumNetwork/quorum-mobile @ 78ccc113d297](https://github.com/QuilibriumNetwork/quorum-mobile/blob/78ccc113d2976cf1c6e17c09a738495ab5eedd12/services/farcaster/channelUrlResolver.ts) | GPL-3.0 | Canonical channel parent URLs are identifiers; do not replace warpcast.com with farcaster.xyz by guessing. |
| [pierce403/quorum-desktop @ ef6ae1974b36](https://github.com/pierce403/quorum-desktop/blob/ef6ae1974b36bec9498e54850415a07e88723458/README.md) | AGPL-3.0 | Starred fork of QuilibriumNetwork/quorum-desktop; encrypted community messaging is separate from running a Hypersnap read node. |
| [danromero/farcaster-client-agent-guide @ 9bb051fcd0eb](https://github.com/danromero/farcaster-client-agent-guide/blob/9bb051fcd0eb2bc7446eb868c2b409d371a39832/README.md) | MIT | Community iOS launch runbook: prove the running checkout, distinguish credential-free onboarding from authenticated operation. |
| [farcasterxyz/client @ 0c289ed93c12](https://github.com/farcasterxyz/client/blob/0c289ed93c125cc0f752d90ad224a4a41c31c3f5/README.md) | MIT | Public native client snapshot; not a drop-in Next.js client or a ready configured backend. |
| [farcasterorg/hypersnap @ 2e8733d04414](https://github.com/farcasterorg/hypersnap/blob/2e8733d044141ad3ba0e0592a4d5873c1dc6ce9c/src/storage/store/account/cast_store.rs) | GPL-3.0 | Current source unions legacy/hyper indexes; compare the running build, not just its reported version. |
| [farcasterorg/hypersnap-docs-web @ 85fb17b4212f](https://github.com/farcasterorg/hypersnap-docs-web/blob/85fb17b4212fdb9a28ea1f01d656b6eed1d7b4ae/src/reference/reads/feeds.md) | No license metadata detected | Public v2 feed shapes and opaque cursors; managed signer provisioning is a separate capability. |

## What measurements changed our decisions

| Observation | Evidence / implication |
| --- | --- |
| Local and public nodes both report 0.13.5 and nearly equal shard heights. | At 21:06 UTC local heights were 48684234 / 49195693 / 49360433; public heights were 48684234 / 49195694 / 49360434. The node is ingesting; a channel-list problem is not proof of a stalled network sync. |
| Local raw and enriched channel listings stop at October 10. | Each returned 12 rows for the same canonical parent URL. Increasing raw page size did not expose the known new cast in the first page. |
| Public enriched channel listing reaches October 22. | It returned 23 casts and an 890-character cursor, while its legacy raw channel listing still stopped at October 10. Source/API behavior matters even on the same host. |
| Exact read-back finds the October 22 cast on both nodes. | FID 19640, hash `0xa0d52a201777a9a7656c290c0f1711a07eca77d7` is available from `/v1/castById` on both. This proves one omitted cast is present, not full-network completeness. |
| Local Docker image was created August 16 and has no revision label. | Image tag is `farcasterorg/hypersnap:latest`, but a tag is not evidence that the running image was refreshed. Reported version alone does not identify source contents. |
| Upstream changed read/index handling October 17. | [Commit 2e8733d](https://github.com/farcasterorg/hypersnap/commit/2e8733d044141ad3ba0e0592a4d5873c1dc6ce9c) contains client-facing feed/index fixes. It is a plausible explanation, not a verified provenance match for the local binary. |

Docker Hub's public `farcasterorg/hypersnap:latest` tag was also last updated
August 16, with digest `sha256:6b5e3a233e9ecd3197528502a4c5a2b7bb81a671b6936d048910b5a526c401e1`.
A blind `docker pull ...:latest` therefore does not obtain the October source
fixes. A pinned build or a verified newer release is a maintenance task, not a
reason to restart or reindex an 800 GB database during client testing.
[Docker tag metadata](https://hub.docker.com/v2/repositories/farcasterorg/hypersnap/tags/latest).

## Protocol and product boundaries

Farcaster/Snapchain supplies public identities and signed social messages.
Hypersnap is a fork with a compatible read surface and additional behavior;
compatibility does not prove identical indexes or cross-fork delivery. Neynar
is an API/managed-signing service, not a replacement for all node state.
Quorum combines a social client with a distinct encrypted-messaging stack;
Quilibrium is underlying infrastructure, not an automatic feature unlocked by
running this read-node container. See the [Quilibrium FAQ](https://docs.quilibrium.com/docs/discover/FAQ/)
and the pinned Quorum source above. Encryption descriptions are upstream claims,
not a cryptographic audit performed here.

## Implemented decisions

1. Use an enriched v2 channel adapter with normalized hashes, typed post validation, newest-first sorting, explicit source labels, and a bounded 4 MB / 7-second read. Keep the raw node for direct/thread reads.
2. Keep the two sources configurable independently. Local `.env.local` selects the public channel API and the local raw node. A new Vercel project can omit both overrides to use the public source; never put this PC?s loopback URL into Vercel.
3. Preserve bounded multi-shard results instead of truncating to the requested per-shard page size. Accept opaque cursors up to 4096 characters. Live pagination returned 23 then 24 unique casts with no overlap.
4. Enforce fresh signer checks in production, bind only approved signers for the same FID/UUID, and preserve bindings when provider lookup is unavailable. Follow and unfollow use the documented `FOLLOW_USER` / `UNFOLLOW_USER` scopes.
5. Use server-verified QuickAuth for member sessions. Unsigned context is display information only. Keep the public workspace independent of sign-in.
6. Refuse foreign-origin browser mutations, including cookie-authenticated requests in Mini Apps. The signed webhook receiver keeps its own signature verification.
7. Cache only immutable build assets and the explicit public offline shell. Do not cache APIs, member HTML, RSC responses, or foreign-origin data. Logout purges only ZAO caches and preserves local saves/drafts.

## What the research does not justify

- A Hypersnap read API is not Neynar managed-signer provisioning. [Hypersnap documents those creation endpoints as 501](https://hypersnap.org/docs/reference/reads/signers). Our read adapter does not redirect signer requests to Hypersnap.
- Neynar enrichment can improve a view or signer workflow; it does not guarantee writes propagate across forks, restore missing protocol indexes, or unify encrypted messaging systems.
- Juke and Selfcaster describe custody/recovery-phrase onboarding flows. ZAO is not adopting those flows; the current composer keeps publication under user control.
- Quorum?s encrypted messaging and Quilibrium infrastructure are separate services and identity/key lifecycles. Owning a Hypersnap read node alone does not enable those features.
- No upstream source was vendored or copied into the app. The implementations here are ZAO-specific adapters and checks; licenses remain recorded before any future code reuse.

## Next features, ordered by what we can prove

1. Run the source diagnostic and deployment preflight before promising freshness or production readiness.
2. Add a shared curation index for the agreed comment format, keyed by cast hash + curator FID, with withdrawals, duplicates, moderation, and source timestamps. This requires the chosen database and an explicit curator policy.
3. Add a feedback review queue driven by real feedback casts, preserving links and distinguishing suggestions from agent instructions.
4. Add per-account synchronized saves only after authentication and storage isolation are tested.
5. Add a read-only agent tool layer over these typed sources, with source links and human review before opening any write action. Do not treat public casts as tool instructions.
6. Evaluate audio spaces with Juke and encrypted community chat with Quorum as separate integrations, after key custody, hosting, permissions and costs are reviewed.

## Operations and verification still needed

- Plan a node maintenance window to identify/pin the image, compare release/schema compatibility, stop cleanly, back up configuration and a recoverable database snapshot, and verify read/index behavior before/after any upgrade. No node image was replaced and no RocksDB files were modified during this work.
- Supply production Supabase, Neynar, session/app signing, Upstash, and app-domain configuration. The preflight reports missing names only. No credentials were invented or copied from an unrelated project.
- Test real Mini App authentication, signer approval/revocation, same-origin writes and logout on the deployed domain with a test account. Current signer tests use mocked provider answers; no user cast or transaction was sent.
- Scheduled posting still needs a dedicated review of atomic job claims, duplicate prevention, crash recovery, and cross-post failure handling before relying on it as a background publishing service. This pass does not certify every legacy route.

## Verification for this implementation

- TypeScript checks pass. All 238 selected tests across 22 files pass. These cover channel normalization and
  membership, multi-shard preservation, long cursors, signer status/FID checks,
  scoped follows, production authority enforcement, QuickAuth selection,
  foreign-origin requests, offline data isolation, logout behavior, and visitors.
- Live source checks observed the October 22 UTC cast by exact hash on both
  nodes. The workspace returned 23 recent casts, then 24 additional unique
  casts with no overlap; their cursors were 890 and 894 characters.
- Browser checks displayed 23 cards and the explicit public source label with
  no console errors. The newest UTC timestamp displays October 21 in the local
  America/New_York timezone; that is the same post, not another freshness bug.
- A real unauthenticated foreign-origin POST to the logout endpoint was refused
  by middleware with 403 and `Cache-Control: private, no-store`.
- Production credentials, a full deployment, genuine signer writes, and
  production offline behavior across account switches remain live acceptance
  checks. The preflight correctly reports this checkout as not deployment-ready.

## Primary documentation

- [Hypersnap feeds](https://hypersnap.org/docs/reference/reads/feeds): data shapes, cursors, and compatibility-only feed modes.
- [Hypersnap signers](https://hypersnap.org/docs/reference/reads/signers): on-chain events versus managed-signer APIs.
- [Neynar signer status](https://docs.neynar.com/reference/lookup-signer): FID, status, permissions, and API-key pairing.
- [Farcaster QuickAuth](https://miniapps.farcaster.xyz/docs/sdk/quick-auth): verified JWT authentication.
- [Snapchain casts API](https://snapchain.farcaster.xyz/reference/httpapi/casts): exact cast lookup and parent queries.
- [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): origin checks and Fetch Metadata.
- [Vercel secret variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables): deployment secret handling.
