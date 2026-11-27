# PLAYGROUND football content plan

## Product direction

Every game should draw from one broad football knowledge universe. The first audience is UK fans and friends, so English football is the backbone, while European and international football keeps the games varied.

## Shared content balance

| Topic | Target share |
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

Difficulty is an editorial estimate of recall difficulty, not a judgement about the player. It should be reviewed using actual play data later.

## Master question bank

The master factual database lives in public/data/football-facts.seed.json while it is being expanded. Each record contains a stable ID, broad topic, specific category, difficulty and rationale, natural-language question, canonical answer, four answer choices, accepted spellings, reveal explanation, competition scope, valid-as-of date, source URL, checked date, review status and native game-mode mapping.

Question wording is written for PLAYGROUND. Sources discover and verify facts; the project does not copy third-party quiz packs or question wording.

## Source policy

Prefer primary or competition-authority sources: Premier League, EFL, The FA, UEFA, FIFA, Bundesliga, Ligue 1, Lega Serie A and La Liga. Secondary reporting can help discover facts, but an item should not be marked verified until the detail can be checked against a reliable source.

Be explicit about scope: Premier League rather than all English top-flight history; EURO finals rather than qualifying; European Cup/Champions League continuity only where the record is genuinely shared; league goals rather than all-competition goals. Never turn player nationality into proof of a national-team appearance.

## Current first batch

The first development batch contains 60 question records, with 15 each in Easy, Medium, Hard and Extreme.

| Topic | Current records | Approximate share |
|---|---:|---:|
| Premier League | 23 | 38% |
| EFL and English cups | 12 | 20% |
| Champions League / European Cup | 10 | 17% |
| World Cup and EURO | 9 | 15% |
| Other Big Five leagues | 6 | 10% |

Sources represented: Premier League, EFL, The FA, UEFA, FIFA, Bundesliga, Ligue 1, Lega Serie A and La Liga.

The first batch includes unusual angles: the first live televised Premier League goal, Portsmouth 7-4 Reading, a Barnsley play-off final moment, the first FA Cup final's scorer and playing alias, the fastest Champions League hat-trick, the oldest European Cup final player and historic EFL records.

## How games consume the bank

These records are question units. They are natively mapped to Timed Quiz and The Climb only. Other games need purpose-built converters:

- Footle needs a recognisable, deduplicated player answer pool with aliases and useful letter hints.
- Connections and Strands need complete packs tested for one unique solution.
- Football Grid needs complete boards with club appearances or national-team caps genuinely verified.
- Link Up needs one valid connecting player and decoys that cannot also satisfy the clues.
- Missing XI and Tournament Nation need full, sourced line-ups and tournament context.
- Ladder, Lowball and Football 501 need like-for-like numeric comparisons with clear competition scope.
- Career File, Reveal, Cult Hero and Scout Signal need coherent clue/card records rather than isolated quiz questions.
- Draft XI needs its own eligibility, price and budget validation.

A fact in the master bank does not automatically count as a playable pack for all games.

## Quality gates

The validator rejects missing difficulty/category, duplicate IDs or question text, duplicate accepted answers after accent normalisation, incomplete questions, unverified items, missing sources or scope, invalid choices, multiple correct options and accidental mapping of a basic question to a game that requires a converted puzzle pack.

Do not claim the database is complete at 500–1,000 questions. The 60-question batch is a first quality-controlled foundation. Continue in researched batches, then connect the validated bank to gameplay and measure which difficulty levels are actually too easy or too hard.
