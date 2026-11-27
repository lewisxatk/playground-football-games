# PLAYGROUND — Master Build Checklist & Handover

**Last audited:** 2026-11-27  
**Repository:** https://github.com/lewisxatk/playground-football-games  
**Production:** https://playground-football-games.pages.dev  
**Purpose:** This file is the persistent project memory and source of truth for implementation status. Update it at the end of every development batch. Do not mark a task complete merely because a route or visual mock-up exists; the behaviour must be implemented and build-tested.

## Status key

- [x] **Done** — present in the current code and build-verified.
- [~] **Partial** — code or groundwork exists, but required functionality, data coverage or verification is missing.
- [ ] **Not done** — still needs implementation.
- [!] **Blocker / decision** — needs a technical or data decision before claiming completion.

## 0. Current verified baseline

- [x] Fourteen individual game routes exist, with a top-right game menu and home arcade directory.
- [x] The four original game routes remain: Lowball, The Climb, Draft XI and Career File.
- [x] Ten added routes remain: Footle, Connections, Football Grid, Ladder, The Reveal, Football 501, Link Up, Missing XI, Strands and Scout Signal.
- [x] A local Locker Room profile exists: nickname, current/best streak, daily scores and game history stored in browser localStorage.
- [x] Career File recent-player exclusions now persist in localStorage across refreshes (capped at 600 IDs); full-pool diversity still needs testing.
- [x] Daily score/streak date uses UTC day boundaries (00:00 UTC, equivalent to GMT midnight; UK BST is one hour ahead).
- [x] Daily and Practice modes exist on the game framework. Practice is intended to be repeatable and must not award daily streak credit.
- [x] A shared visual shell, responsive styles, Motion for React and some animated pitch/game elements exist.
- [x] A club badge index exists at `public/data/club-badges-index.json` (about 4,700 SVG path entries) and `src/ClubBadge.tsx` can resolve a crest with a text fallback.
- [x] `getArchiveGamePlayers()` exists in `src/careerFileData.ts`. It can query an archive sample and return a player record with career clubs, appearances, goals, league stats, nationality, position, season span, international caps/goals and birth date.
- [x] Career File now bounds a draw to a smaller random candidate batch and at most six full player lookups; this is a performance guard, not proof that the archive is fast or its draws are diverse enough.
- [x] Lowball hides the two goal totals until a selection is made.
- [x] Footle has Wordle-style green/yellow/grey tile states, and its practice selection is random from the current small word list.
- [x] The latest production commit verified in this audit is `a2eed0d506059a82c1533bc4ae281f7fa3cada79` (“Fix duplicate club badge aliases blocking production builds”). GitHub Actions passed and Cloudflare Pages reported a successful deploy.
- [!] **Important:** the archive player pool function and hook are not yet wired into all the game pages. Most games still read the small hand-curated `src/playerData.ts` arrays. The 1,600-player query is not a 1,600-player live game experience yet.
- [!] **Important:** the current small player list, question lists and game examples contain hand-seeded records. They are not a massive audited database and must not be described as one.
- [!] **Important:** no head-to-head room system exists yet.
- [!] **Important:** no persistent server account exists. Locker Room is device/browser-local and can be lost if browser data is cleared.

## 1. Master football data platform

### 1.1 Player identity and shared archive
- [ ] Build a single shared, reusable player database for all games; stop maintaining separate tiny hard-coded lists in each game.
- [ ] Connect the archive-backed pool to Footle, Scout Signal, Career File, Lowball, Connections, Grid, Ladder, Link Up, Missing XI and both new games.
- [ ] Build a stable canonical identity layer (Wikidata QID where available; careful name fallback where it is not).
- [ ] Store full name, display name, surname, known aliases, nationality, position, date of birth/age precision, current/last known club, league, career clubs, career years and international teams.
- [ ] Store appearances/goals at club and season level wherever the source actually supplies them; keep league, domestic cup, continental and all-competition scope separate.
- [ ] Store assists, caps, international goals and other statistics only when the source has them.
- [ ] Record source URL/page, source revision/date, data retrieval date and coverage flags at the record or field level.
- [ ] Deduplicate players and club spells; handle accents, hyphens, compound surnames, aliases, loans, overlapping spells, calendar-year seasons and transfer dates.
- [ ] Show “not recorded” distinctly from zero. Do not silently infer missing appearances, goals, fees or positions.
- [ ] Add data quality checks for impossible dates, duplicate spells, suspicious totals, incompatible club identity and invalid country/competition.
- [ ] Add a visible data coverage/source note to relevant games.

