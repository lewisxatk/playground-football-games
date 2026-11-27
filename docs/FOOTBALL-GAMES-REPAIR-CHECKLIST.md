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
- [x] Link Up: use English-club alias matching and exact overlap-window clues. Commits: `32baeeda0a`, `259f5a9a20`, `c510c76f0c`.
- [x] Link Up: repair the attempt gate so players get three guesses, can buy a fourth attempt, or skip without revealing the bridge. Commit: `199a453e74`.
- [x] Career File: Premier League-only eligibility with a two-season minimum, appearance clues and unlockable identity hints. Commits: `41d97fce33`, `cb49370295`.

## To do — game repairs and verification
- [ ] Footle: audit answer selection, keyboard feedback, hint costs, scoring and mobile behaviour.
- [ ] Football Grid: verify all 16 intersections, unique-player enforcement, answer acceptance, retry behaviour and mobile layout.
- [ ] Link Up: validate ten unique questions; confirm each bridge player genuinely overlaps at both English clubs; review hints, lives and scoring (attempt/extra-life flow fix committed).
- [ ] Career File: verify clue accuracy, timeline, aliases, reveal/hint costs and source provenance.
- [ ] Review Quick Quiz / The Climb pools and daily/practice allocations against the user's English-domestic preference.
- [ ] Audit all game pages for empty states, loading/error states, responsive layout, scoring and daily completion.

## Database and quality
- [ ] Audit CC0 source manifests, licences, stable IDs, provenance, deduplication and generated shard counts.
- [ ] Check for duplicate or contradictory question facts across all game pools.
- [ ] Confirm no invented facts, unsupported club memberships, misleading international labels or incorrect answer choices.
- [ ] Update validators to enforce the intended English-first allocation and game-specific data invariants.

## Final verification
- [ ] Run `npm run validate:data`.
- [ ] Run `npm run validate:football-content` (latest run `46084112601` passed on prior head `d99d59ea3f`; rerun after subsequent Link Up fix).
- [ ] Run `npm run typecheck` and `npm run build`.
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

Latest relevant implementation commit: `199a453e743fc5af6eda18d97fed2cfc99a56250` (Link Up attempt/extra-life flow).
Latest completed football-content validation: success on `d99d59ea3f545c41a2d7558654a406587cfa4fec`; rerun after the Link Up fix.
The full CC0 database build was still in progress on the previous head and may be cancelled by subsequent source changes. Do not call the build verified until a non-cancelled successful run is observed.

Next action: poll the latest GitHub Actions runs, fix any failures, then audit each implemented game and run the full typecheck/validation/build suite.
