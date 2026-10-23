export type Category = 'Clients' | 'Specialist apps' | 'Build & explore' | 'History';
export interface DirectoryApp {
  id: string;
  name: string;
  category: Category;
  tagline: string;
  fit: string;
  platforms: string;
  network: string;
  basis: 'Website reviewed' | 'Source reviewed' | 'Historical listing';
  url?: string;
  sources: { title: string; url: string }[];
  pros: string[];
  cons: string[];
}

export const REVIEW_DATE = '2026-10-23';
export const CATEGORIES: Category[] = ['Clients', 'Specialist apps', 'Build & explore', 'History'];
const repo = (name: string) => ({ title: 'Project source', url: `https://github.com/${name}` });
const site = (url: string) => ({ title: 'Product website', url });
const awesome = {
  title: 'Earlier ecosystem directory',
  url: 'https://github.com/a16z/awesome-farcaster',
};

export const APPS: DirectoryApp[] = [
  {
    id: 'farcaster',
    name: 'Farcaster',
    category: 'Clients',
    tagline: 'The flagship app, previously called Warpcast.',
    fit: 'A familiar starting point for the Farcaster ecosystem.',
    platforms: 'Web · iOS · Android',
    network: 'Farcaster',
    basis: 'Website reviewed',
    url: 'https://farcaster.xyz',
    sources: [
      site('https://farcaster.xyz'),
      { title: 'October 2026 handoff announcement', url: 'https://farcaster.xyz/rish/0x5d479754' },
    ],
    pros: [
      'An established entry point for accounts and social discovery.',
      'Web and mobile access with an integrated app ecosystem.',
    ],
    cons: [
      'The operator’s app policies govern access to its interface.',
      'An app account, protocol identity, and access to other clients are different things; read the current terms.',
    ],
  },
  {
    id: 'allthing',
    name: 'Allthing',
    category: 'Clients',
    tagline: 'An independent browser client backed by Hypersnap.',
    fit: 'Reading publicly, then trying an alternative posting interface.',
    platforms: 'Web',
    network: 'Hypersnap reads & writes',
    basis: 'Source reviewed',
    url: 'https://allthing.social',
    sources: [repo('ael-dev3/Allthing')],
    pros: [
      'Public reading without an account; threads, channels, and media.',
      'Documents browser signing, scheduling, and cast provenance.',
    ],
    cons: [
      'Writing requires approving a signer; protect the browser holding it.',
      'Features are documented upstream; end-to-end account flows were not tested by ZAO.',
    ],
  },
  {
    id: 'quilcast',
    name: 'Quilcast',
    category: 'Clients',
    tagline: 'A small browser client that talks directly to Hypersnap.',
    fit: 'Exploring a lightweight, open-source client.',
    platforms: 'Web',
    network: 'Hypersnap; separate Farcaster DM service',
    basis: 'Source reviewed',
    url: 'https://quilcast.com',
    sources: [repo('backmeupplz/quilcast')],
    pros: [
      'Documents feeds, search, multiple accounts, and Mini App hosting.',
      'Supports an external wallet route as well as local account setup.',
    ],
    cons: [
      'Signer keys live in browser localStorage; evaluate the key-management model.',
      'Direct messages use a separate service and are not end-to-end encrypted, per the project.',
    ],
  },
  {
    id: 'quorum',
    name: 'Quorum',
    category: 'Clients',
    tagline: 'A messenger ecosystem with Farcaster features in its mobile source.',
    fit: 'Community messaging alongside social exploration.',
    platforms: 'Mobile · web/desktop messenger',
    network: 'Quilibrium messaging · Farcaster/Hypersnap integration',
    basis: 'Source reviewed',
    url: 'https://www.quorummessenger.com',
    sources: [
      repo('QuilibriumNetwork/quorum-mobile'),
      repo('QuilibriumNetwork/quorum-desktop'),
      { title: 'Web messenger beta', url: 'https://app.quorummessenger.com/' },
    ],
    pros: [
      'Open-source mobile and desktop projects.',
      'Combines community messaging work with a mobile Farcaster integration.',
    ],
    cons: [
      'Messaging identity and Farcaster identity have separate key lifecycles.',
      'Feature parity varies by app and release; encryption claims are not a ZAO security audit.',
    ],
  },
  {
    id: 'herocast',
    name: 'herocast',
    category: 'Clients',
    tagline: 'Publishing tools for people managing more than one account.',
    fit: 'Community managers, teams, and frequent publishers.',
    platforms: 'Web · desktop',
    network: 'Farcaster; deployment/provider dependent',
    basis: 'Source reviewed',
    url: 'https://herocast.xyz',
    sources: [repo('hero-org/herocast')],
    pros: [
      'Documents multi-account management, scheduling, and analytics.',
      'Keyboard-oriented workflow and open-source desktop/web code.',
    ],
    cons: [
      'A publishing workspace may be more than a casual reader needs.',
      'Check current access, pricing, and provider configuration; hosted sign-in was not tested.',
    ],
  },
  {
    id: 'recaster',
    name: 'Recaster',
    category: 'Clients',
    tagline: 'A configurable client with lists and publishing controls.',
    fit: 'Organizing accounts, feeds, bookmarks, and scheduled casts.',
    platforms: 'Mobile',
    network: 'Farcaster',
    basis: 'Website reviewed',
    url: 'https://recaster.org',
    sources: [site('https://recaster.org')],
    pros: [
      'Advertises custom tabs, multiple accounts, and scheduled posts.',
      'Lists, bookmark folders, translation, and threaded replies.',
    ],
    cons: [
      'The current website emphasizes AI agents; check the experience that fits your needs.',
      'Store builds, posting permissions, and paid features were not independently tested.',
    ],
  },
  {
    id: 'castline',
    name: 'Castline by Felirami',
    category: 'Clients',
    tagline: 'A terminal-first Farcaster client MVP.',
    fit: 'People who prefer keyboard and terminal-style social workflows.',
    platforms: 'CLI/TUI · hosted web entry',
    network: 'Farcaster via Neynar, per builder’s site',
    basis: 'Website reviewed',
    url: 'https://castline-eight.vercel.app',
    sources: [{ title: 'Felirami’s project listing', url: 'https://www.felirami.com/' }],
    pros: [
      'The builder describes feed reading, composer flows, and snapshots.',
      'A useful alternative interface direction beyond the standard scrolling feed.',
    ],
    cons: [
      'Explicitly described as an MVP; the hosted app could not be fetched during review.',
      'Signer/backend behavior and a current public source repository have not been verified.',
    ],
  },
  {
    id: 'opencaster',
    name: 'OPENCASTER',
    category: 'Clients',
    tagline: 'An unverified Farcaster Mini App preview, distinct from Opencast.',
    fit: 'Exploring another interface concept; integration remains unverified.',
    platforms: 'Web preview',
    network: 'Farcaster integration unverified',
    basis: 'Website reviewed',
    url: 'https://try-opencaster.vercel.app',
    sources: [site('https://try-opencaster.vercel.app')],
    pros: [
      'The accessible preview shows a familiar feed and discovery layout.',
      'A concrete link for comparing the interface with other clients.',
    ],
    cons: [
      'Visible sample-style posts and counts do not establish a live protocol connection.',
      'Maintainer identity, current source, real sign-in, and writes were not verified.',
    ],
  },
  {
    id: 'yup',
    name: 'Yup',
    category: 'Clients',
    tagline: 'A multi-network social interface and crossposting tool.',
    fit: 'Sharing across Farcaster and other social networks.',
    platforms: 'Web · mobile',
    network: 'Farcaster · other social networks',
    basis: 'Website reviewed',
    url: 'https://yup.io',
    sources: [site('https://yup.io')],
    pros: [
      'Advertises crossposting and combined notifications.',
      'Useful when a community spans several networks.',
    ],
    cons: [
      'Each connected network has its own permissions and limitations.',
      'The website announces a thirdweb acquisition; current onboarding and integrations need an account-level check.',
    ],
  },
  {
    id: 'selfcaster',
    name: 'Selfcaster',
    category: 'Clients',
    tagline: 'An open-source Farcaster client you deploy for yourself.',
    fit: 'A technical user who wants a personal deployment.',
    platforms: 'Self-hosted web',
    network: 'Farcaster via Neynar',
    basis: 'Source reviewed',
    url: 'https://github.com/GenuineJack/selfcaster',
    sources: [repo('GenuineJack/selfcaster')],
    pros: [
      'A focused, single-owner deployment with source available.',
      'Documents deployment and server-side Neynar integration.',
    ],
    cons: [
      'You operate the deployment, password, API credentials, and updates.',
      'API usage may cost money; documented setup includes a sensitive recovery-phrase authorization step.',
    ],
  },
  {
    id: 'jackcaster',
    name: 'Jackcaster',
    category: 'Clients',
    tagline: 'A separately maintained personal fork of Selfcaster.',
    fit: 'A self-hosting user who wants additional feed controls.',
    platforms: 'Self-hosted web',
    network: 'Farcaster via Neynar by default',
    basis: 'Source reviewed',
    url: 'https://github.com/wlplease/jackcast',
    sources: [
      repo('wlplease/jackcast'),
      { title: 'Maintainer’s tour (private instance)', url: 'https://jackcast.vercel.app' },
    ],
    pros: [
      'Documents focused lists, feed controls, and optional digest tools.',
      'Includes a separate Snapchain node lab for builders.',
    ],
    cons: [
      'The maintainer’s live instance is private; deploy your own.',
      'The node lab does not mean the default app is node-backed; Neynar configuration is still required.',
    ],
  },
  {
    id: 'juke',
    name: 'Juke',
    category: 'Specialist apps',
    tagline: 'Live audio spaces with a Farcaster feed.',
    fit: 'ZAO listening sessions, artist conversations, and live community audio.',
    platforms: 'Web · iOS/Android beta',
    network: 'Hypersnap social data · LiveKit audio',
    basis: 'Source reviewed',
    url: 'https://juke.audio',
    sources: [
      site('https://juke.audio'),
      repo('99darwin/farcaster-audio'),
      { title: 'Audio and embed integration reference', url: 'https://juke.audio/llms.txt' },
    ],
    pros: [
      'Combines audio rooms with social browsing and threaded chat.',
      'Documents anonymous listening and public embeds without developer keys.',
    ],
    cons: [
      'A beta service with audio infrastructure dependencies.',
      'Ordinary-web participation documents recovery-phrase linking; Mini App host authentication is a separate flow.',
    ],
  },
  {
    id: 'forkcaster',
    name: 'Forkcaster',
    category: 'Specialist apps',
    tagline: 'A public cast reader and a bridge to other clients.',
    fit: 'Sharing a cast with someone who does not want to log in.',
    platforms: 'Web',
    network: 'Multiple Farcaster read providers',
    basis: 'Source reviewed',
    url: 'https://forkcaster.xyz',
    sources: [repo('artlu99/forkcaster_xyz')],
    pros: [
      'Renders cast links without requiring the Farcaster app.',
      'Its source includes a registry of links to other clients.',
    ],
    cons: [
      'A sharing/reading utility rather than a full publishing workspace.',
      'Read completeness and extra context depend on upstream providers.',
    ],
  },
  {
    id: 'bountycaster',
    name: 'Bountycaster',
    category: 'Specialist apps',
    tagline: 'Find and publish community work opportunities.',
    fit: 'Matching ZAO projects with contributors.',
    platforms: 'Web',
    network: 'Farcaster ecosystem',
    basis: 'Website reviewed',
    url: 'https://www.bountycaster.xyz',
    sources: [site('https://www.bountycaster.xyz')],
    pros: [
      'A focused place to discover and post bounties.',
      'Search and categories help organize opportunities.',
    ],
    cons: [
      'Not a general social client.',
      'Evaluate each offer, scope, and payment arrangement independently.',
    ],
  },
  {
    id: 'clawberto',
    name: 'Clawberto HyperSnap Client',
    category: 'Build & explore',
    tagline: 'An agent and Telegram client prototype.',
    fit: 'Developers exploring a conversational interface to public social data.',
    platforms: 'Developer-run · Telegram',
    network: 'Remote Snapchain-compatible node',
    basis: 'Source reviewed',
    url: 'https://github.com/ael-dev3/Clawberto-Hypersnap-Client',
    sources: [repo('ael-dev3/Clawberto-Hypersnap-Client')],
    pros: [
      'Shows an alternative to a conventional feed interface.',
      'Documents remote-node reads and bot interactions.',
    ],
    cons: [
      'A prototype requiring operator setup, not a turnkey community app.',
      'Writing depends on operator-held signer material and careful bot access controls.',
    ],
  },
  {
    id: 'neynar',
    name: 'Neynar',
    category: 'Build & explore',
    tagline: 'Hosted Farcaster APIs and developer tooling.',
    fit: 'Builders who want managed data and signer services.',
    platforms: 'APIs · developer dashboard',
    network: 'Farcaster',
    basis: 'Website reviewed',
    url: 'https://neynar.com',
    sources: [
      site('https://neynar.com'),
      { title: 'API documentation', url: 'https://docs.neynar.com' },
    ],
    pros: [
      'A documented hosted interface for building Farcaster applications.',
      'Can supply services a raw read node does not provide, including managed signing workflows.',
    ],
    cons: [
      'An infrastructure service, not a replacement social feed.',
      'Requires service credentials and plan/usage review; it does not guarantee cross-fork delivery.',
    ],
  },
  {
    id: 'hypersnap',
    name: 'Hypersnap',
    category: 'Build & explore',
    tagline: 'Open-source node software and indexed social APIs.',
    fit: 'Builders and communities who want to run or query a node.',
    platforms: 'Node · HTTP APIs',
    network: 'Snapchain-derived; verify fork and deployment',
    basis: 'Source reviewed',
    url: 'https://github.com/farcasterorg/hypersnap',
    sources: [
      repo('farcasterorg/hypersnap'),
      { title: 'Community portal', url: 'https://hypersnap.org/about' },
    ],
    pros: [
      'Open-source data infrastructure with enriched read endpoints.',
      'ZAO has verified local search and exact cast reads against its node.',
    ],
    cons: [
      'Running a node needs substantial disk space and maintenance.',
      'A node is not a consumer client; compatibility does not prove identical indexes, messaging, or delivery across forks.',
    ],
  },
  {
    id: 'web3bio',
    name: 'Web3.bio',
    category: 'Build & explore',
    tagline: 'Explore public profiles and linked identities.',
    fit: 'Finding the public identity behind a name or address.',
    platforms: 'Web',
    network: 'Farcaster · ENS · other identity systems',
    basis: 'Website reviewed',
    url: 'https://web3.bio',
    sources: [site('https://web3.bio')],
    pros: [
      'Searches Farcaster and several public identity systems.',
      'Provides link-in-bio profiles and an identity graph view.',
    ],
    cons: [
      'An identity explorer rather than a casting client.',
      'Public associations are context, not proof of who controls every linked account today.',
    ],
  },
  {
    id: 'buoy',
    name: 'Buoy',
    category: 'Specialist apps',
    tagline: 'Search Farcaster and monitor keywords.',
    fit: 'Community teams tracking mentions, topics, and opportunities.',
    platforms: 'Web · iOS · Android',
    network: 'Farcaster search and notifications',
    basis: 'Website reviewed',
    url: 'https://buoy.club',
    sources: [site('https://buoy.club')],
    pros: [
      'The site advertises free search and advanced filters.',
      'Paid tiers add keyword alerts, digests, cast tracking, and team webhooks.',
    ],
    cons: [
      'Advanced monitoring and collaboration are paid features; check current pricing before adopting.',
      'A search and alert tool rather than a general-purpose social client.',
    ],
  },
  {
    id: 'kiwi-news',
    name: 'Kiwi News',
    category: 'Specialist apps',
    tagline: 'A community-curated link aggregator for crypto, tech, and the open web.',
    fit: 'Finding and discussing useful links outside a chronological social feed.',
    platforms: 'Web · iPhone beta',
    network: 'Community-submitted links; includes Farcaster posts',
    basis: 'Website reviewed',
    url: 'https://news.kiwistand.com/',
    sources: [
      site('https://news.kiwistand.com/'),
      { title: 'Community submission guidelines', url: 'https://news.kiwistand.com/guidelines' },
    ],
    pros: [
      'Community ranking offers a curated alternative to an endless feed.',
      'Its current site includes Farcaster links among sources and advertises an iPhone beta.',
    ],
    cons: [
      'Focused on link discovery and discussion, not a full Farcaster client.',
      'Participation requirements and ranking depend on Kiwi News rules and community activity.',
    ],
  },
  {
    id: 'far-quest',
    name: 'far.quest',
    category: 'Specialist apps',
    tagline: 'A Farcaster ecosystem portal with a Pro Client, quests, marketplace, and Wield features.',
    fit: 'Exploring Farcaster identity, games, and marketplace features in one ecosystem.',
    platforms: 'Web',
    network: 'Farcaster · Wield',
    basis: 'Website reviewed',
    url: 'https://far.quest/',
    sources: [
      site('https://far.quest/'),
      { title: 'FarMarket launch announcement', url: 'https://news.far.quest/farmarket' },
    ],
    pros: [
      'The current site links a Farcaster Pro Client alongside quests, FarHero, and FarMarket.',
      'A useful example of an ecosystem portal that combines social and game/market features.',
    ],
    cons: [
      'The site leads with .cast handles, marketplace, and Wield; it is broader than a conventional social client.',
      'The directory has not tested current registration, client, marketplace, or onchain flows.',
    ],
  },
  {
    id: 'supercast',
    name: 'Supercast / Super',
    category: 'History',
    tagline: 'An earlier alternative-client experiment.',
    fit: 'Understanding the history of alternative Farcaster interfaces.',
    platforms: 'Historical web client',
    network: 'Farcaster',
    basis: 'Historical listing',
    sources: [awesome],
    pros: [
      'A useful historical example of client-level experimentation.',
      'Earlier directories recorded anonymous posting and onchain features.',
    ],
    cons: [
      'Its former super.sc domain redirected to a domain-sale page during this review.',
      'No current app launch link is offered here; do not treat an old directory entry as proof of availability.',
    ],
  },
  {
    id: 'opencast',
    name: 'Opencast',
    category: 'History',
    tagline: 'Stephancill’s open-source, self-hostable Farcaster client.',
    fit: 'Learning from an earlier Hub-based client architecture.',
    platforms: 'Self-hosted web · archived',
    network: 'Legacy Farcaster Hub & lazy-indexer',
    basis: 'Historical listing',
    url: 'https://github.com/stephancill/opencast',
    sources: [repo('stephancill/opencast')],
    pros: [
      'Public implementation of profiles, threads, and engagement actions.',
      'Documents a self-hosted architecture with its own indexer.',
    ],
    cons: [
      'The owner archived the repository on August 28, 2025.',
      'It depends on the older Hub/indexer stack; current Snapchain compatibility is not established.',
    ],
  },
  {
    id: 'nounspace',
    name: 'nounspace',
    category: 'History',
    tagline: 'An earlier customizable Farcaster web-client project.',
    fit: 'Researching the ecosystem’s earlier approaches to social spaces.',
    platforms: 'Historical web listing',
    network: 'Farcaster',
    basis: 'Historical listing',
    sources: [awesome],
    pros: [
      'Preserves another branch of the alternative-client story.',
      'A starting point for investigating customizable community interfaces.',
    ],
    cons: [
      'nounspace.com redirected to nouns.wtf during this review.',
      'That redirect does not establish whether every old deployment or source repository has ended.',
    ],
  },
];

