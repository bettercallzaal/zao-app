# Vercel configuration handoff

Import `bettercallzaal/zao-app`, root `.`, Next.js, production branch `main`.
No Vercel deployment has been created or configured by this work.

## Required values

Use the variable names in `.env.example`. The existing full app still requires
Supabase URL/service-role credentials, Neynar API/client credentials, a strong
session secret, and the app FID/signing key at build or runtime. Production API
rate limiting also requires the Upstash URL/token.

Set `NEXT_PUBLIC_APP_URL` to the deployed app's HTTPS origin and
`NEXT_PUBLIC_SIWF_DOMAIN` to the matching hostname, without `https://`. Verify
Farcaster/Neynar allowed domains and the Mini App manifest for that deployment.
Root metadata and Mini App launch links now use `NEXT_PUBLIC_APP_URL`. Other
legacy surfaces still contain `zaoos.com` defaults; importing a repo does not
migrate domain registrations or database policies.

Keep service-role, API, session and app-signing values server-only. Never add
`NEXT_PUBLIC_` to them. Add production values as secret variables in Vercel;
do not send them through chat or commit them to Git. Existing app-signing
credentials must belong to the configured app FID. Do not generate an arbitrary
key and assume that it controls an existing FID.

## Public reads

Omit `ZAO_WORKSPACE_NODE_URL` and `ZAO_WORKSPACE_FEED_NODE_URL` in Vercel to use
the public Hypersnap source. A Vercel function cannot reach your PC's
`127.0.0.1:3381`. A future private-node connection needs a deliberately hosted,
restricted read gateway reachable by the server; never expose raw node/admin
ports to make a deployment pass.

Locally, the ignored `.env.local` created during this work contains only the
local raw node URL and public enriched feed URL. It contains none of the
required Supabase/Neynar/session/app-signing/Upstash secrets.

## Check before deploying

```powershell
npm run check:deployment
npm run diagnose:workspace
```

The deployment checker loads `.env.local` on Node 22 and prints only missing
or invalid variable names. It never prints values. A successful check proves
presence and basic format, not credential validity or correct service policies.
The current local checkout is intentionally not production-ready until actual
credentials and domain settings are supplied.

The earlier production compile passed; an earlier full build stopped on a
missing Supabase URL. Do not invent placeholder credentials to declare a build
or deployment verified.

## Acceptance on the deployed domain

1. Open `/workspace`, verify the source label, latest timestamp and pagination.
2. Verify Upstash actually limits requests and an outage fails closed.
3. Sign in with a test member account using SIWF and, in a real host, QuickAuth.
   Verify a visitor cannot bind a signer or write.
4. Approve a test signer; test ownership, permissions, revocation, and provider
   failure. Production always rechecks authority before an app-managed write.
5. Confirm foreign-origin browser writes receive 403 while same-origin requests
   inside a legitimate Mini App iframe work. Webhooks still require signatures.
6. Sign out, switch accounts, and test offline mode. Never display the previous
   member's page/API data. Local workspace saves remain device data, not synced
   account records.
7. Confirm response metadata, manifest, callbacks, and external composer links
   point where intended. This check matters when using a new Vercel domain.

General API functions allow 30 seconds for signer-check-plus-write workflows;
the existing auth verification override remains 10 seconds. Workspace reads
retain a separate 7-second upstream budget.

Reference: [Vercel secret variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).
