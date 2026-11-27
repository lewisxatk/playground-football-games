# CC0 football knowledge engine

## Source whitelist

| Source | Pinned revision | Data licence | Intended use |
|---|---|---|---|
| [OpenFootball Players](https://github.com/openfootball/players) | `125d20f7cc06cac7e758b40df535a7695632680a` | CC0-1.0 | Player identity, aliases, nationality grouping and birth year where supplied |
| [OpenFootball Clubs](https://github.com/openfootball/clubs) | `ae3800227c449447b3a337fc0aac79a8f02f4c8b` | CC0-1.0 | Club identity and country grouping |
| [OpenFootball World Cup line-ups](https://github.com/openfootball/worldcup.json) | Existing repository snapshot | CC0 | Starting XI and match context, 1982–2022 |

The workflow checks the upstream `LICENSE.md` files for CC0 before importing. Revisions are pinned for reproducibility. CC0 describes reuse rights, not factual accuracy or completeness.

## IDs and deduplication

- Stable SHA-256-derived IDs are assigned to normalised player, club and match entities.
- Accents, case and punctuation are normalised for duplicate matching.
- Alternate player names are stored as aliases, not separate players.
- Match facts are scoped by source match ID, date, year, team and opponent.
- A fact reused by several games is still one underlying fact; each game's playable unit is counted separately.

## Output

The generator writes `public/data/football-knowledge.cc0.json` and `public/data/football-knowledge-report.json`. The report counts game-specific units and marks each game ready only when it has at least 500 units. The GitHub Actions workflow runs against pinned upstream repositories and commits generated data to this feature branch only. It never modifies `main` or deploys production.

## Honest coverage limits

The CC0 player and club sources can create a large identity pool. World Cup line-ups provide complete XI and match-context records. The current generator creates Footle answer candidates, World Cup quiz facts, Connections club-country packs, XI packs, appearance cards and Link Up candidate packs.

It deliberately does not invent data for games that need fields absent from these sources:

- Career File and CULT HERO need dated player-club career spells.
- Scout Signal and Draft XI need sourced positions and reliable player attributes/pricing.
- Football Grid needs verified player-club membership intersections.
- Lowball, Ladder and Football 501 need scoped, comparable numeric player/club records.
- Strands needs a word-search board generator and unique-solution validator.

Those games remain marked incomplete in the report instead of being falsely labelled as having 500 verified packs. The existing OpenFootballBase archive mixes CC BY-SA 4.0 and Wikidata CC0 records, so it is not imported by this CC0-only pipeline.
