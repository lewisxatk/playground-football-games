# Football Games — durable repair checklist

Branch: `feat/cult-hero-mystery-pack-opening`

Rule: after every successful GitHub commit, update this checklist in the next commit. Never mark a task complete until its change is committed and the relevant validation has passed. Record the latest commit SHA and the exact next task below.

## Completed and committed
- [x] Rebalance quiz runtime allocation to favour English domestic football; keep international questions occasional.
- [x] Restrict quiz answer distractors to the same competition pool and deduplicate candidate answers.
- [x] Build Link Up eligible-club list from clubs appearing in the English domestic match archive.
- [x] Import the 34,637-entry English dictionary from `outparse/english-dictionary-dataset` (CC0 1.0) to `public/data/english-wordlist.cc0.txt`.

## In progress
- [ ] Strands: load the CC0 English dictionary and accept only valid bonus words.
- [ ] Strands: improve tile contrast, size, selected/found states and mobile usability.
- [ ] Verify the Strands pointer/touch path logic and hint progression.

## To do — game repairs
- [ ] Footle: inspect answer selection, guess validation, keyboard feedback, hint system and scoring; add useful progressive hints without making the answer trivial.
- [ ] Football Grid: verify all 16 intersections, unique-player enforcement, input handling, retry behaviour and mobile layout.
- [ ] Link Up: validate all ten questions are unique and bridge players genuinely overlap at both English clubs; review hints, lives and scoring.
- [ ] Career File: verify clue accuracy, timeline, answer aliases, reveal/hint costs and source provenance.
- [ ] Review Quick Quiz / The Climb pools and daily/practice allocations against the user's English-domestic preference.
- [ ] Audit all game pages for empty states, loading/error states, responsive layout, scoring and daily completion.

## Database and quality
- [ ] Audit CC0 source manifests, licences, stable IDs, provenance, deduplication and generated shard counts.
- [ ] Check for duplicate or contradictory question facts across all game pools.
- [ ] Confirm no invented facts, unsupported club memberships, misleading international labels or incorrect answer choices.
- [ ] Update validators to enforce the intended English-first allocation and game-specific data invariants.

## Final verification
- [ ] Run `npm run validate:data`.
- [ ] Run `npm run validate:football-content`.
- [ ] Run `npm run typecheck` and `npm run build`.
- [ ] Review GitHub Actions results and fix failures.
- [ ] Report exact changed files, commits, checks passed/failed and anything still needing live browser testing.

## Resume pointer
Latest completed commits:
- `b75aa050150c6c2756e36e8a85e6d90479c0d1e7` — English-first quiz allocation.
- `f83b0d6ec52b405a55f20f1ddaa5b93bd01c4500` — competition-safe distractors and English-club Link Up filter.
- `44166c4223b7292ca5e210060a8aa5ac5d595d00` — CC0 English dictionary import.

Next action: implement and commit Strands dictionary validation and visual improvements, then immediately tick the corresponding items above.