### 1.2 Transfer histories and fees
- [ ] Integrate the transfer dataset into the shared data model rather than downloading and parsing the full CSV on a mobile device for each clue.
- [ ] Match records to canonical player and club identities, retaining unmatched rows separately for review.
- [ ] Display transfer year, origin, destination, raw fee and cleaned fee; preserve “undisclosed”/unknown rather than inventing a price.
- [ ] Distinguish reported nominal fee from adjusted/estimated value; never mix market value with transfer fee.
- [ ] Make transfer hints useful in Career File, Scout Signal and future transfer games.
- [ ] Add source, licence and coverage disclosure.

### 1.3 Lightweight delivery / performance
- [ ] Move heavy archive scanning away from the initial iPhone page load.
- [ ] Pick and document the delivery architecture: cached Cloudflare Worker/Durable Object query API, generated compact JSON shards, or a hybrid.
- [ ] Do not ship DuckDB/WASM plus large Parquet scans to every visitor just to start a quick game.
- [ ] Generate/cache shared player indexes and per-game question pools; use compression, cache headers, deterministic daily seeds and lazy loading.
- [ ] Keep player-pool refresh and daily puzzle generation server-side or build-time where possible.
- [ ] Add loading progress, retry, timeout, offline/error states and telemetry that does not collect unnecessary personal data.
- [ ] Verify actual iPhone Safari load time, memory use, repeated game rounds and cache behaviour.

## 2. Badges, flags and visual data

- [x] Badge path index and `ClubBadge` component exist, with initials fallback.
- [~] Check actual asset path resolution for a representative set of English, Spanish, Italian, German, French and other-world clubs. Some manual aliases may not match the indexed SVG paths.
- [ ] Add badge imagery to Scout Signal’s matching club/current-club cells. A match must turn green and show the correct club badge plus club name, not only a tick.
- [ ] Use country flags for nationality matches and position/league icons or clear labels for the other attributes.
- [ ] Add national-team crests and tournament badges for the international tournament game.
- [ ] Lazy-load images, cache results, reserve fixed image dimensions and use readable initials when a crest is unavailable.
- [ ] Review logo repository terms and underlying crest/trademark rights; maintain attribution and do not imply that a club endorses PLAYGROUND.
- [ ] Add a logo source/licensing note in the project.

## 3. Existing game upgrades

### 3.1 Career File
- [~] Faster bounded player draw committed; live usability and repeat avoidance still require real-device verification.
- [ ] Connect a substantially larger, diversified candidate source so Easy/Medium/Hard/Cult Hero/Extreme stop repeating a tiny set.
- [ ] Persist a recent-player exclusion list (at least across page refreshes on the same device) and only recycle after the eligible pool has been exhausted.
- [ ] Confirm difficulty tiers produce genuinely appropriate players, with visible sample counts and balanced coverage.
- [ ] Show two free season clues with club, season, appearances and goals only when both statistics are present.
- [ ] Make season rows and club spells readable, with clear gaps and unavailable statistics.
- [ ] Keep purchasable position, nationality, career dates, club count, appearances/goals, international record and transfer-fee hints.
- [ ] Ensure each hint has a clear point cost; failed/unavailable data lookups must not deduct points.
- [ ] Fix mobile form sizing/keyboard behaviour and all low-contrast text.
- [ ] Test thousands of draws across every difficulty/league filter and check duplicate rate.

