# Mobile plan: The ZAO app on TestFlight

Status: prepared, not built. Written 2026-10-25. Nothing here has touched Apple, App Store Connect or EAS. Those steps need Zaal's own credentials and are listed at the end as gated.

## Decision

**Use an Expo shell (`apps/mobile`) with three native screens that read public data. Do not wrap the Next app in Capacitor.**

| Option | What it means here | Verdict |
|--------|--------------------|---------|
| Capacitor, static export | `output: 'export'` and ship the HTML in the binary | Not possible. The app has 71 API route files, iron-session cookie auth, and server components that call `redirect()` and `notFound()` (for example `src/app/feed/page.tsx`). A static export drops all of that. |
| Capacitor, remote URL | A WebView pointed at the deployed site | Works for TestFlight internal testing, but it is a website in a frame. App Review guideline 4.2 (minimum functionality) is the usual rejection for that shape, so it is a dead end for any later public listing. Farcaster sign-in and session cookies inside WKWebView also need their own testing. |
| **Expo shell** | A small React Native app that calls the deployed API over HTTP | **Pick.** See reasons. |

Reasons for Expo:

1. **The playbook is Expo.** `bettercallzaal/expo-testflight-playbook` and ZAOOS doc 966 record WaveWarZ DJ Wavy going from mock app to TestFlight in one day (2026-07-03, 7 builds). Every gotcha in it is an Expo gotcha we already paid for. Doc 966's own next action is "ZAO app kickoff reuses this playbook".
2. **EAS builds in the cloud.** No local Xcode is needed for the release path. This machine is often under heavy load, and a cloud build keeps that off it.
3. **The API boundary already exists.** `src/app/api/public/v1/*` is a public read API with `Access-Control-Allow-Origin: *`, parameter allowlists and a 20 second cache (`src/lib/workspace/public-api.ts`). A native client is just another caller.
4. **The old Capacitor shell went nowhere.** ZAOOS doc 2691 (graduation map) lists ZAOOS's `android/` and `ios/` Capacitor folders as dead code for deletion: 0 files in `src/` import `@capacitor`, 0 commits in 60 days. Doc 416 (April 2026) had recommended Capacitor 8; that recommendation assumed a static export, which this app cannot do.

Cost of the pick: the three screens are written again in React Native rather than reused from the web. For three read-only screens that is small, and it is the price of a real native app.

## Phone screens (v0)

All three are read-only and need no sign-in.

| Screen | Data | Notes |
|--------|------|-------|
| Feed | `GET {API_BASE}/api/public/v1/channel` | Same normalized posts as the web workspace feed. Cursor paging. **Measured 2026-10-25: `https://zaoos.com/api/public/v1/channel` returns 404**, so the deployed site does not serve this route yet. The screen shows a clear error until the deploy that carries it is live, or `EXPO_PUBLIC_ZAO_API_BASE` points at a deploy that does. |
| Music | Audius public API (`api.audius.co/v1/resolve`, then playlist tracks), the same three public playlists as `community.config.ts` `music.radioPlaylists` | The web `/api/music/radio` route needs a session (401 without one), so the phone reads Audius directly. Playback uses `expo-audio`. |
| Estate | A bundled, hand-written list of public ZAO surfaces (`apps/mobile/src/lib/estate.ts`), each checked with a plain HTTPS request from the phone | **Placeholder and public-only.** It never calls `127.0.0.1:7477`, the vault, or any private host. A test (`scripts/mobile-estate.test.ts`) fails CI if the list ever holds a loopback, private-range, `.local` or non-HTTPS address, or the words "vault" or "7477". |

Sign-in, casting, notifications and the player inside casts stay web-only for v0. Farcaster sign-in on native is its own piece of work (deep-link scheme, redirect allowlist; playbook bug 3).

## Layout

