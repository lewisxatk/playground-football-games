# Football Games — master repair checklist

**Branch:** `feat/cult-hero-mystery-pack-opening`

**Working rule:** after each implementation commit, update this file immediately. A task is only marked verified after the relevant automated check or live test passes. If work is interrupted, resume from the final section.

## 1. Implemented and committed

### Quiz engine and question quality
- [x] English-first question allocation: 80% English for five-question rounds, 90% for practice rounds, and 15 of 17 English questions in the daily round.
- [x] Restrict non-English exceptions to UEFA Champions League and FIFA World Cup questions; prevent unrelated international fixtures or fallback leakage. Commit: `89ed93ff83`.
- [x] Use same-competition distractors and deduplicate candidate answers.
- [x] Validate every quiz tier and the exact daily 15/2 mix. Commit: `1a593d123f`.
- [x] Update roadmap and engine documentation to match the English-first policy. Commits: `270f40b816`, `da918ba6c3`.

### Footle
- [x] Accept five-letter guesses, provide progressive letter hints, and apply a points system. Commit: `efb520401a`.
- [x] Prioritise English-league player surnames and normalize answer variants. Commits: `b782962aad`, `a1be850312`.

### Football Grid
- [x] Rebuild as a 4×4 English club × nationality grid with flags and responsive sizing. Commits: `599d72dc76`, `30bcb621f8`, `7716f6421e`.
- [x] Validate that a full 16-player unique assignment exists instead of incorrectly requiring all candidate lists to contain exactly 16 IDs. Commit: `61c7a1f4d0`.
- [x] Move the player pool to the 60k-player OpenFootballBase archive and use the generated English/Premier League club index. Commits: `720b3fba6e`, `1cf67dd5bf`, `eea008d3bf`.
- [x] Fix dotted club suffix matching (F.C./A.F.C.) and the retry handler; retry rotates the static archive sample. Commits: `6de5c53f6e`, `f7d6f36f0e`, `ca2904fc91`.

### Strands
- [x] Import a 34,637-word CC0 English dictionary from `outparse/english-dictionary-dataset`. Commit: `44166c4223`.
- [x] Add exact source commit, source file, normalization and CC0 licence metadata for the dictionary. Commit: `bb708414ff`.
- [x] Validate bonus words against the dictionary and award a hint for every three recognised bonus words. Commit: `94420320cc`.
- [x] Fix dictionary initialization syntax and mode-switch reset state. Commits: `ff2de43627`, `ed0bf93d76`.
- [x] Improve board styling, tile contrast, selected/found states and mobile usability. Commit: `2b9ef09dd9`.
- [x] Randomise hidden word paths so the answers are not exposed by a simple row/column pattern. Commit: `4f9824f19e`.
- [x] Generate at least 500 boards, prioritising English-league themes and using CC0 nationality packs as a fallback. Commit: `0c822718d9`.
- [x] Normalize English-league surnames and make theme clues less revealing. Commits: `703205994d`, `2e1d5cf078`, `b97f0aefd3`.

### Link Up
- [x] Move runtime puzzle generation to the season-by-season OpenFootballBase archive (CC BY-SA 4.0), rather than relying on the 47-question Wikidata snapshot. Commits: `6433666ce7`, `0b0badf03c`, `3aa6e8811a`.
- [x] Require exactly one bridge player whose dated spells overlap with both endpoint players at the two English clubs.
- [x] Prioritise Premier League clubs and use lower English leagues to fill the pool.
- [x] Expand the generator to a 750-question target and use recorded end years conservatively; a missing end date is not assumed to continue to the present. Commit: `df2561a004`.
- [x] Make difficulty meaningful with 4, 5, 6 or 8 answer options and unique displayed player names. Commits: `a4467ac6af`, `fe9c77d924`, `f506454f32`.
- [x] Add four progressive hints, three guesses, an optional fourth attempt, and a skip that does not reveal the answer. Commit: `199a453e74`.
- [x] Display the actual verified candidate-pool count in the game header. Commit: `4b4f872586`.
- [x] Show the source attribution: OpenFootballBase-Data, CC BY-SA 4.0.
- [x] Keep the CC0 Wikidata career-history shard limited to verified English-club career profiles for Career File/Cult Hero; remove the obsolete Wikidata Link Up pack generator and its 500-pack validator because Link Up now generates from the season archive. Commits: `49003989e8`, `336c9b7705`, `f65880e142`, `b4b61732c8`.
- [x] Remove the stale `linkUpPacks` build-report reference and report the archive-player count separately from the runtime puzzle target. Commit: `64cb68812e`.
- [x] Remove the remaining obsolete Wikidata Link Up ID/options validation blocks from the canonical builder. Commit: `2e84ffcd8a`.