export const TIMELINE = [
  {
    date: '2020–2022',
    title: 'RSS+ becomes Farcaster',
    text: 'Dan Romero describes working with Varun Srinivasan on RSS+, then launching early protocol and client versions. The design goal was direct audience relationships and freedom to build clients.',
    source: 'https://danromero.org/farcaster/',
    label: 'Founder’s account',
  },
  {
    date: 'January 2022',
    title: 'Why many clients matter',
    text: 'Varun’s sufficient-decentralization essay argues that users need control of identity and messages, and developers need the freedom to build alternative interfaces.',
    source:
      'https://www.varunsrinivasan.com/2022/01/11/sufficient-decentralization-for-social-networks',
    label: 'Original design essay',
  },
  {
    date: 'October 2023',
    title: 'Permissionless sign-ups',
    text: 'Farcaster opened registration beyond invitations. Being able to join the protocol is distinct from any one application’s access or moderation rules.',
    source: 'https://danromero.org/farcaster-permissionless/',
    label: 'Founder’s announcement',
  },
  {
    date: 'January 2024',
    title: 'Frames make casts interactive',
    text: 'Frames brought buttons and small interactive experiences into casts. In a February interview, Dan Romero explained why independent clients can serve different communities and apply different interface policies.',
    source: 'https://blockworks.com/news/social-media-farcaster-interview/',
    label: 'Founder interview and launch reporting',
  },
  {
    date: 'December 2024',
    title: 'Frames v2 proposal',
    text: 'A public proposal developed richer embedded app experiences beyond the earlier Frames format. These experiences help explain why Mini App support varies across clients.',
    source: 'https://github.com/farcasterxyz/protocol/discussions/205',
    label: 'Protocol discussion',
  },
  {
    date: 'March 2025',
    title: 'Snapchain mainnet code',
    text: 'The March 21 v0.2.0 changelog records mainnet support. The data layer evolved beyond the earlier Hub architecture; client experiences still depend on their indexing and service choices.',
    source: 'https://github.com/farcasterxyz/snapchain/blob/main/CHANGELOG.md',
    label: 'Project changelog',
  },
  {
    date: 'January 2026',
    title: 'Neynar announces acquisition',
    text: 'On January 21, Neynar announced it was acquiring Farcaster from Merkle, including responsibility for the protocol, flagship clients, and Clanker. This is a dated event, not a claim about today’s operator.',
    source: 'https://neynar.com/blog/neynar-is-acquiring-farcaster',
    label: 'Acquirer’s announcement',
  },
  {
    date: '2026',
    title: 'Hypersnap and independent clients',
    text: 'Hypersnap’s open-source work and clients such as Allthing and Quilcast provide more ways to read and interact. Check each deployment: shared formats alone do not establish full interoperability.',
    source: 'https://github.com/farcasterorg/hypersnap',
    label: 'Protocol source',
  },
  {
    date: 'October 2026',
    title: 'Another operator transition',
    text: 'Rish’s October 15 announcement says Network School is acquiring the Farcaster app, protocol repositories, and related products. Keep operator changes separate from the identity and data layers.',
    source: 'https://farcaster.xyz/rish/0x5d479754',
    label: 'Handoff announcement',
    context:
      'https://www.theblock.co/news/ecosystems/2026-10-15-network-school-acquires-farcaster-from-neynar-418720',
  },
];

export function filterApps(query: string, category: Category | 'All') {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return APPS.filter(
    (app) =>
      (category === 'All' || app.category === category) &&
      words.every((word) =>
        [app.name, app.tagline, app.fit, app.platforms, app.network, ...app.pros, ...app.cons]
          .join(' ')
          .toLowerCase()
          .includes(word),
      ),
  );
}
