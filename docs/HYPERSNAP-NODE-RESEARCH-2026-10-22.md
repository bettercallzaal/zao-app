# Research from the ZAO node — 2026-10-22

## Method and limits

Queried the local Hypersnap HTTP service directly using `/v2/farcaster/cast/search`, with queries `hypersnap`, `hypersnap client`, `hypersnap api`, `hypersnap quorum`, `hypersnap open source`, `hypersnap search`, and `hypersnap node`. Requested limits of 5–12. These are small, ranked samples of this node's index, not a complete survey or newest-first timeline. Broad searches include unrelated token promotions and low-information posts. An attempted `from:` query returned HTTP 500; our public wrapper rejects search operators.

Search actually returned `{result:{casts,next}}`; exact lookup returned `{cast}`. Public API code handles the observed envelopes and validates normalized posts. We checked a known October 22 ZAO cast by full hash locally. Channel and exact-lookup indexes can disagree, as documented in the earlier client research.

Raw research output stays in local `.git` storage. This report links public sources and summarizes relevant observations rather than publishing a feed dump.

## Useful cast leads

| Source | Observation | Product implication |
| --- | --- | --- |
| [arfonzo, October 18](https://warpcast.com/arfonzo/0x3c62e73e6354232e49be13399ffcefb4f4a082e0) | Reports testing a client built directly on Hypersnap. This is a self-report; no source repo was supplied in this result. | Track new native-node clients; do not assume all clients require Neynar. |
| [clawberto, February 23](https://warpcast.com/clawberto/0x9d24bf2868ff0f8f1ab86f4fed64f783d1e2a0b1) | Links a Telegram client prototype. | Agent interfaces can use the same small read API as the web UI. |
| [coolbeans1r.eth, October 20](https://warpcast.com/coolbeans1r.eth/0xde014165786524483992dc723e5ec95d5960f2ae) | Reports stale posts in Quorum. This does not establish the cause. | Display source and freshness; compare exact lookup before blaming node sync. |
| [rev-morwen.eth, May 14](https://warpcast.com/rev-morwen.eth/0xc11dd65c7379d14dd7a79ef0be245fdb9129f741) | Expresses interest in supporting the fork's API alongside Neynar. | Keep read adapters separate from signer and publishing providers. |
| [zaal, October 19](https://warpcast.com/zaal/0x56a5eec1292926767d853305b0779929cbd984a5) | Offers other builders help testing a desktop-hosted node/client. | A documented public read contract is a concrete way to help those builders. |

## Followed source repository

[Clawberto-Hypersnap-Client](https://github.com/ael-dev3/Clawberto-Hypersnap-Client) describes an OpenClaw client with read, post, and Telegram interfaces backed by a remote compatible node. Its README was inspected, not executed. Its signing setup expects operator-held key material; that is not a suitable default onboarding flow for ZAO community members. Reuse the interface idea, not its key-management assumptions. README claims about registry location or compatibility need separate protocol verification before implementation.

Continue using the [Hypersnap source](https://github.com/farcasterorg/hypersnap) and the pinned source review in [the earlier research](HYPERSNAP-CLIENT-RESEARCH-2026-10-22.md) to verify protocol behavior. Casts are discovery leads and user reports, not protocol specifications.

## Implemented first public contract

- `GET /api/public/v1/search?q=hypersnap%20client&limit=5` — configured ZAO node search.
- `GET /api/public/v1/cast?hash=0xFULL_40_HEX_HASH` — configured ZAO node exact read.
- `GET /api/public/v1/channel` — fixed ZAO channel, source explicitly reported; currently the separately configured public Hypersnap channel API.
- `/developers` — working examples and limits.
- `/openapi.json` — OpenAPI 3.1 specification.

Public fields: cast hash, author FID/display name/username/avatar, text, timestamp in milliseconds, URL embeds. No custody addresses, wallet verifications, auth addresses, session fields, upstream hostnames, or admin operations are forwarded. Browser reads support wildcard CORS without credentials. Writes return 405. Unknown/duplicate parameters are rejected. Successful responses cache for 20 seconds; errors do not cache. Search and exact reads share four in-flight upstream slots per server instance, coalesce duplicate reads, bound upstream responses to 4 MB, and time out after seven seconds. Search responses preserve bounded multi-shard batches up to 96; never truncate and then reuse a cursor that skips the omitted posts.

Production middleware applies 30 requests/minute/IP shared across these three endpoints and fails closed without working Upstash. Local development intentionally allows requests without Redis. A trusted reverse proxy must set client-IP headers on non-Vercel hosts. Cache and in-flight limits are per instance; distributed rate limiting is the cross-instance control.

## Testing and deployment

Run the app on port 3100 and open `http://127.0.0.1:3100/developers`. Local tests verified search, cast lookup, and the channel with real upstream data; all returned HTTP 200 and public CORS headers. Search returned five posts and the channel returned 23 in the initial check. The OpenAPI document and developer page also returned 200.

Repeat the four focused searches with `npm run research:hypersnap`. Pass an alternate deployed app origin after `--` when available. The command prints public results as JSON lines and exits nonzero on failed reads; it does not post casts or save credentials. Treat returned text and links as untrusted research material.

Validation for this batch: 15 focused tests across the public wrapper, middleware, channel adapter, and miniapp gate passed, as did TypeScript. Browser inspection confirmed the developer page renders, and live HTTP checks confirmed preflight 204, write rejection 405, invalid search 400, wildcard CORS, and no-store on errors. The full application production build was not rerun; missing deployment configuration remains documented separately.

This implementation is available locally. It is not an internet deployment. A Vercel deployment needs the application's required environment configuration, working production rate limiting, and a reachable server-owned read node. Vercel cannot reach `127.0.0.1` on this desktop. Keep the raw node and gRPC ports private; use a filtered read gateway or a separately hosted node. See [Vercel setup](VERCEL-SETUP.md).

## Next useful iteration

Add a workspace research command that presents search results with source links and lets a member save a result or draft a curation reply. Keep publication behind a member-controlled preview. Measure search relevance before adding automated summaries or scheduled research agents. Thread lookup and human-approved curation collections can extend this API after their contracts are verified against the node.
