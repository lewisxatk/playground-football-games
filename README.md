# PLAYGROUND — football games

A distinctive home for quick-fire football games, challenges and daily competitions.


## CC0 football knowledge database

The live game content is built from pinned CC0 sources and Wikidata's CC0 structured data. The generated database is split into lazy-loaded files under `public/data/`; see the [content report](public/data/football-knowledge-report.json), [checksummed shard manifest](public/data/football-knowledge-manifest.cc0.json), and [source/accuracy notes](docs/CC0_FOOTBALL_KNOWLEDGE_ENGINE.md). Each static data shard is kept below Cloudflare Pages' 25 MiB per-file limit.

## Principles
- Preserve the existing game rules and behaviour when integrating the games.
- Give the platform a recognisable editorial identity rather than a generic AI-template look.
- Mobile-first, fast, accessible and keyboard-friendly.
- Keep game logic independent from presentation and shared UI.

## Design direction
- Display: Cabinet Grotesk (self-hosted font files go in `public/fonts/` once licensed files are supplied).
- Utility: General Sans / system sans stack.
- Numeric/sport details: Barlow Condensed.
- Palette: warm chalk, ink black, vivid pitch green and signal orange.
- Graphic language: ticket edges, scoreboard typography, bold rules, illustrated football details and restrained motion.

## Development

```sh
npm install
npm run dev
npm run build
```

## Deployment
Cloudflare Workers with Static Assets. Connect this repository to Workers Builds after the first frontend build is verified. Do not deploy over any existing Worker or production site until the target hostname and current game source are confirmed.


## Development status

The persistent, item-by-item implementation tracker and session handover is in [PROJECT_CHECKLIST.md](./PROJECT_CHECKLIST.md). Update it after every development batch; it is the source of truth for completed and outstanding work.

Data sources, licences and coverage limitations are documented in [DATA_SOURCES.md](./DATA_SOURCES.md). The production site is deployed to Cloudflare Pages at https://playground-football-games.pages.dev.


## CULT HERO prototype

The isolated feature branch `feat/cult-hero-mystery-pack-opening` adds two related routes:

- `/cult-hero` — five source-led player mysteries per UTC day, plus unlimited practice. Clues are assembled only from available player profile and dated career-spell fields.
- `/cult-hero-collection` — a one-card archive pack reveal and local player cabinet. The opening sequence is original CSS/React animation; it does not add a WebGL or GSAP dependency.

Collected cards currently live in browser localStorage. They are not account-synced or shared between devices. Card faces are deliberately typography-led until licensed player portrait assets are available. The pack preview is a development prototype, with no paid packs, currency or trading.


## Visual and motion upgrade

The feature branch adds reusable CSS/Motion interactions for the homepage hero, game cards, route entrances, feedback states, daily progress and collection-card reveals. Each game page keeps the shared editorial PLAYGROUND identity with its own accent colour and the home tiles have distinct visual treatments. The implementation respects reduced-motion preferences and does not add a 3D renderer or another animation framework.

## CULT HERO — CC0 career membership pool

CULT HERO now draws from the dated CC0 Wikidata career snapshot. Each mystery uses recorded club-membership statements and clearly labels the data as club-history evidence, not match appearances or season statistics. The source is broad football rather than a claimed Big Five-only roster; no missing career data is invented.


## Content and data audit

See [the 27 November 2026 content and data audit](./docs/CONTENT_AND_DATA_AUDIT_2026-11-27.md) for the split between the 100-question development seed and 3,200 archive-derived prompts, current QA limitations, and the CC0-only source policy.


## Football knowledge database

The CC0-only football knowledge pipeline, source pins, duplicate policy, accuracy limits and per-game coverage are documented in [CC0 Football Knowledge Engine](docs/CC0_FOOTBALL_KNOWLEDGE_ENGINE.md). Generated data and its QA report are published under `public/data/football-knowledge*`. Career File and Cult Hero now use dated CC0 Wikidata club-membership statements; Link Up uses overlapping dated memberships. See the live per-game counts and caveats in the generated QA report.
