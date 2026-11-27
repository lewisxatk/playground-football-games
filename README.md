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
