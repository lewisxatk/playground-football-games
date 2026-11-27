# PLAYGROUND content and data audit — 27 November 2026

## Scope

Audit target: `feat/cult-hero-mystery-pack-opening` (not production `main`). This review covers the visible brand system, question-bank files and generator, source/provenance declarations, relevant game connections, and the data-source policy. It is a repository audit, not legal advice or a certification of every fact.

## Executive findings

- The visual identity is coherent: warm chalk and ink, pitch green/orange accents, scoreboard typography, ticket/card motifs, and restrained motion all match the PLAYGROUND brief.
- The content system is not yet one unified question bank. There are two distinct systems: a 100-record researched question seed and a generated 3,200-record player-archive question bank. Do not add those counts together and call them 3,300 independently verified questions.
- The 100 researched records are development-only and are not wired into live games. They map only to Timed Quiz and The Climb.
- The generated 3,200 are currently consumed by The Climb and Quick Quiz. They are template-generated from archive fields, not 3,200 individually fact-checked editorial questions.
- The 100-record seed has 100 unique IDs, 100 distinct normalised question stems, 44 distinct source URLs, and a balanced 25/25/25/25 difficulty split. Its topical mix is close to the stated UK-first target: 37% Premier League, 20% EFL/English cups, 17% Champions League, 16% World Cup/EURO, and 10% other Big Five leagues.
- The 100 seed is overly weighted to records (60/100). More player-career, clubs, rivalries, managers, tournaments, iconic matches, transfers and stadium/history questions are needed to make the content feel broad rather than like a records-only quiz.
- The current validator is structural. It does not independently establish truth, prove source relevance, open and test source links, test whether distractors are genuinely wrong, determine database rights, or check whether a mutable record is still current.
- Existing shared player/career data has mixed provenance: Wikipedia-derived fields are CC BY-SA 4.0 while Wikidata-derived fields are CC0. The repository/code MIT licence does not make the entire data archive MIT or CC0.
- Transfers remain a hold: the app requests `/career-data/transfers.csv`, but the source and redistribution terms have not been established in this code review.
- Team crests remain a separate trademark/rights risk. A repository licence for SVG paths or code is not blanket permission to reproduce club marks commercially.

## Brand and theme audit

### What fits

- Colour system: warm paper/chalk `#f3f0e7`, deep ink `#141b19`, pitch lime `#c9f45c`, signal orange `#ff744f`, with supporting blue/purple accents.
- Visual language: oversized condensed football headlines, score panels, tickets, matchday-card layouts, pitch graphics and distinct game-card palettes.
- Motion layer: CSS/Motion interactions are restrained and include a reduced-motion override.
- Mobile-first responsive rules are present in the shared stylesheets.

### What needs tightening

- Typography is not yet a single disciplined system. The homepage imports Cabinet Grotesk and Barlow Condensed; game screens load Space Grotesk plus several display families (Anton, Archivo Black, Bebas Neue, Oswald, Russo One and Teko). The README also names General Sans/system as a utility face, which is not the actual main gameplay face.
- Recommendation: standardise to one utility family (Space Grotesk or General Sans, not both), one expressive display family (Barlow Condensed), and one wordmark/display treatment. Preserve each game's accent colour and game-specific composition. Do not redesign the whole theme; consolidate font usage and remove unused remote imports after checking every route.
- Avoid importing new externally hosted photos, club crests or branded assets as a shortcut. Use original CSS/SVG artwork and text fallbacks unless each asset has a clear reuse basis.

## Question-bank audit

### A. Researched factual seed: 100 records

Current structural findings:
- 100 records; 25 at each difficulty level.
- 100 unique IDs and no duplicate question stems after Unicode/accent/case/punctuation normalisation.
- 44 distinct source URLs.
- Topic distribution: Premier League 37; EFL 13; English cups 7; Champions League 17; EURO 6; World Cup 10; Bundesliga 7; La Liga 1; Serie A 1; Ligue 1 1.
- Category distribution is heavily record-led: 60 records are category `records`.
- Native game mapping is Timed Quiz and The Climb only.
- The seed status says it is not yet wired into live games.

