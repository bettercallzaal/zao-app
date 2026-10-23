# ZAO Client: a client of clients

Reviewed October 22, 2026. This batch changes `/` and `/workspace` into a public application directory. The earlier community reader remains at `/workspace/review`; the read API and `/developers` remain available. Directory use needs no wallet, login, or node connection. The full app's deployment requirements remain separate.

## Research approach

Followed public project websites, first-party repositories, older ecosystem lists, and casts queried through the ZAO node. Queried `opencaster`, `opencast`, `felirami client`, `felirami`, `Network School`, and related terms. Node search is ranked, incomplete, and spam-prone; a token deployment sharing an app's name is not evidence about the app. An empty search result does not prove an app is absent.

The checked-in catalog is [catalog.ts](../src/lib/directory/catalog.ts). Each listing has source links, a review basis, a purpose, pros, tradeoffs, and the shared review date. Editorial judgments are distinguished from observed or documented features. Source review does not imply installation, security certification, successful sign-in, or verified posting. No upstream code was copied into the implementation.

## Requested clients and important distinctions

| Project | Primary links | What we established | What remains unverified |
| --- | --- | --- | --- |
| Forkcaster | [Website](https://forkcaster.xyz), [source](https://github.com/artlu99/forkcaster_xyz) | Public cast rendering and a registry of outbound client links; its source documents different provider coverage. | All providers and deep links across devices. |
| Jackcaster | [Project](https://github.com/wlplease/jackcast) | A separately maintained Selfcaster fork. README says the maintainer's instance is private and users should deploy their own copy. Default integration uses Neynar; its Snapchain lab is separate. | A fresh personal deployment and real signer onboarding. |
| OPENCASTER | [Preview](https://try-opencaster.vercel.app) | An accessible page with feed/discovery UI and sample-style posts and counts. | Maintainer, public source, live protocol data, authentication, and writes. Listed as an unverified preview, not a proven working client. |
| Opencast | [Archived source](https://github.com/stephancill/opencast) | Stephancill's earlier self-hosted, Hub/lazy-indexer-based client. GitHub marks it archived on August 28, 2025. | Modern Snapchain compatibility and any current maintained deployment. Do not conflate it with OPENCASTER. |
| Castline | [Hosted entry](https://castline-eight.vercel.app), [Felirami's own listing](https://www.felirami.com/) | Felirami identifies Castline as a terminal-first MVP with feed reading, composing, snapshots, a signer-backend path, and Neynar integration. | The app could not be fetched in this review; current source and account workflows were not verified. |
| Quorum | [Website](https://www.quorummessenger.com/), [web beta](https://app.quorummessenger.com/), [mobile source](https://github.com/QuilibriumNetwork/quorum-mobile), [desktop source](https://github.com/QuilibriumNetwork/quorum-desktop) | An open-source messaging ecosystem with Farcaster integration visible in mobile source. | Release parity, live messaging/security properties, and Farcaster onboarding across devices. |
| Juke | [Website](https://juke.audio), [source](https://github.com/99darwin/farcaster-audio), [integration reference](https://juke.audio/llms.txt) | Live-audio product with a social feed and developer surfaces. See the focused comparison below. | Production participation, account authorization, recording, and audio behavior with real members. |

The initial 21 listings also include Farcaster, Allthing, Quilcast, herocast, Recaster, Yup, Selfcaster, Bountycaster, Clawberto, Neynar, Hypersnap, Web3.bio, Supercast, and nounspace. This is a curated starting set, not a claim to list every Farcaster application.

## Quorum and Juke: different community needs

| Question | Quorum | Juke |
| --- | --- | --- |
| Why ZAO might use it | Persistent community messaging and social exploration. | Listening sessions, live artist conversations, and audio participation. |
| Architecture | Mobile, desktop/web, and shared protocol packages; messenger and social layers have separate identity/key concerns. | Social data through Hypersnap, audio through LiveKit; its developer reference describes hosted embeds and API integration. |
| Lowest-friction next evaluation | Inspect the web beta and mobile release separately; verify which social features each actually exposes. | Evaluate anonymous listening first; participation is a separate authenticated path. |
| Account boundary | Do not treat a messenger key, a Farcaster signer, and a custody key as interchangeable. | Ordinary-web authorization is documented as a first-party recovery-phrase linking step; Mini App authentication has a separate host-wallet flow. These are upstream descriptions, not tested guarantees. |
| Publishing/permissions | Confirm current signer approval and revocation on the chosen release. | Listening does not grant speaking; host promotion and microphone permission are separate. |

Quorum's mobile source includes a [canonical channel resolver](https://github.com/QuilibriumNetwork/quorum-mobile/blob/main/services/farcaster/channelUrlResolver.ts): legacy `warpcast.com` channel parent URLs are opaque protocol identifiers, not ordinary links to rename. Its [signer lifecycle hook](https://github.com/QuilibriumNetwork/quorum-mobile/blob/main/hooks/useHypersnapSignerLifecycle.ts) is another useful implementation lead. Neither proves every desktop release supports the same social features. Encryption descriptions are project claims, not an audit performed here.

For Juke, anonymous hosted listening is the most useful low-commitment community trial. Its current integration reference says ordinary embeds need no developer keys, while custom protected integrations do. ZAO's directory only links out; it does not collect phrases, connect accounts, join rooms, request microphone access, or publish casts.

## History and source discipline

The timeline uses [Dan Romero's early project account](https://danromero.org/farcaster/), [Varun Srinivasan's January 2022 design essay](https://www.varunsrinivasan.com/2022/01/11/sufficient-decentralization-for-social-networks), [the permissionless-registration announcement](https://danromero.org/farcaster-permissionless/), [the Frames v2 discussion](https://github.com/farcasterxyz/protocol/discussions/205), [Snapchain's project changelog](https://github.com/farcasterxyz/snapchain/blob/main/CHANGELOG.md), [Neynar's January 21 acquisition announcement](https://neynar.com/blog/neynar-is-acquiring-farcaster), and [Hypersnap source](https://github.com/farcasterorg/hypersnap).

The October 2026 operator change is linked to [Rish's announcement](https://farcaster.xyz/rish/0x5d479754), with [The Block's October 15 reporting](https://www.theblock.co/news/ecosystems/2026-10-15-network-school-acquires-farcaster-from-neynar-418720) for context. The announcement's public preview was accessible once but later fetches were inconsistent. The directory presents it as an announced acquisition, not a claim that all operational transfers or policies are independently verified. Do not describe the January acquisition as proof of the current operator.

Earlier ecosystem lists are discovery leads. The former Supercast domain currently redirects to a domain-sale page, and nounspace.com redirects to nouns.wtf. Those projects are retained as historical entries with source links; the directory does not offer the unrelated destinations as working app launch links. A redirect alone is not proof that every fork or deployment has shut down.

## Product behavior

- Search name, purpose, platform, service, strengths, and tradeoffs; filter by client, specialist app, builder tool, or history.
- Compare up to three listings in a compact table.
- Open outbound links explicitly; no third-party frames or automatic account connections.
- Feedback opens an editable `!zao-feedback directory` draft in Farcaster. Nothing is automatically posted or stored in a review database.
- Source details and review dates remain visible, with clear notes for unverified previews, MVPs, archived repositories, and operator-specific restrictions.

Future additions should identify the canonical project, check redirects and repository state, record primary evidence and unknowns, then add the listing. Avoid automated claims of app health based only on HTTP 200 or documentation availability.

## Validation

TypeScript passed. Seven focused UI/auth-gate tests passed, covering search, archive/preview distinctions, private-instance project links, a three-app comparison limit, human-controlled feedback drafts, and public Mini App access. Browser review confirmed 21 listings, responsive desktop and 390-pixel layouts without horizontal overflow, and no console errors in the inspected session. The homepage no longer requires a session lookup to render the directory. No account was connected and no cast was published. The full production build/deployment was not performed in this batch.
