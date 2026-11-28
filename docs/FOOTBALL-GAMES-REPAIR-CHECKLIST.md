# Football Games — durable repair checklist

Branch: `feat/cult-hero-mystery-pack-opening`

Rule: after every successful GitHub commit, update this checklist in the next commit. Never mark a task complete until its change is committed and the relevant validation has passed. Record the latest commit SHA and the exact next task below.

## Completed and committed
- [x] Rebalance quiz runtime allocation to favour English domestic football; keep international questions occasional.
- [x] Restrict quiz runtime selection to English domestic, UEFA Champions League and FIFA World Cup categories only; block unrelated internationals and fallback leakage. Commit: `89ed93ff83`.
- [x] Strengthen quiz-pool validation to require sufficient English/approved international coverage in every tier and verify the exact 15/2 daily mix quotas. Commit: `1a593d123f`.
- [x] Restrict quiz answer distractors to the same competition pool and deduplicate candidate answers.
- [x] Build Link Up eligible-club list from clubs appearing in the English domestic match archive.
- [x] Import the 34,637-entry English dictionary from `outparse/english-dictionary-dataset` (CC0 1.0) to `public/data/english-wordlist.cc0.txt`.

## Implemented and committed — verification still required
- [x] Strands: load the CC0 English dictionary and accept only valid bonus words. Commit: `94420320cc`.
- [x] Fix a missing closing parenthesis in Strands dictionary initialization that would have broken the site build. Commit: `ff2de43627`.
- [x] Strands: improve tile contrast, size, selected/found states and mobile usability. Commit: `2b9ef09dd9`.
- [x] Strands: use randomized serpentine paths so answers are genuinely hidden. Commit: `4f9824f19e`.
- [x] Strands: guarantee at least 500 boards by prioritising English-league surname themes and filling any shortfall from the CC0 nationality packs. Commit: `0c822718d9`.
- [x] Strands: normalize English-league surnames and keep theme clues less revealing. Commits: `703205994d`, `2e1d5cf078`, `b97f0aefd3`.
- [x] Footle: accept any valid five-letter guess and improve progressive letter hints. Commit: `efb520401a`.
- [x] Footle: prioritize English-league players and normalize English surname answers. Commits: `b782962aad`, `a1be850312`.
- [x] Football Grid: rebuild around unique English club × national flag intersections; add actual flags and consistent sizing. Commits: `599d72dc76`, `30bcb621f8`, `7716f6421e`.
- [x] Football Grid: replace the incorrect “exactly 16 candidate IDs” test with a 16-cell bipartite matching check, so overlapping candidate pools are accepted only when a fully unique solution exists. Commit: `61c7a1f4d0`.
- [x] Football Grid: load a fresh archive sample on every retry and show the loading state while the new sample is fetched. Commits: `a7d4c8a4d8`, `ca2904fc91` (retry now rotates static archive shard sample).
- [x] Football Grid: normalize club suffixes before punctuation removal, so names such as “Manchester United F.C.” match their canonical club label. Commit: `18b31b7933`.
- [x] Football Grid: move to the static OpenFootballBase player archive plus the generated English/Premier League club index; remove the superseded Wikidata grid sampler. Commits: `720b3fba6e`, `1cf67dd5bf`.
- [x] Link Up: use English-club alias matching and exact overlap-window clues. Commits: `32baeeda0a`, `259f5a9a20`, `c510c76f0c`.
- [x] Link Up: repair the attempt gate so players get three guesses, can buy a fourth attempt, or skip without revealing the bridge. Commit: `199a453e74`.
- [x] Career File: Premier League-only eligibility with a two-season minimum, appearance clues and unlockable identity hints. Commits: `41d97fce33`, `cb49370295`.
- [x] Career File: filter the static archive draw against the generated past/present Premier League club index, retaining the English fallback only if the index is unavailable. Commit: `ae2294da34`.

## To do — game repairs and verification
- [ ] Footle: audit answer selection, keyboard feedback, hint costs, scoring and mobile behaviour.
- [ ] Football Grid: verify all 16 intersections, unique-player enforcement, answer acceptance, retry behaviour and mobile layout (unique-solution and fresh-retry fixes committed).
- [x] Diagnose and fix Football Grid club-name matching for dotted abbreviations such as “F.C.” / “A.F.C.”, which had reduced eligible English clubs to two. Commit: `6de5c53f6e4e3f1e418020bf136a543239927f1d`.
- [x] Add archive-backed historic Premier League player pool for Grid so all clubs/seasons are available beyond the limited Wikidata career snapshot. Commit: `eea008d3bf59c9daf18b968ceb525974301fd4ba`.
- [x] Fix the Grid retry button to reload the archive data instead of calling a stale, undefined retry handler. Commit: `f7d6f36f0e09949347ece76749a2660a68f0322b`.
- [ ] Re-run CC0 database generation and confirm the corrected club match produces at least 500 valid Football Grid packs; previous run failed with zero packs.
- [x] Link Up: generate ten unique runtime questions from the static OpenFootballBase season archive, requiring one shared teammate with overlapping dated spells at both English clubs; Premier League first, other English leagues as fallback. Commits: `6433666ce7`, `0b0badf03c`, `3aa6e8811a`.
- [x] Link Up: display the exact overlapping year windows, six answer options, four progressive hints, three guesses plus an extra attempt, and a skip that does not reveal the answer. In-game source credit: OpenFootballBase-Data, CC BY-SA 4.0.
- [x] Keep Link Up answer choices English-football based, with unique displayed names and no endpoint/answer duplicates. Commits: `d29c328110`, `3d2ffd924e`.
- [ ] Verify the runtime archive reliably produces ten unique links on fresh samples and remains responsive on mobile.
- [x] Link Up database pool: replace the single 50,000-row Wikidata career query with up to four deterministic 50,000-row pages (ORDER BY player and statement), retaining P27 nationality labels and deduplicating statements. Commit: `dbb6a8fcc3`.
- [x] Keep the existing verified English-club Link Up shard generator connected while the larger season-stat runtime migration is unfinished; prevent a zero-question Link Up page. Commit: `e58e554bae`.
- [x] Keep the verified English-club Wikidata shard as a secondary data source while Link Up uses the larger runtime season archive. Commits: `dbb6a8fcc3`, `e58e554bae`.
- [ ] Career File: verify clue accuracy, timeline, aliases, reveal/hint costs and source provenance (Premier League eligibility now uses generated club index).
- [ ] Review Quick Quiz / The Climb pools and daily/practice allocations against the user's English-domestic preference.
- [ ] Audit all game pages for empty states, loading/error states, responsive layout, scoring and daily completion.