### 3.2 Who’s Got More? / Lowball
- [x] Hide totals until the player chooses; reveal the correct answer after the choice.
- [ ] Add Easy, Standard, Hard and Extreme difficulty options.
- [ ] Add an endless survival/practice streak: one wrong answer ends the streak; increase difficulty after each five correct answers.
- [ ] Generate random matchups from the shared archive, using only comparable statistics and clearly naming the statistic/competition/season.
- [ ] Build a large pool (thousands where source coverage supports it) rather than repeating ten fixed names.
- [ ] Show a proper end-of-run score, longest streak and shareable result.
- [ ] Ensure daily challenge is deterministic/shared, while unlimited practice gets random fresh matchups.

### 3.3 Scout Signal
- [~] Six attribute comparisons exist in the current small local player list (nation, shared club, current club, position, league, age band).
- [ ] Switch target and guesses to the shared archive-backed player pool.
- [ ] Show each attribute independently; only matching attribute cells turn green.
- [ ] For club matches, show the actual club crest and name; for nation matches, show flag/name.
- [ ] Add helpful labels for current-club match versus shared-career-club match.
- [ ] Difficulty settings, larger target pool, no-repeat practice and more robust alias matching.
- [ ] Ensure the daily target is shared across users and not accidentally changed by rerender/reset.

### 3.4 Footle (football Wordle)
- [x] Green/yellow/grey Wordle tile evaluation exists and the answer is hidden until completion.
- [ ] Expand to a large vetted surname pool from the player database; include names with an appropriate Wordle length and unambiguous accepted spellings.
- [ ] Randomize unlimited practice with no immediate repeats; keep a deterministic shared daily answer.
- [ ] Verify grey letters remain grey in the on-screen keyboard as well as the guess grid, without disabling their use.
- [ ] Add a proper on-screen keyboard, coloured-key priority (green over yellow over grey), animations, accessible labels and share grid.
- [ ] Ensure full-name/surname aliases do not create duplicate or unfair answers.

### 3.5 Football Strands
- [~] A 6×8 (48-cell) board and ten starter packs exist; current selection is tap-based, not real drag-to-connect.
- [ ] Implement pointer/touch drag selection following adjacent cells, with live highlighted path, release-to-submit, cancel/undo and no accidental page scrolling.
- [ ] Keep the NYT-style 6×8 footprint and circular letter cells; make it responsive without changing the board dimensions.
- [ ] Verify every pack has exactly 48 letters, valid non-overlapping paths, full-name spangram joining opposite sides, and all footballer names are valid.
- [ ] Generate many unique boards from the shared player database while maintaining solvable paths and valid word lengths; avoid nonsensical arbitrary letter placement.
- [ ] Add Strands-style hint progression, found-word colours, animated path tracing and end-of-board completion.
- [ ] 10 daily boards; unlimited randomly generated practice boards.

### 3.6 Fill the Grid
- [ ] Rebuild as a 4×4 grid (16 answers), not the current 3×3 Premier-League-only grid.
- [ ] Add selectable Easy, Standard, Hard and Extreme difficulties.
- [ ] Easy: broadly famous players/simple club-country intersections.
- [ ] Standard: top-five leagues and senior national teams.
- [ ] Hard: broader European/global clubs, historical players and less obvious intersections.
- [ ] Extreme: historic and global club/national combinations where source coverage is strong.
- [ ] Use club crests and national flags in row/column clues.
- [ ] Accept valid aliases and any qualifying player, not one hard-coded answer only.
- [ ] Add optional limited guesses/hints, completed-cell animations and a daily/unlimited split.

### 3.7 The Connection
- [~] A 16-tile/4-groups game exists, but only four hand-made groups currently power it.
- [ ] Generate large numbers of valid combinations from the shared player data.
- [ ] Add Easy, Standard, Hard and Extreme categories (clubs, nationalities, positions, teammates, competitions, career overlaps, eras, honours when verifiable).
- [ ] Use constraint-based generation so each tile has one intended group and accidental multiple valid groupings are checked.
- [ ] Unlimited practice should draw a fresh board, avoid repeats and show category explanations after solve.
- [ ] Preserve a deterministic daily board per UTC date.

