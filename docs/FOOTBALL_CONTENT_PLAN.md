# PLAYGROUND football content plan

## Product direction

Every game should test the same broad football world through its own mechanics. The initial audience is UK fans and friends, so English football is the default foundation, not a separate category that appears only in selected games.

## Shared content balance

| Topic | Target share |
|---|---:|
| Premier League (current and historic) | 40% |
| EFL, FA Cup, League Cup and other English football | 20% |
| Champions League and other European club competitions | 15% |
| World Cup and European Championship | 15% |
| Other Big Five leagues (La Liga, Bundesliga, Serie A, Ligue 1) | 10% |

The percentages are a long-run content mix, not a rigid quota for every short daily round. Each game should rotate categories so players encounter variety over time.

## Content volume: count the right thing

A raw player row is not a question. The target is 500–1,000 playable, checked units per game:

| Game | Counted unit | Target |
|---|---|---:|
| Lowball | Complete comparison/challenge packs | 750 |
| The Climb | Questions | 1,000 |
| Draft XI | Complete squad challenge packs | 750 |
| Career File | Player career files | 750 |
| Footle | Accepted player-name answers | 750 |
| The Connection | Complete 16-tile puzzle packs | 750 |
| Football Grid | Complete valid boards | 750 |
| The Ladder | Complete ranking rounds | 750 |
| The Reveal | Player clue cards | 750 |
| Football 501 | Complete stat/countdown challenges | 750 |
| The Link Up | Complete link puzzles | 750 |
| Missing XI | Complete line-up puzzles | 750 |
| Football Strands | Complete themed word-search packs | 750 |
| Scout Signal | Player clue/attribute cards | 750 |
| Tournament Nation | Complete tournament line-up packs | 750 |
| The Quick Quiz | Questions | 1,000 |
| Cult Hero | Player mystery cards | 750 |

A pack must be playable and pass its game-specific validation. Duplicates, invalid answers and near-identical reskins do not count towards the target.

## Question and answer standards

Each factual item should have:
- A stable ID and game/topic category.
- The exact question or puzzle prompt.
- One canonical answer and accepted aliases (or the complete valid answer set).
- Competition and statistical scope (e.g. Premier League, European Cup/Champions League, all senior internationals).
- Season/date cutoff for changing records.
- A source URL and source/retrieval date.
- A review status: `verified`, `needs-review`, or `retired`.
- A concise explanation that resolves the answer.

For multiple-choice questions, every option must be checked against the exact wording. For open answers, normalise accents and punctuation and accept genuine aliases. Never make a question stricter than its displayed wording.

## Competition and record coverage

Prioritise:
1. Premier League records, clubs, seasons, managers, transfers, goals, assists, appearances, clean sheets, hat-tricks and memorable matches.
2. EFL Championship, League One, League Two, promotion/relegation, play-offs, FA Cup and League Cup.
3. European Cup / UEFA Champions League records, winners, finals, top scorers, appearances, hat-tricks and English clubs' European history. Label the European Cup/Champions League era correctly.
4. FIFA World Cup and UEFA European Championship winners, finals, appearances, goals, assists where reliable, clean sheets and historic moments.
5. Recognisable players and clubs from La Liga, Bundesliga, Serie A and Ligue 1, including their European links.

## Game-specific interpretation

- Quiz formats: question bank entries.
- Footle: unique valid surnames/player-name answers, with recognisability tiers and useful letter clues.
- Connections/Strands: complete packs, tested for one defensible solution and no unintended overlaps.
- Football Grid: complete boards with verified club appearances or verified national-team appearances; nationality alone is not a national-team cap.
- Link Up: the intended linking player must be the only valid answer under the prompt's rules.
- Missing XI/Tournament Nation: line-ups must identify match, tournament, year and source.
- Ladder/Lowball/501: compare like-for-like statistics and label the competition and date cutoff.
- Career File/Reveal/Cult Hero/Scout Signal: clue packs must be sourced, internally consistent and not leak the answer too early.
- Draft XI: player prices/eligibility and budget rules need a date-stamped source and a clear game balance policy.

## Honest rollout gates

Do not claim a game has 500–1,000 questions until its generated playable content has been counted and validated. The existing archive-derived quiz bank has 800 questions per difficulty tier, but those are mostly player-profile questions and do not constitute 800 fully reviewed questions for every game. The generated JSON is a build artifact, so CI should publish a machine-readable QA report with per-game counts, topic mix, duplicate checks, answer checks and unresolved items.

Release in stages: shared content schema and source register; quiz/records bank; answer alias and stat-scope validation; then adapt each game to its own pack type. Keep the work on the development branch until the full build and gameplay checks pass.