## Database and quality
- [x] Add an integrity validator for the 61-shard, 60k-player OpenFootballBase archive: check source release, CC BY-SA 4.0 licence, file sizes, SHA-256 hashes, row counts, stable IDs and duplicate IDs across shards. Commits: `f4c5c56b1e`, `d15344a9fd`.
- [ ] Audit remaining CC0 source manifests, licences, stable IDs, provenance, deduplication and generated shard counts.
- [x] Add Football Grid generator diagnostics and expand the eligible English-club search from 48 to 80 clubs. Commit: `3fa6e5da15`.
- [x] Fix the underlying nationality-coverage gap: query Wikidata P27 nationalities, retain all returned nationalities per player, and bucket English-club spells against every recorded nationality. Commit: `2713f3da46`; the next full build must confirm this produces at least 500 valid grids.
- [ ] Check for duplicate or contradictory question facts across all game pools.
- [ ] Confirm no invented facts, unsupported club memberships, misleading international labels or incorrect answer choices.
- [ ] Update validators to enforce the intended English-first allocation and game-specific data invariants.

## Final verification
- [ ] Run `npm run validate:data`.
- [x] Run `npm run validate:football-content` — GitHub Actions run `46085013833` passed on commit `dbb6a8fcc3`. This validates the legacy football question bank; the full generated-data checks remain pending.
- [ ] Run `npm run typecheck` and `npm run build` (the archive-backed Grid retry handler was fixed before this check).
- [ ] Review GitHub Actions results and fix failures.
- [ ] Report exact changed files, commits, checks passed/failed and anything still needing live browser testing.

## Resume pointer
Latest completed commits:
- `b75aa050150c6c2756e36e8a85e6d90479c0d1e7` — English-first quiz allocation.
- `f83b0d6ec52b405a55f20f1ddaa5b93bd01c4500` — competition-safe distractors and English-club Link Up filter.
- `44166c4223b7292ca5e210060a8aa5ac5d595d00` — CC0 English dictionary import.
- `94420320cc` — Strands dictionary validation.
- `2b9ef09dd9` — Strands arcade visual redesign.
- `efb520401a` — Footle guess and hint improvements.
- `599d72dc76` — Football Grid unique intersection rebuild.
- `41d97fce33` — Career File eligibility and appearance clues.

Latest relevant implementation commits: `eea008d3bf59c9daf18b968ceb525974301fd4ba` (archive-backed Premier League Grid player pool); `f7d6f36f0e09949347ece76749a2660a68f0322b` (Grid retry handler). `6de5c53f6e4e3f1e418020bf136a543239927f1d` (club suffix normalisation fix). `199a453e743fc5af6eda18d97fed2cfc99a56250` (Link Up attempt/extra-life flow); `61c7a1f4d03dd02a743d5718ffd9396852c268d6` (Football Grid unique-solution feasibility).
Latest completed football-content validation: success on `d99d59ea3f545c41a2d7558654a406587cfa4fec`; rerun after the Link Up fix.
The full CC0 database build passed the Football Grid stage after moving it to the static OpenFootballBase archive and generated English-club index. The earlier 47-puzzle Wikidata Link Up limit has been superseded by runtime generation from the static season-by-season archive. Preserve the exact-one-overlapping-teammate rule and verify ten distinct questions on each sample. Do not call the build verified until data validation and site build pass.

Latest data-generator fixes: `2713f3da463fe81e8a77846980ac71da0e51d0a7` (P27 nationality coverage); `0c822718d9` (Strands 500-board fallback); `dbb6a8fcc35bade22960e8bd6fc0f8bc0a920d18` (Wikidata pagination retained as a secondary archive).
Latest Grid runtime fixes: `18b31b793394ed8808fbe5b97ba08bfc79441f44` (club-name normalization); `720b3fba6e` and `1cf67dd5bf` (static archive + generated club index); `ca2904fc9127738b4db1d6abfdd221a336a80df4` (static-shard retry rotation).

Next action: verify the latest selector-filter and stricter validator commits with the full CC0 database build; inspect quiz counts, Football Grid pack counts and Link Up sample uniqueness; then audit all games and run the full typecheck/validation/build suite.

- [x] Remove obsolete duplicate Grid builder and normalize dotted club suffixes in active runtime index. Commit: `f4dba2319d2bd2c3ba5cdf8a4aeff10d438052d7`.

- [x] Fix Strands mode-switch reset to clear the new multi-hint state correctly. Commit: `ed0bf93d76`.
- [x] Fix missing parenthesis in CC0 dictionary Set initialization so Strands compiles and can load bonus-word validation. Commit: `ff2de436279899eeff0f8db8f4d1d2c2f8984b88`.
