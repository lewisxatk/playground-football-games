# CC0 Football Knowledge Engine

Generated master and game shards: `public/data/football-knowledge-*.cc0.json` (lazy-loaded per game; no 83 MB monolithic file is served). The checksummed index is `public/data/football-knowledge-manifest.cc0.json` and the QA summary is `public/data/football-knowledge-report.json`.
Machine-readable QA report: `public/data/football-knowledge-report.json`
Builder: `scripts/build-cc0-football-knowledge.mjs`
Workflow: `.github/workflows/build-cc0-football-knowledge.yml`

## Licence policy

This pipeline imports only sources whose data is explicitly published under CC0-1.0. CC0 removes copyright attribution/share-alike obligations for the contributed data, but does not guarantee accuracy or clear separate rights in club crests, photographs, logos, trademarks, or other artwork. No crests, portraits, or copied third-party quiz wording are included.

Pinned inputs:

| Source | Pinned revision | Use |
|---|---|---|
| [OpenFootball players](https://github.com/openfootball/players) | `125d20f7cc06cac7e758b40df535a7695632680a` | Player names, aliases, nationality, birth year and broad position where present |
| [OpenFootball clubs](https://github.com/openfootball/clubs) | `ae3800227c449447b3a337fc0aac79a8f02f4c8b` | Club identity, aliases, country and stadium metadata |
| [Mart Jürisoo international results](https://github.com/martj42/international_results) | `ca84241bb3eed854a1956a2fab442fe4daad40dd` | Men's senior international match results and recorded goalscorers |
| [OpenFootball World Cup](https://github.com/openfootball/worldcup.json) | `516d3825c3bd23fdc298c4014e84bde78f2d4965` | Source for the retained 1982–2022 starting-line-up snapshot in `public/data/worldcup-lineups.json` |

The international-results source is a men's senior full-international dataset. It is not a domestic-league database and does not represent every international appearance or goal in every player's career.

## Identity and duplicate policy

- Entity IDs are stable SHA-256-derived identifiers from canonicalised names or source-scoped keys.
- Player aliases are retained for answer matching; aliases do not create extra players or extra Footle answers.
- Match facts use date, home team, away team and tournament as their source-scoped identity.
- Each generated quiz record has a stable fact ID, source URL, event date, answer, and distinct answer choices.
- Puzzle packs have stable IDs and game-specific units. A pack is not counted merely because it contains multiple phrasings of one fact.
- The Climb and Timed Quiz receive separate match partitions so the same match question is not placed in both pools.

## Accuracy and QA

The build checks pinned source licences, stable IDs, duplicate keys, minimum pool sizes, answer-choice uniqueness, pack structure, and required fields. It also runs the full TypeScript/Vite production build before publishing generated shards. A green build means the data is structurally valid; it does not mean every underlying historical fact has been independently fact-checked.

Important scope labels:

- International-goal figures are goals recorded in the pinned source, not guaranteed complete career totals.
- World Cup appearance clues are based on recorded starting line-ups; they are not a full caps or substitute-appearance record.
- Position and nationality fields can be missing or inconsistent in open datasets. Missing data must not be converted into a factual zero.
- No player-club career timeline is inferred from a current club or a single team mention.

## Game coverage

The generated report records the exact count, unit, readiness and live-integration status for each game. The current CC0 pools are integrated into:

- Footle — unique five-letter surnames
- The Climb and Timed Quiz — source-backed international match questions
- Connections and Strands — player-identity puzzle packs
- Football Grid — position × nationality intersections
- Missing XI and Tournament Nation — World Cup line-ups
- The Reveal — World Cup player cards and tournament clues
- Lowball, The Ladder and Football 501 — recorded senior international-goal packs
- Draft XI and Scout Signal — positioned player records with sourced international/World Cup stats
- Career File and Cult Hero — dated player-club membership records from Wikidata
- Link Up — unique bridge puzzles based on overlapping dated membership records

Career File and Cult Hero now use a separate Wikidata CC0 snapshot of dated player-club membership statements. Link Up uses only overlapping dated membership statements and generates bridge-player options from that same snapshot. The live Wikidata query is recorded with its endpoint, retrieval date, row count and accepted-spell count; the build report marks each game ready only when it reaches 500 unique candidates or packs. These records are not match appearances, and they must never be described as season statistics. The old mixed-provenance archive is not silently counted as CC0 content.

## Build and test

Run `npm run build` to type-check and build the site. The CC0 workflow checks out pinned upstream revisions, verifies their licence files, rebuilds game-specific shards, runs the full site build, and publishes the shards/report only to the feature branch. Each game fetches only its own shard rather than downloading the full database on first load.

The feature branch and draft pull request are isolated from `main`; this work does not deploy or merge to production.