### Career File and archive
- [x] Restrict Career File eligibility to Premier League players with at least two seasons; add appearance clues and unlockable identity hints. Commits: `41d97fce33`, `cb49370295`.
- [x] Use the generated historic Premier League club index for eligibility. Commit: `ae2294da34`.
- [x] Add an integrity validator for the 61-shard, 60k-player archive: source release, CC BY-SA 4.0 licence, file sizes, SHA-256 hashes, row counts, stable IDs and duplicate IDs. Commits: `f4c5c56b1e`, `d15344a9fd`.
- [x] Validate the archive's actual `spells` field (not the mapped runtime `careerSpells` field) in the raw shard payload. Commit: `fb1a78c107`.

## 2. Automated verification

- [x] `npm run validate:football-content` passed on commit `1a593d123f` (GitHub Actions run `46085667903`).
- [x] Re-ran `validate:football-content` after the archive and Link Up changes; passed on commit `b4b61732c8` (GitHub Actions run `46086336629`).
- [ ] Full CC0 database generation and `npm run validate:data`, including the lean English-only career-history shard and 24 MB per-asset size limit.
- [x] Fix TypeScript build errors from the archive adapter cleanup and Strands fallback pack type; remove the now-unused position helper. Commits: `1adb3a538e`, `f8f057a181`.
- [ ] Full site typecheck and production build.
- [ ] Confirm generated database manifests, shard counts, licences and provenance.
- [ ] Confirm every required game pool reaches its target without fabricated or duplicate facts.

**Current build:** GitHub Actions run `46086405690` was building commit `64cb68812ecc7bdc5dc5291f93fcd7d4d74ff609`; the final cleanup is now committed as `2e84ffcd8a` and needs a fresh build run. The previous 77 MB career-history shard was fixed by capping the separate Wikidata Cult Hero snapshot to one 50,000-row page; Link Up now uses the full season archive. The current run must complete canonical generation, data validation and TypeScript/site build before being marked green. Upstream licence checks passed. The canonical generation step must prove all remaining shard minimums and keep the career-history payload under the 24 MB per-asset limit before the typecheck/site build can run. Do not mark the build complete until the newest run finishes successfully and its generated report is inspected.

## 3. Live game verification still required

- [ ] Rebuild Lowball as a seven-question English-football daily game where uncommon valid answers score lower. Reference research and non-fabricated crowd-score rules: `docs/LOWBALL_RESEARCH_AND_PLAN.md`.
- [ ] Footle: answer acceptance, keyboard feedback, hint costs, scoring, win/loss and iPhone layout.
- [ ] Football Grid: confirm 16 valid intersections, no player reuse, aliases, fresh retry sample and mobile layout.
- [ ] Strands: confirm dictionary loading, bonus-word validation, all theme paths, multi-hints, scoring and touch dragging.
- [ ] Link Up: confirm the visible pool count is at least 500, ten unique questions are available at every difficulty, and each answer is the only valid bridge.
- [ ] Career File: verify clue accuracy, timeline, aliases, reveal/hint costs and source provenance.
- [ ] Quick Quiz / The Climb: verify the English-first mix, daily quotas, scoring and distractor accuracy.
- [ ] Audit all games for loading, empty, error, completed and retry states.
- [ ] Check every game page's distinct visual treatment, typography, animations and responsive layout.

## 4. Data integrity and final sign-off

- [ ] Audit remaining CC0 source manifests, licences, stable IDs, provenance and deduplication.
- [ ] Check for duplicate or contradictory question facts across all pools.
- [ ] Confirm no invented facts, unsupported club memberships, misleading international labels or ambiguous answers.
- [ ] Review the final GitHub Actions report and fix every failure.
- [ ] Record exact files changed, commit SHAs, pool counts, checks passed/failed and anything that still needs browser testing.

## 5. Resume pointer

**Next action:** poll GitHub Actions run `46086484586`. If it succeeds, inspect its build report and generated pool counts, then mark the automated checks above. If it fails, fix the first failing stage before making unrelated changes.

Keep this checklist current after every commit. Do not claim a successful build or a 500+ runtime pool until the evidence is visible.

- [x] Keep the CC0 Wikidata career snapshot at one 50,000-statement page (about 9 MB in the last committed manifest) for Cult Hero; Link Up now uses the separate 60k-player season archive, so a 200k-row career shard is unnecessary and exceeded the 24 MB Pages asset cap. Commit: `336c9b7705`.
