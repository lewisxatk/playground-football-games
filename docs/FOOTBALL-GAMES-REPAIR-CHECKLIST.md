# Football Games — durable repair checklist

Branch: `feat/cult-hero-mystery-pack-opening`

Rule: after every successful GitHub commit, update this checklist in the next commit. Never mark a task complete until its change is committed and the relevant validation has passed. Record the latest commit SHA and the exact next task below.

## Completed and committed
- [x] Rebalance quiz runtime allocation to favour English domestic football; keep international questions occasional.
- [x] Restrict quiz answer distractors to the same competition pool and deduplicate candidate answers.
- [x] Build Link Up eligible-club list from clubs appearing in the English domestic match archive.
- [x] Import the 34,637-entry English dictionary from `outparse/english-dictionary-dataset` (CC0 1.0) to `public/data/english-wordlist.cc0.txt`.

## Implemented and committed — verification still required
- [x] Strands: load the CC0 English dictionary and accept only valid bonus words. Commit: `94420320cc`.
- [x] Strands: improve tile contrast, size, selected/found states and mobile usability. Commit: `2b9ef09dd9`.
- [x] Strands: use randomized serpentine paths so answers are genuinely hidden. Commit: `4f9824f19e`.
- [x] Footle: accept any valid five-letter guess and improve progressive letter hints. Commit: `efb520401a`.
- [x] Football Grid: rebuild around unique English club × national flag intersections; add actual flags and consistent sizing. Commits: `599d72dc76`, `30bcb621f8`, `7716f6421e`.
- [x] Football Grid: replace the incorrect “exactly 16 candidate IDs” test with a 16-cell bipartite matching check, so overlapping candidate pools are accepted only when a fully unique solution exists. Commit: `61c7a1f4d0`.
- [x] Football Grid: load a fresh archive sample on every retry and show the loading state while the new sample is fetched. Commit: `a7d4c8a4d8`.
- [x] Link Up: use English-club alias matching and exact overlap-window clues. Commits: `32baeeda0a`, `259f5a9a20`, `c510c76f0c`.
- [x] Link Up: repair the attempt gate so players get three guesses, can buy a fourth attempt, or skip without revealing the bridge. Commit: `199a453e74`.
- [x] Career File: Premier League-only eligibility with a two-season minimum, appearance clues and unlockable identity hints. Commits: `41d97fce33`, `cb49370295`.

## To do — game repairs and verification
- [ ] Footle: audit answer selection, keyboard feedback, hint costs, scoring and mobile behaviour.
- [ ] Football Grid: verify all 16 intersections, unique-player enforcement, answer acceptance, retry behaviour and mobile layout (unique-solution and fresh-retry fixes committed).
- [x] Diagnose and fix Football Grid club-name matching for dotted abbreviations such as “F.C.” / “A.F.C.”, which had reduced eligible English clubs to two. Commit: `6de5c53f6e4e3f1e418020bf136a543239927f1d`.
- [x] Add archive-backed historic Premier League player pool for Grid so all clubs/seasons are available beyond the limited Wikidata career snapshot. Commit: `eea008d3bf59c9daf18b968ceb525974301fd4ba`.
- [x] Fix the Grid retry button to reload the archive data instead of calling a stale, undefined retry handler. Commit: `f7d6f36f0e09949347ece76749a2660a68f0322b`.
- [ ] Re-run CC0 database generation and confirm the corrected club match produces at least 500 valid Football Grid packs; previous run failed with zero packs.
- [ ] Link Up: validate ten unique questions; confirm each bridge player genuinely overlaps at both English clubs; review hints, lives and scoring (attempt/extra-life flow fix committed).
- [ ] Career File: verify clue accuracy, timeline, aliases, reveal/hint costs and source provenance.
- [ ] Review Quick Quiz / The Climb pools and daily/practice allocations against the user's English-domestic preference.
- [ ] Audit all game pages for empty states, loading/error states, responsive layout, scoring and daily completion.

## Database and quality
- [ ] Audit CC0 source manifests, licences, stable IDs, provenance, deduplication and generated shard counts.
- [x] Add Football Grid generator diagnostics and expand the eligible English-club search from 48 to 80 clubs. Commit: `3fa6e5da15`.
- [x] Fix the underlying nationality-coverage gap: query Wikidata P27 nationalities, retain all returned nationalities per player, and bucket English-club spells against every recorded nationality. Commit: `2713f3da46`; the next full build must confirm this produces at least 500 valid grids.
- [ ] Check for duplicate or contradictory question facts across all game pools.
- [ ] Confirm no invented facts, unsupported club memberships, misleading international labels or incorrect answer choices.
- [ ] Update validators to enforce the intended English-first allocation and game-specific data invariants.

## Final verification
- [ ] Run `npm run validate:data`.
- [ ] Run `npm run validate:football-content` (latest run `46084112601` passed on prior head `d99d59ea3f`; rerun after subsequent Link Up fix).
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
The full CC0 database build previously failed at canonical generation with `Football Grid packs below 500: 0`. Diagnostics showed 7,171 career players but only 779 with a nationality and only 2 English clubs meeting the four-nationality threshold. Commit `2713f3da46` enriches career profiles with Wikidata P27 nationality statements and uses all nationalities per player. The next full build must confirm grid pack generation and then complete data validation + site build. Several database-build runs were cancelled by newer pushes; do not call the build verified until a non-cancelled successful run is observed.

Latest data-generator fix: `2713f3da463fe81e8a77846980ac71da0e51d0a7`.
Latest Grid runtime retry fix: `a7d4c8a4d8b45c05c0ce9a18bbdb41e1cff09d0b`.

Next action: poll the latest GitHub Actions build, inspect Football Grid pack counts and fix any remaining failures, then audit each implemented game and run the full typecheck/validation/build suite.