### 3.8 The Ladder
- [~] Basic up/down arrow reordering and a small fixed Premier League goals list exist.
- [ ] Add true touch-friendly drag-and-drop reordering with Motion layout animation; keep arrow buttons as accessible fallback.
- [ ] Add selectable difficulty and a larger archive-backed set of statistics (league goals, appearances, assists, international caps, transfer fees when comparable, etc.).
- [ ] Clearly label statistic scope, season/timeframe and units.
- [ ] Build fresh random five-player sets, no immediate repeats, unlimited practice and a shared daily puzzle.
- [ ] Animate order changes and result reveal.

### 3.9 Football 501
- [~] A basic countdown from 501 exists but currently uses a tiny fixed goals list and needs clearer gameplay.
- [ ] Research and settle scoring rules: selecting a player subtracts their stat; bust means crossing below zero; exact zero is best, with a clear bank/closest-finish scoring system if enabled.
- [ ] Add Easy/Standard/Hard/Extreme pools and more usable statistics/modes.
- [ ] Add a clear darts-style scoreboard, animated dartboard/flight/checkout feedback and haptics-safe mobile interactions.
- [ ] Randomize player choices from the shared database and prevent duplicate player picks within a run.
- [ ] Add daily challenge and unlimited practice.

### 3.10 The Link Up
- [~] Four hand-written examples exist; the current version is a typed-name answer.
- [ ] Standard mode: multiple choice with one unambiguous correct link.
- [ ] Hard/Extreme: typed surname/full-name response, or a single clear player from verified teammate intersection.
- [ ] Derive candidates from overlapping club spells/seasons where possible; a broad shared-club career without season overlap is not sufficient proof of being teammates.
- [ ] Provide the two endpoints, sensible hints, explanation and evidence source.
- [ ] Generate thousands of combinations from archive relationships, test uniqueness and exclude ambiguous questions.
- [ ] Unlimited mode and difficulty selector.

### 3.11 Missing XI
- [~] A fixed ten-player example and four options exist, but not a proper pitch formation.
- [ ] Render a responsive 2D pitch with formation positions and numbered player markers.
- [ ] Use verified historical starting elevens and competitions/matches.
- [ ] Support multiple formations and missing positions; answer by selecting an option or typing.
- [ ] Add difficulty, random match archive, badges, match/tournament context and unlimited practice.
- [ ] Do not use a “starting XI” example unless the listed ten plus the answer truly match the starting lineup.

## 4. New games requested

### 4.1 Tournament Nation
- [ ] Add a new standalone route and menu entry.
- [ ] Show a major tournament and year (World Cup / Euros first; extend when data is sound), with a full 11-position layout.
- [ ] Each position reveals the player's club from that tournament's squad; user guesses the national team.
- [ ] Start at the 1980s and go forward; avoid tournaments before 1980.
- [ ] Use verified tournament squads/starting XIs, player positions and the club they represented at that time.
- [ ] Add progressive hints, difficulty, badges, daily and unlimited modes.

### 4.2 Timed Football Quiz
- [ ] Add a standalone route and menu entry.
- [ ] Standard format: 15 questions (5 Easy, 5 Medium, 5 Hard), five answer options each, 10 seconds per answer.
- [ ] Add a typewriter question reveal ending at the question mark; only then reveal the answer options and start the timer.
- [ ] At time-out or answer selection, lock the answer, show correct answer and a short source-backed explanation, then continue.
- [ ] End screen shows score, correct answers, missed answers and shareable result.
- [ ] Add a separate difficulty selector for Easy / Medium / Hard / Extreme-only runs.
- [ ] Build a large validated question bank and/or generate safe questions from sourced structured data; randomize with no immediate repeats.
- [ ] Do not generate factual questions from missing or uncertain fields. Store answer, distractors, explanation, source and difficulty with every authored question.

## 5. Visual design, accessibility and motion