Reviewed examples include Premier League milestone/record questions (Shearer, Milner, Giggs, Cech, Haaland, Les Ferdinand and Bellamy), EFL records (Noble-Lazarus, Neil McBain, Ronnie Dix, Stockport 13–0, Tranmere 13–4), tournament facts (Mbappé's men's World Cup scoring record after 2026, Messi's World Cup appearances, EURO records), and Bundesliga's 4,875-day scoring gap. These spot-checks were supported by the cited league/federation pages at the time of review.

Important qualification: the seed marks all 100 items `verified`, but that field is manually authored. The validator checks the shape of each item; it does not verify the factual statement. Therefore the accurate status is **100 structured, source-referenced development questions; a sample has been cross-checked; full independent question-by-question QA is not proven by CI**. Do not describe all 100 as fully certified or live-ready.

The current sources include competition bodies and league websites. Those pages can be excellent for checking a fact manually, but their site/database terms are not automatically a reusable bulk-data licence. Keep the 100 seed out of the monetised/live bank until each fact's provenance and rights basis is documented, or the same fact is independently regenerated from an approved CC0 source. Retain original PLAYGROUND question wording; never copy third-party quiz wording.

### B. Generated archive bank: 3,200 records

The builder targets 800 questions per tier (600 English and 200 international in each tier). It reads the OpenFootballBase-Data player shards and creates reusable templates around nationality, current/latest club, position, earliest recorded club, club counts, latest league, club country, career statistics, caps and career years.

Main issues:
- The source manifest says the player archive contains both Wikipedia-derived CC BY-SA 4.0 material and Wikidata-derived CC0 fields. The dataset is mixed-provenance, not CC0-only.
- The upstream archive itself warns that career appearances/goals, national caps and some season statistics are unverified, incomplete or vary in coverage. Missing data must remain unknown, not zero.
- Some prompts can sound more definitive than the underlying evidence. “Earliest recorded club” is not necessarily a player's first senior club; “career total” is not necessarily a complete career total; “latest club” is an archive snapshot, not a live squad feed.
- Distractors are selected from broad pools or nearby numeric values. The generator does not prove each distractor is false in the question's exact competition/time scope.
- The runtime integrity check in `src/questionBank.ts` checks the expected counts and simple structure, not the truth or diversity of every item.
- The builder can exit early when a matching release/count already exists, without running the deeper factual checks that a real content audit would need.

Recommendation: treat this as an archive-derived practice pool, not an approved trivia bank. For a strict CC0-only product, phase out mixed CC BY-SA records from the shared live content path and rebuild the candidate/fact layer using CC0 sources. If retaining CC BY-SA in a distributed data archive is acceptable, that is a free licence rather than a paid licence, but it brings attribution and share-alike conditions that the project owner must knowingly accept.

## Other game content

A single factual record is not automatically a playable item for every game. The existing design note is correct to require game-specific packs. Minimum data units should be defined per game:
- Footle: unique, recognisable answer entities with accepted aliases and ambiguity controls.
- Football Grid: a complete board with verified club/nation/player intersections and acceptable answer sets.
- Connections: a 16-tile pack with four unique categories and no unintended alternate groupings.
- Strands: a complete 6×8 board, connected paths, unique word set and spangram validation.
- Link Up: a player-connection graph with exactly one valid bridge in the stated scope.
- Missing XI/Tournament Nation: a full competition/match lineup with stable player identity and accurate match context.
- Career File/Cult Hero: a coherent profile and dated club-spell clues; no fabricated gaps or falsely asserted first/last clubs.
- Lowball, Ladder and Football 501: like-for-like values with the same competition/stat scope and a valid answer set.

The current shared player archive is used by multiple games and only returns a bounded sample (up to 1,600 for several games, depending on the call). It is not the entire upstream 60,711 player shard set, and a sample size must not be presented as exhaustive game coverage.

## Data sources: strict no-fee / no-permission preference

For the user's preferred approach, make **CC0/public-domain datasets the default ingestion whitelist**. CC0 is a public-domain dedication, not a paid subscription; it avoids permission requests and attribution/share-alike duties for the released data. Keep an internal source URL, release/commit, retrieval date and row provenance anyway so answers can be reproduced and corrected.

### Good candidates to ingest after a coverage and accuracy check

| Source | Rights basis published by source | Useful fields / games | Limitations |
|---|---|---|---|
| OpenFootball England | CC0/public domain | English PL, Championship, League One, League Two match results; some season squad/club data. Good for table finishes, scorelines, streaks, derby history, match-based records and EFL/English coverage. | Coverage differs by season and repository. Do not assume detailed player appearances/goals or every historical competition is present. |
| OpenFootball Champions League | CC0/public domain | UCL, Europa League and Conference League fixtures/results; match events in available seasons. Useful for European nights, finals and club-history puzzles. | Check season range and event completeness per file before creating a question. |
| OpenFootball Leagues / Europe / World | CC0/public domain | Domestic leagues and cups across many countries; supports broader European and global content. | Data depth is uneven and should be measured by league/season. |
| OpenFootball EURO and World Cup repositories | CC0/public domain | National tournament fixtures/results and some lineups/events; expands beyond men's World Cup-only data. | Pin source commits and confirm men's/women's coverage and season coverage separately. |
| Mart Jürisoo `international_results` | GitHub repository publishes CC0-1.0 | Men's senior international results from 1872 to 2024 in the inspected README; includes results, shootouts, goalscorers and former team names. Strong for national-team records, rivalries, scorelines and tournament history. | It is men's full internationals; it excludes Olympic, U23, B-team and league-select matches. The author notes data is aggregated from several references, so spot-check unusual records. |
| Wikidata structured data | CC0 | Stable QIDs, aliases/labels, nationality, birth dates, positions, clubs and dated membership qualifiers where available. Strong for player identity, career clues, club/manager links, player pools and alias resolution. | Crowdsourced and incomplete; not a complete official performance-stat provider. Validate references, dates and identity before use. |

These sources are suitable foundations, not an automatic guarantee of complete or correct coverage. Import snapshots at build time, pin commit/release and SHA-256, retain source-row IDs, and compute questions from the imported rows instead of calling remote APIs during gameplay.

### Exclude from the strict CC0 ingestion whitelist

- Premier League website data/pages: current terms reserve copyright and database rights and expressly restrict commercial reuse/database creation without prior written approval. Its pages remain useful as a manual editorial cross-check, not a bulk ingestion feed.
- FIFA.com statistics/articles: FIFA says third parties may reuse text/statistics/content only for purely editorial, non-commercial purposes with credit; this does not fit a commercial PLAYGROUND data bank.
- Fjelstul World Cup Database: not part of the CC0-only plan; its site terms have stated personal projects, not commercial projects, and ask users to contact the author for a commercial licence.
- OpenTriviaQA, Footbillion and other third-party quiz banks: do not copy question wording or import question packs. They add attribution/share-alike obligations and are not necessary when we can generate original questions from CC0 facts.
- football-data.co.uk: its published terms are restrictive for commercial reuse; exclude unless terms change.
- OpenFootballBase-Data Wikipedia-derived fields: CC BY-SA 4.0, not CC0. Do not mix those rows into a strict CC0 release. Its Wikidata-derived fields may be CC0, but the current merged shard is not a CC0-only source.
- Transfer CSV: hold until the source, version and rights are established. Current code consumes `/career-data/transfers.csv`, but this review did not establish its provenance/redistribution licence.
- Club/federation crests: separate trademark and artwork rights. Do not infer commercial clearance from the MIT licence of a logo-index repository. Use text/initials or original generic badges until each mark is cleared.

## Recommended build sequence

1. **Freeze new imports from non-CC0 sources** while the data inventory is being separated. Do not silently delete current gameplay data in this audit pass.
2. **Create a source registry** recording source ID, canonical URL, licence label, commit/release, SHA-256, retrieval date, allowed uses, excluded fields and coverage notes.
3. **Import CC0 snapshots** from OpenFootball and Wikidata; use the Mart Jürisoo dataset for senior international football after checking the pinned release. Keep imported raw data separate from derived facts.
4. **Build canonical identities** with Wikidata QIDs, aliases, club IDs, date ranges and competition IDs. Keep unresolved names separate rather than fuzzy-merging namesakes.
5. **Calculate fact atoms deterministically** from source rows (for example, club season finishes, points, goals, scorelines, streaks, finals, head-to-head records and national-team milestones).
6. **Generate original PLAYGROUND wording** from those atoms. An LLM can help phrase a fact and suggest candidate distractors, but it must never invent the answer.
7. **Run QA before a question is playable**: recompute the answer from source rows; enforce exact scope; validate all distractors; deduplicate both question text and underlying fact IDs; verify entity aliases; test puzzle uniqueness; and review a sample of every batch manually.
8. **Make game-specific packs** from the fact ledger. Count only approved, valid packs toward the 500+ target. Keep an audit dashboard of counts by game, topic, difficulty, source, rights basis and QA status.
9. **Only then wire approved packs into live games** and replace the current archive-generated question flow. Keep practice/daily selection seeded and avoid repeated facts in a short session.

## Bottom line

The current theme is in the right direction and the curated 100 questions are a useful editorial starter batch. The main blocker is that the largest player-data source is mixed CC BY-SA/CC0 and its performance fields are not audited; the generator also turns those imperfect fields into questions without checking whether every answer/distractor is correct. The cleanest no-fee, no-permission path is CC0 snapshots + deterministic fact extraction + original PLAYGROUND questions + game-specific validation. No outside quiz wording needs to be copied.


## Additional source discovery — 27 November 2026

The CC0 shortlist can be extended with two valuable OpenFootball repositories:
- **OpenFootball Players** is CC0-1.0 and provides a broad country-organised player directory with name, position, date of birth, height and birthplace examples. Use it as an entity/answer pool and to expand players in Footle, Grid, Connections and profile games; do not treat it as a comprehensive career-stat database.
- **OpenFootball Clubs** is CC0 public-domain data for club identities, aliases, founding years and stadium associations. It can drive club-history, stadium, nickname and alias questions. Club crests remain separate rights.

OpenFootball's World Cup repository now advertises 2026 tournament data. That provides a path to extend PLAYGROUND's current 1982–2022 starting-XI file, but the 2026 records must be inspected and validated before they become playable.

The women's international sister dataset reports approximately 11,020 match results and says major tournament results should be complete while friendlies are incomplete. Its current licence file must be directly pinned and checked before import; it remains a candidate, not yet approved.

### Optional English-history dataset (not CC0)

The **England Football League Data** repository reports 212,910 matches from 1888 to 26 November 2026 across England's top four tiers. It includes match results, division/tier metadata, club naming history, active periods and points deductions. However, the author's original contribution is CC BY 4.0 (requires attribution) and third-party data/logo rights are reserved. This is a high-value option for deeper EFL content if the project accepts a small data credit, but it is not part of the strict no-licence-obligation shortlist.
