# PLAYGROUND — football games

A distinctive home for quick-fire football games, challenges and daily competitions.

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

## CULT HERO — Big Five recognition pool

CULT HERO now starts from a curated recognisable-player roster covering the Premier League, La Liga, Bundesliga, Serie A and Ligue 1. A daily five tries to include one eligible player from each league. A player is only used when the existing archive has nationality, position and three distinct dated club records; missing source details are not fabricated. The roster is a first curated batch, not an exhaustive current squad database.


## Content and data audit

See [the 27 November 2026 content and data audit](./docs/CONTENT_AND_DATA_AUDIT_2026-11-27.md) for the split between the 100-question development seed and 3,200 archive-derived prompts, current QA limitations, and the CC0-only source policy.
