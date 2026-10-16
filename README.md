# zcaster

zcaster is a lean public Farcaster client for The ZAO. It has the ZAO feed, casting, replies, and the song player that plays music inside casts.

It is extracted from [bettercallzaal/ZAOOS](https://github.com/bettercallzaal/ZAOOS), the ZAO lab monorepo, using `git filter-repo` so the history of the kept files (and their credit) is preserved. ZAOOS stays the lab. zcaster is the portable client.

## v1 scope

Included:

- Farcaster sign-in (Farcaster auth kit and managed signer)
- The channel feed, casting, and replies
- The song player and music cards inside casts
- Notifications, settings, and the miniapp entry pages

Left out on purpose:

- Direct messages and XMTP
- Wallet login, RainbowKit, wagmi, and Solana
- Hats, Respect, and governance proposals
- Cross-posting and publishing to other platforms

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values yourself
npm run dev
```

Variable names are listed in `.env.example`. Values are never committed. The app throws at startup if a required name is missing (see `src/lib/env.ts`).

Useful scripts: `npm run build`, `npm run typecheck`, `npm run test`, `npm run lint:biome`.

## License

MIT. See [LICENSE](./LICENSE).

Credit: extracted from ZAOOS by Zaal Panthaki / The ZAO. Code written in ZAOOS keeps its original commit history in this repository.