- [~] PLAYGROUND identity, multiple accent colours, game cards, animated pitch and a few Motion/CSS transitions exist.
- [x] Every current game route now has its own background palette and distinct display heading typeface. Further game-specific layout/illustration work remains.
- [ ] Keep a consistent navigation/interaction system so each page is still easy to learn.
- [ ] Improve readability across all games: stronger contrast, minimum comfortable mobile font sizes, clear hierarchy, larger tap targets and no pale grey microcopy for essential instructions.
- [x] Mobile game input/textarea/select font-size is forced to at least 16px to prevent iOS Safari focus-zoom. Real-device visual verification remains.
- [ ] Add Motion for React layout/reorder animation, drag feedback, typewriter text, score counters, reveal transitions, goal/ball/crest motion and Strands path trails.
- [ ] Honour prefers-reduced-motion and keep animations lightweight on mobile.
- [ ] Use custom CSS/SVG and original vector pitch/ball/scoreboard graphics where practical; avoid generic giant emoji-like artwork and unlicensed third-party motion clips.
- [ ] Test every interaction at narrow iPhone widths and desktop widths.

## 6. Daily / account / unlimited play

- [x] Local nickname, streak and daily scorecard exist in localStorage.
- [x] UTC midnight is the daily rollover boundary; GMT midnight means 00:00 UTC year-round.
- [~] Daily/practice modes exist across current games, but verify every game banks once only, daily puzzle is deterministic and practice never modifies streak.
- [ ] Persist recent practice targets locally so refreshes do not immediately repeat a player/puzzle.
- [ ] Add a calendar/history and best scores/streak record.
- [ ] Add export/restore local save so a user can move the local profile to another device before cloud accounts exist.
- [ ] Add optional cross-device account sync later, with authentication and server-side persistence; do not imply localStorage is a cloud account.
- [ ] Test daylight-saving transitions, date changes while a tab is open, multiple games finished on same day and offline storage failure.

## 7. Head-to-head Games Room (later phase)

- [x] Feasibility confirmed: Cloudflare Durable Objects can coordinate multiplayer rooms over WebSockets.
- [ ] Build room creation with a short join code and share/copy invite link.
- [ ] Allow two or more players to join, select a game and agree the match settings.
- [ ] Synchronize questions, timers, turns, answers and scores server-side to prevent client-side score cheating.
- [ ] Support simultaneous and turn-based formats depending on game mechanics.
- [ ] Add ready states, reconnect, host handover, room expiry, abuse limits and graceful disconnect handling.
- [ ] Start only after solo game data and game rules are stable.
- [ ] Add private room testing on two real phones before release.

## 8. Data sources, licences and research notes

**OpenFootballBase-Data** is the primary existing archive integration. Its documentation describes roughly 85,099 players and 479,110 career rows (snapshot 2026-11-14), with 911,539 club-season stats rows. It explicitly says career/caps are sourced from Wikipedia infoboxes and unverified; detailed player season stats cover a subset of players and competitions, not everyone. It is useful as a career/squad backbone, not a universal complete appearance/goals database.

- OpenFootballBase data/repository: https://github.com/florentfougeres/OpenFootballBase-Data
- Schema/caveats/licensing: https://github.com/florentfougeres/OpenFootballBase-Data/blob/main/docs/en/data-model.md
- OpenFootballBase spec/caveats: https://github.com/florentfougeres/OpenFootballBase-Data/blob/main/docs/en/spec.md

**Transfer dataset:** Football Transfers Dataset (2005–2024) reports 141,538 transfers, 41,734 players and 50 leagues, with raw and cleaned fee fields. It is CC BY 4.0 and requires citation; player-name matching still needs validation.

- Dataset: https://doi.org/10.5281/zenodo.17921143
- README and field descriptions: https://github.com/TiagoCumetti/football_transfers_dataset

**Club badges:** the current index is derived from JoseArroyave/football-logos, described by its README as a public 4,700+ SVG collection and free for personal/commercial use. Keep attribution, verify exact paths and review individual crest rights/trademarks. Do not bundle remote logos into the app without checking licence/source provenance.

- Logo source: https://github.com/JoseArroyave/football-logos

**Animation engineering:** Motion for React supports drag gestures, drag feedback and animated layout/reordering; use the installed `motion/react` package rather than embedding heavy video clips.