```
apps/mobile/           Expo app, its own package.json, not part of the web build
  App.tsx              three-tab shell
  app.json             bundle id, ITSAppUsesNonExemptEncryption: false (playbook Phase 1)
  eas.json             production profile, autoIncrement, public env baked in (playbook pitfall 1)
  src/screens/         FeedScreen, MusicScreen, EstateScreen
  src/lib/             api.ts, audius.ts, estate.ts, theme.ts
scripts/mobile-estate.test.ts   guard on the estate list, runs in the root vitest
```

The web app is unaffected: `tsconfig.json` already excludes `apps`, biome only includes `src/**` and `scripts/**`, and `scripts/vercel-ignore.sh` has no `apps/` build path, so a mobile-only change does not spend a Vercel build. The root `npm ci` in CI does not read `apps/mobile/package.json`.

## Dependencies (ask-first)

`apps/mobile/package.json` names these. None is installed by this PR and there is no lockfile yet; installing is the first step after approval.

| Package | Version | Why |
|---------|---------|-----|
| `expo` | `~58.0.19` | SDK 58, `latest` on npm on 2026-10-25 |
| `react` | `19.3.0` | Version pinned by `expo@58.0.19` `bundledNativeModules.json` |
| `react-native` | `0.88.0` | Same source |
| `expo-audio` | `~58.0.10` | Music playback |
| `expo-status-bar` | `~58.0.4` | Status bar style |
| `typescript`, `@types/react` (dev) | see file | Typecheck. `npx expo install --fix` aligns these to the SDK. |

## Steps to the first TestFlight build

Prepared (this PR):

1. Expo app scaffold, three screens, `app.json`, `eas.json` with no secrets in either.
2. Estate guard test in CI.

Gated, Zaal only (each needs his Apple ID, App Store Connect or Expo account; credentials go through `/secret`, never a file or a chat):

1. Approve the dependencies above. Then `cd apps/mobile && npm install && npx expo install --fix && npx expo-doctor`.
2. Confirm the bundle id. `app.json` has `com.thezao.app` as a placeholder; it is permanent once the App Store Connect record exists.
3. Apple Developer Program membership (playbook Phase 0; $99/yr Individual is a spend and is Zaal's call).
4. `npx eas-cli login` and `npx eas-cli init` in a real terminal. `init` writes `extra.eas.projectId` into `app.json`.
5. First build, interactive: `npx eas-cli build -p ios --profile production` (Apple sign-in, 2FA, generated certificate and profile).
6. First submit, interactive: `npx eas-cli submit -p ios --latest`. Then put the numeric `ascAppId` into `eas.json`.
7. Internal testers only (App Store Connect team members). No external testers and no public listing without a separate decision.

Before step 5, point `EXPO_PUBLIC_ZAO_API_BASE` in `eas.json` at a deploy where `/api/public/v1/channel` returns 200, or the Feed tab ships empty. That is the playbook's first pitfall: EAS uploads respect `.gitignore`, so a value in `.env.local` never reaches the build.

## Sources

- [bettercallzaal/expo-testflight-playbook](https://github.com/bettercallzaal/expo-testflight-playbook), MIT License, by Zaal Panthaki. Phases 0 to 4, the eas.json and app.json fields, and the native-vs-web bugs.
- ZAOOS research doc 966, `research/infrastructure/966-expo-testflight-playbook` (ZAOOS PR #1077, merged). MIT, same repo license as ZAOOS.
- ZAOOS research doc 2691, `research/infrastructure/2691-zaoos-graduation-map-2026-10` (revisions in ZAOOS PRs #4051 and #4053). The Capacitor shell verdict.
- ZAOOS research doc 416, `research/infrastructure/416-native-app-testflight-playstore`. The earlier Capacitor recommendation and its static-export premise.
- [Expo `bundledNativeModules.json` for expo@58.0.19](https://unpkg.com/expo@58.0.19/bundledNativeModules.json), read 2026-10-25, for the React and React Native versions.
- [Audius API](https://docs.audius.co/developers/api), public, no key, `app_name` parameter.
