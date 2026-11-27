# PLAYGROUND football content plan

## Product direction

Every game should draw from one broad football knowledge universe. The first audience is UK fans and friends, so English football is the backbone, while European and international football keeps the games varied.

## Shared content balance

| Topic | Long-run target |
|---|---:|
| Premier League (current and historic) | 40% |
| EFL, FA Cup, League Cup and other English football | 20% |
| Champions League and other European club competitions | 15% |
| World Cup and European Championship | 15% |
| Other Big Five leagues (La Liga, Bundesliga, Serie A, Ligue 1) | 10% |

These are long-run targets, not quotas for every short daily round.

## Difficulty rubric

- **Easy:** recognisable players, clubs, iconic moments and headline records that a broad football audience is likely to know.
- **Medium:** familiar subjects but with a more specific record, event, season or competition context.
- **Hard:** specialist statistics, older history, less familiar competitions, or precise recall.
- **Extreme:** obscure historical details, exact milestone records, unusual edge cases or facts that even regular fans may need to think hard about.

Difficulty is an editorial estimate of recall difficulty, not a judgement about the player. It should be reviewed using actual play data later. The bank currently keeps equal numbers in each tier so all four levels have usable depth.

## Master question bank

The master factual database lives in public/data/football-facts.seed.json while it is being expanded. Each record contains a stable ID, broad topic, specific category, difficulty and rationale, natural-language question, canonical answer, exactly four answer choices, accepted spellings, reveal explanation, competition scope, valid-as-of date, source URL, source checked date, review status and native game-mode mapping.

Question wording is written originally for PLAYGROUND. Sources are used to discover and verify facts; the project does not copy third-party quiz packs or question wording.

## Source policy

Prefer primary or competition-authority sources: Premier League, EFL, The FA, UEFA, FIFA, Bundesliga, Ligue 1, Lega Serie A and La Liga. Secondary reporting can help discover facts, but an item should not be marked verified until the underlying detail can be checked against a reliable source.

Be explicit about scope: Premier League rather than all English top-flight history; EURO finals rather than qualifying; European Cup/Champions League continuity only where the record is genuinely shared; league goals rather than all-competition goals. Never turn player nationality into proof of a national-team appearance.

## Current development bank

The current bank contains **100 question records** with this difficulty balance:

| Difficulty | Questions |
|---|---:|
| Easy | 25 |
| Medium | 25 |
| Hard | 25 |
| Extreme | 25 |

| Topic group | Current records | Current share |
|---|---:|---:|
| Premier League | 37 | 37% |
| EFL and English cups | 20 | 20% |
| Champions League / European Cup | 17 | 17% |
| World Cup and EURO | 16 | 16% |
| Other Big Five leagues | 10 | 10% |

The database currently contains 44 distinct source URLs. Every record retains its own source URL and the date it was checked.

The bank includes straightforward entry questions alongside more distinctive details: early Premier League milestone goals, Portsmouth 7-4 Reading, the 1993 Wimbledon attendance record, a Barnsley play-off final moment, the first FA Cup final's scorer and playing alias, the 2005 Champions League final comeback, and unusual EFL/Bundesliga records.

Question categories now include: clubs, firsts, history, managers, matches, milestones, players, records, stadiums, transfers, trophies.

## How games consume the bank

The current 100 records are factual question units. They are natively mapped to Timed Quiz and The Climb only. Other games should use purpose-built converters:

- Footle needs a recognisable, deduplicated player answer pool with aliases and useful letter hints.
- Connections and Strands need complete packs tested for one unique solution.
- Football Grid needs complete boards, with club appearances or national-team caps genuinely verified.
- Link Up needs one valid connecting player and decoys that cannot also satisfy the clues.
- Missing XI and Tournament Nation need full, sourced line-ups and tournament context.
- Ladder, Lowball and Football 501 need like-for-like numeric comparisons with clear competition scope.
- Career File, Reveal, Cult Hero and Scout Signal need coherent clue/card records rather than isolated quiz questions.
- Draft XI needs its own eligibility, price and budget validation.

A fact appearing in the master bank does not automatically count as a playable pack for all games.

## Quality gates

The validator rejects missing or duplicate IDs/question stems, incomplete questions, missing canonical answers or aliases, repeated aliases after accent normalisation, missing category/topic/difficulty, missing difficulty rationale, missing explanations, missing competition scope or dates, missing source provenance, unverified items, invalid game mappings, and missing/duplicate answer options or a correct answer that appears other than once.

Do not claim the database is complete at 500–1,000 questions. The 100-question bank is a growing foundation, not the finished content volume. Continue in researched batches, then connect validated records to game-specific data models and measure which difficulty levels are actually too easy or too hard.


## 2026-11-27 audit correction: live content versus development seed

There are two separate question systems in the current branch:

- `public/data/football-facts.seed.json`: 100 curated, source-referenced development questions, 25 per difficulty tier. They are not wired into live games and currently map only to Timed Quiz and The Climb. Structural duplication checks found no duplicate question stems, but the script does not verify factual truth or licence clearance.
- The build-generated question bank: 800 archive-derived questions per tier (3,200 total), currently used by The Climb and Quick Quiz. These are templated from player archive fields, not 3,200 individually researched questions. The source archive mixes Wikipedia-derived CC BY-SA data and Wikidata-derived CC0 data, and flags several career/stat totals as unverified or incomplete.

Do not add these counts together or describe them as 3,300 approved unique facts. Keep the seed as an editorial development batch until each fact's provenance and scope has a clear rights basis; use a CC0-only source snapshot for future commercial game-content generation.

The 100 records are close to the long-term UK-first balance, but 60 are in the `records` category. Future batches must deliberately add player careers, clubs, rivalries, managers, iconic matches, tournaments, stadiums and football culture. The quality gate must validate source-row evidence, exact competition scope, distractors and underlying fact IDs, not only JSON shape.

See [CONTENT_AND_DATA_AUDIT_2026-11-27.md](./CONTENT_AND_DATA_AUDIT_2026-11-27.md) for the full source and game-fit audit.


## Follow-up data hygiene

The 100-record seed now separates `eventDate` (the date of a historic match/milestone) from `validAsOf` (the date the record was checked). Historical dates previously stored in `validAsOf` were migrated into `eventDate`. The validators now check source/date formats, fact/scope duplicates and accepted aliases in multiple-choice options, but factual and rights verification still require source-row recomputation and a documented CC0 source.