- Drag gestures: https://motion.dev/docs/react-drag
- Layout animation: https://motion.dev/docs/react-layout-animations

**Competitor patterns researched (inspiration only, do not copy implementation/design):** Daily Football Games, Extra Time, FootyIQ, Kickabout, PlayFutbol and Triviverse use familiar daily Wordle, grid, connections, career-path, lineup, quiz and 501 mechanics. Reuse only general game patterns; implement original PLAYGROUND rules, visuals and code.

- https://dailyfootballgames.com/
- https://extratime.games/
- https://www.footyiq.games/
- https://kickabout.games/
- https://playfutbol.app/
- https://triviverse.com/

**Multiplayer:** Cloudflare Durable Objects support WebSocket-based multi-client coordination and are a suitable foundation for private rooms. This confirms technical feasibility, not implementation.

- https://developers.cloudflare.com/durable-objects/best-practices/websockets/

## 9. Next implementation batches (do these in order)

1. **Reliability/readability batch:** mobile input zoom/contrast, Career File draw and repeat handling, Scout Signal visuals and real badge use; verify iPhone flows.
2. **Shared data batch:** wire the existing archive pool into a small reusable data hook, deduplicate/canonicalize, add badge/flag resolution, add transfer dataset with attribution and coverage.
3. **Core gameplay batch:** Lowball endless escalating streak, Footle validated larger wordbank/keyboard, Connections dynamic valid groups, Grid 4×4 difficulty.
4. **Interaction batch:** Strands drag paths, Ladder drag ordering, 501 darts presentation/rules, Link Up multiple-choice and verified teammate relationships, Missing XI pitch.
5. **New games batch:** Tournament Nation and Timed Football Quiz with sourced question/squad banks.
6. **Polish/testing batch:** unique page art direction/fonts, motion, responsive QA, reduced-motion/accessibility, daily/unlimited verification and production smoke tests.
7. **Multiplayer batch:** room codes and WebSocket multiplayer after solo game quality and source-backed datasets are stable.

## 10. Session handover rule

At the end of every implementation update:
1. Update this checklist with what changed and what remains.
2. Record commit SHA, CI result and Cloudflare deployment result (separately).
3. Never call a feature done until it is wired to the real data, has passed the build, and has been manually tested where possible.
4. Keep the next 3–5 concrete actions at the top of the next update.
5. Do not restart or replace the project. Continue in this repository and preserve working routes/assets.

## 11. Latest implementation log (2026-11-27)

- [x] Added this persistent master tracker and linked it from README (commit `ea869129e3833321da4ebf08e3c17ed3eb7dbcf4`).
- [x] Scout Signal club crest/flag value cells added (commit `07d6c51f0a74fed6cf2b8cb04a46311289db8727`; CI run 45927424482 passed).
- [x] iOS-safe 16px form controls and badge/microcopy CSS added (commit `7b5607b790075c2619812e09d184a7e04a6b44d5`; CI run 45927453117 passed).
- [x] Career File recent-player history persisted across refreshes (commit `c32517b5dedd3d7a2ec7aa4ed7d0f52027ef8898`; CI run 45927522190 passed).
- [x] Individual page palette and display-font pass added (commit `04ea0152e8222f39287d1f778e2857a1dd02c781`; CI run 45927599317 passed and Cloudflare deploy `4a2618cf-d2cc-4443-a132-ab615d85f135` succeeded).
- [x] Footle on-screen keyboard with Wordle priority states added (code commit `ef0effe6114b4d7d112651627a8cf5f16bf87a1b`; CI run 45927653789 passed). The following wording/CSS commits are still building at the time of this note.
- [ ] Wire the archive-backed pool into Scout Signal and the other player-driven games. Do not call the 1,600-row helper a live database feature until it is actually connected to the game routes.

**Next concrete actions:** (1) complete build/deployment verification for the Footle keyboard CSS; (2) replace the small hand-curated player source with a shared cached archive data endpoint; (3) expand and validate dynamic quiz/connection/grid pools; (4) implement 4×4 Grid difficulty; (5) implement Strands pointer/touch drag selection.
