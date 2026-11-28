# PLAYGROUND — Master Build Checklist & Handover

**Last audited:** 2026-11-27 12:04 UTC  
**Repository:** https://github.com/lewisxatk/playground-football-games  
**Production:** https://playground-football-games.pages.dev  
**Purpose:** This file is the persistent project memory and source of truth for implementation status. Update it at the end of every development batch. Do not mark a task complete merely because a route or visual mock-up exists; the behaviour must be implemented and build-tested.

## Status key

- [x] **Done** — present in the current code and build-verified.
- [~] **Partial** — code or groundwork exists, but required functionality, data coverage or verification is missing.
- [ ] **Not done** — still needs implementation.
- [!] **Blocker / decision** — needs a technical or data decision before claiming completion.

## 0. Current verified baseline

**Verified production commit:** '03c738e3f31d63b5f02d66d88d75dc50e2efb18b'  
**Latest successful production deployment:** '080c98c9-1d0b-4d61-bf4a-6ffe734c6d8a'  
**Build and deploy:** GitHub Actions run [45995395088](https://github.com/lewisxatk/playground-football-games/actions/runs/45995395088) passed; Cloudflare Pages build and deploy stages both succeeded. Preview: https://080c98c9.playground-football-games.pages.dev.

- [x] Sixteen game routes and a 16-tile home directory exist: Lowball, The Climb, Draft XI, Career File, Footle, Connections, Football Grid, Ladder, The Reveal, Football 501, Link Up, Missing XI, Football Strands, Scout Signal, Tournament Nation and The Quick Quiz.
- [x] The shared home/menu/navigation shell, unique per-game colour palettes and display-heading fonts, responsive layouts and Motion/CSS/SVG animation system are implemented.
- [x] Main arcade body text now uses the loaded Space Grotesk font; the dedicated Career File screen also uses Space Grotesk. Career File mobile input/select/textarea controls now have a 16px minimum to prevent iOS Safari focus zoom.
- [x] A local Locker Room profile records nickname, daily results, totals and streaks in browser localStorage. JSON export/restore can move that local player card between devices; this is still not live account sync.
- [x] Daily challenges use UTC date seeds; practice runs use separate session seeds and do not award daily streak credit.
- [x] The shared archive-backed game pool is connected to Lowball, The Climb, Draft XI, Footle, Connections, Football Grid, Ladder, The Reveal, Football 501, Link Up, Football Strands, The Quick Quiz and Scout Signal. Career File uses its own bounded candidate/profile flow; Tournament Nation and Missing XI use the tournament dataset plus historical career lookups.
- [x] Each archive-driven practice session uses a fresh seeded cached player sample; the daily pool keeps a stable shared seed. Pools are cached in memory and IndexedDB for seven days.
- [~] Each archive pool returns up to 1,600 game-ready player records from a sampled query against a much larger upstream archive. This is a meaningful game pool, but it is **not** the complete 85k-player source and does not mean every source field exists for every player.
- [x] The source-backed World Cup file contains 1,312 team starting-XI records from 11 editions (1982–2022), exactly 11 unique starter names per record. CI validates the line-up file and the 4,700+ SVG path badge index.
- [x] Tournament Nation shows all eleven shirts on a responsive 2D schematic pitch; difficulty changes the number of club clues shown. The career lookup adds club and broad player-position hints only where exact name/year data matches.
- [x] Missing XI uses the same tournament data, randomises the missing starter and shows a schematic formation. It does not claim that the source contains verified match-day coordinates.
- [x] The separate DATA_SOURCES.md records upstream sources, licence distinctions and coverage limits. Club badges can still be trademarks; no club endorsement or blanket crest clearance is claimed.
- [!] No real-player browser session / manual iPhone Safari or desktop acceptance run has been performed in this build batch. CI proves typecheck, data validation and bundling; it does not prove every interaction works on physical devices.
- [!] No head-to-head room system, server-side user account, or cross-device save sync exists yet.
- [!] The full upstream player archive is still queried client-side through DuckDB-WASM and remote Parquet on first use. IndexedDB caching makes repeat visits faster, but it is not a generated edge-cached JSON API or a guaranteed instant first load.
- [!] Transfer hints are sourced from a proxied CSV and indexed on demand. Name matches, fee interpretation, licence and coverage have not yet received a full audit.
- [!] Dynamic question generation is not the same as a curated/verified question bank containing thousands of independently audited questions. The Climb and Quick Quiz still need wider question QA; player-stat totals and historical club records inherit upstream coverage limitations.
- [!] Strands has archive-generated 6×8 boards when a valid player-group/spangram fit can be built, with a curated fallback when the generator cannot produce one. Every possible generated path and puzzle needs more automated QA.
- [!] Full historical positions/formation for tournament games, dedicated verified national-team crests, player portraits and global league coverage remain incomplete.

**How to read earlier sections:** Sections 11–12 below are historical session snapshots. Their older unchecked tasks are superseded by the latest status in Sections 13–14 and should not be treated as the current build state. Update the relevant item in Sections 1–10 when a task is finally verified.

## 1. Master football data platform

### 1.1 Player identity and shared archive
- [~] Shared archive player pool is now implemented for ten data-driven games. A build-time/edge-generated canonical master dataset and connection for the remaining curated games is still outstanding.
- [~] Archive pool is connected to Footle, Scout Signal, Lowball, Connections, Grid, Ladder, Reveal, Football 501, Link Up and Quick Quiz. Career File and tournament games use their archive-specific lookups/data paths; Missing XI/Tournament Nation use a verified 1982–2022 World Cup XI dataset. The Climb and Draft XI are not yet archive-generated.
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
- [~] Career File can request transfer hints through a Cloudflare Pages Function proxy and streams the CSV into a name index on demand. It is not yet merged into the common archive model and has not had full coverage/name-match QA.
- [ ] Match records to canonical player and club identities, retaining unmatched rows separately for review.
- [ ] Display transfer year, origin, destination, raw fee and cleaned fee; preserve “undisclosed”/unknown rather than inventing a price.
- [ ] Distinguish reported nominal fee from adjusted/estimated value; never mix market value with transfer fee.
- [ ] Make transfer hints useful in Career File, Scout Signal and future transfer games.
- [ ] Add source, licence and coverage disclosure.

### 1.3 Lightweight delivery / performance
- [ ] Move heavy archive scanning away from the initial iPhone page load.
- [ ] Pick and document the delivery architecture: cached Cloudflare Worker/Durable Object query API, generated compact JSON shards, or a hybrid.
- [ ] Do not ship DuckDB/WASM plus large Parquet scans to every visitor just to start a quick game.
- [~] One seeded archive pool is shared by ten game components and cached in memory/IndexedDB for seven days; lazy loading and deterministic daily seeds exist. A compressed build-time/edge data export and shared generated question shards remain outstanding.
- [ ] Keep player-pool refresh and daily puzzle generation server-side or build-time where possible.
- [~] Loading, retry and error/fallback states exist in the archive-backed games; offline behaviour, explicit timeout handling and privacy-preserving telemetry are not complete.
- [ ] Manual iPhone Safari performance/interaction testing is still required. Automated CI does not prove device performance.

## 2. Badges, flags and visual data

- [x] Badge path index and `ClubBadge` component exist, with initials fallback.
- [~] Check actual asset path resolution for a representative set of English, Spanish, Italian, German, French and other-world clubs. Some manual aliases may not match the indexed SVG paths.
- [x] Scout Signal matching cells turn green and show a club crest/name for shared and latest club matches; nationality cells show flags. Representative crest path QA and rights/attribution review remain [~].
- [x] Scout Signal uses nationality flags and explicit position/league/age labels in its comparison columns.
- [~] Tournament Nation uses the club badge resolver for dated club clues; country flags are available, but a separate verified national-team crest/tournament-badge set is not yet complete.
- [ ] Lazy-load images, cache results, reserve fixed image dimensions and use readable initials when a crest is unavailable.
- [ ] Review logo repository terms and underlying crest/trademark rights; maintain attribution and do not imply that a club endorses PLAYGROUND.
- [ ] Add a logo source/licensing note in the project.

## 3. Existing game upgrades

### 3.1 Career File
- [~] Faster bounded player draw committed; live usability and repeat avoidance still require real-device verification.
- [~] Candidate selection, difficulty totals, season-stat preflight and displayed timeline now use the same Premier League club identity filter on branch `fix/career-file-premier-league-only`. The previous code admitted a player through one Premier League club, then counted and displayed every career spell including overseas clubs.
- [~] Difficulty bands are now mutually exclusive and are calculated from appearances/clubs at qualifying Premier League clubs: Easy 450+ appearances; Medium 250–449; Hard 100–249; Extreme 20–99. All require at least two clubs. Candidate counts and a gameplay sample still need verification.
- [~] Invalid dated spells (missing start year or end year earlier than start year) are excluded from the database draw. A same-year spell is displayed as one year, not a redundant `2005–2005` range. A blank source end year means ongoing OR unknown, so the timeline preserves that uncertainty and does not invent a finish date.
- [~] Repair branch `fix/career-file-tier-pool-v2`: candidate SQL now applies the selected difficulty band before the 2,400-player sample, so each difficulty receives its own candidate sample instead of filtering one shared mixed sample. Candidate lookup widened from 72 to 180 per draw, full-profile retries increased from 6 to 12, and recent-player history is recorded only after a usable file is successfully built. CI run `46088281732` passed question generation, data validation, TypeScript build and Vite build for the code commit `1d52eb5`; later commits on this PR only update research/checklist documentation. Live data-count verification, 20-round gameplay samples and physical-device acceptance remain pending.
- [~] Research found Quiz FC's `pl-history.v2.json`, explicitly CC BY-SA 4.0, with PL league appearances/goals by club-season and senior career spells from 1992/93. This is a better fit for season clues than OpenFootballBase's sparse `stat_club` table. Not yet imported; next work is schema/identity mapping, attribution/share-alike handling, and a measured candidate-count comparison.
- [~] Reverse-engineered the public Quiz FC Career Path rules as a gameplay reference: ordered senior-club spells, loans/returns, Premier League tags, youth/reserve/national-team exclusion, and progressive club/date/position/PL-season/stat/birth/nationality/team-mate clues. This is research only; PLAYGROUND mechanics still need a deliberate design/QA pass.
- [~] Inspected Quiz FC's separate `career-grid.json` (Wikidata/CC0): 4,382 players and 101 English clubs, but only unordered player-to-club membership lists; no spell dates, loan flags or complete EFL coverage. It is suitable for club-affiliation cross-checks, not for generating a chronological career timeline.
- [ ] Confirm the available candidate counts for all four difficulty levels against the live archive and adjust thresholds only from measured coverage.
- [ ] Show two free season clues with club, season, appearances and goals only when both statistics are present.
- [ ] Make season rows and club spells readable, with clear gaps and unavailable statistics.
- [ ] Keep purchasable position, nationality, career dates, club count, appearances/goals, international record and transfer-fee hints.
- [ ] Ensure each hint has a clear point cost; failed/unavailable data lookups must not deduct points.
- [x] Mobile form sizing/keyboard behaviour has an iPhone Safari focus-zoom guard; continue real-device review for contrast and layout.
- [ ] Run CI/build, deploy the change, then test at least 20 consecutive rounds across all four difficulties and check for foreign clubs, invalid dates and duplicate draws.
- [ ] Test thousands of draws across every difficulty/league filter and check duplicate rate.


### 3.2 Who’s Got More? / Lowball
- [x] Hide totals until the player chooses; reveal the correct answer after the choice.
- [x] Lowball now escalates through Easy, Standard, Hard and Extreme tiers after five consecutive correct answers.
- [x] Lowball has an endless practice streak and difficulty increases every five right answers; daily is a fixed ten-duel run.
- [~] Lowball now draws from recorded league-goal rows with at least two goal-stat seasons and hides totals until chosen. Current archive sample and stat-scope caveat remain.
- [ ] Build a large pool (thousands where source coverage supports it) rather than repeating ten fixed names.
- [~] Lowball has score and run-result feedback; persisted longest streak and shareable result card remain outstanding.
- [ ] Ensure daily challenge is deterministic/shared, while unlimited practice gets random fresh matchups.

### 3.3 Scout Signal
- [~] Six attribute comparisons exist in the current small local player list (nation, shared club, current club, position, league, age band).
- [x] Scout Signal target and guess list are drawn from the shared archive pool, with starter fallback on archive error.
- [ ] Show each attribute independently; only matching attribute cells turn green.
- [ ] For club matches, show the actual club crest and name; for nation matches, show flag/name.
- [ ] Add helpful labels for current-club match versus shared-career-club match.
- [ ] Difficulty settings, larger target pool, no-repeat practice and more robust alias matching.
- [ ] Ensure the daily target is shared across users and not accidentally changed by rerender/reset.

### 3.4 Footle (football Wordle)
- [x] Green/yellow/grey Wordle tile evaluation exists and the answer is hidden until completion.
- [~] Footle builds a five-letter surname bank from the shared archive, with a small fallback bank. The bank is not yet independently vetted for ambiguous or duplicate surnames.
- [x] Daily Footle answer is deterministic by UTC date; practice seed randomizes its archive bank/target.
- [x] Footle keyboard tracks green/yellow/grey priority; grey keys remain tappable.
- [~] On-screen QWERTY keyboard, colour priority, accessible labels and simple feedback are implemented; share-grid result is not yet implemented.
- [ ] Ensure full-name/surname aliases do not create duplicate or unfair answers.

### 3.5 Football Strands
- [~] A 6×8 (48-cell) board and ten starter packs exist; current selection is tap-based, not real drag-to-connect.
- [x] Strands now uses touch/pointer drag over adjacent letter cells, releases to submit, allows cancel/clear, disables touch scrolling on the grid and displays an animated SVG path trail.
- [ ] Keep the NYT-style 6×8 footprint and circular letter cells; make it responsive without changing the board dimensions.
- [ ] Verify every pack has exactly 48 letters, valid non-overlapping paths, full-name spangram joining opposite sides, and all footballer names are valid.
- [ ] Strands still uses ten curated static packs; procedural archive-generated boards are not implemented.
- [ ] Add Strands-style hint progression, found-word colours, animated path tracing and end-of-board completion.
- [ ] 10 daily boards; unlimited randomly generated practice boards.

### 3.6 Fill the Grid
- [x] Fill the Grid is now a generated 4×4 club × nationality board with sixteen cells and archive-backed valid answers.
- [x] Fill the Grid offers Easy, Standard, Hard and Extreme difficulty levels.
- [ ] Easy: broadly famous players/simple club-country intersections.
- [ ] Standard: top-five leagues and senior national teams.
- [ ] Hard: broader European/global clubs, historical players and less obvious intersections.
- [ ] Extreme: historic and global club/national combinations where source coverage is strong.
- [x] Grid row headers show club crests and column headers show nationality flags.
- [x] Fill the Grid accepts any matching player in the current archive sample through normalized name/surname lookup; its data sample is not exhaustive.
- [ ] Add optional limited guesses/hints, completed-cell animations and a daily/unlimited split.

### 3.7 The Connection
- [x] Connections generates sixteen unique player tiles and four groups from the archive-backed pool.
- [~] Connections generates fresh combinations dynamically from the shared pool; it currently selects one grouping dimension per board and cannot promise thousands of globally unique boards.
- [~] Connections offers Easy/Standard/Hard/Extreme and grouping dimensions for nationality, position, latest league and career-start decade. Club/team-mate/honour groups remain outstanding.
- [ ] Use constraint-based generation so each tile has one intended group and accidental multiple valid groupings are checked.
- [ ] Unlimited practice should draw a fresh board, avoid repeats and show category explanations after solve.
- [ ] Preserve a deterministic daily board per UTC date.

### 3.8 The Ladder
- [x] Ladder now uses archive-backed player statistics, multiple metrics/difficulty levels and Motion drag-and-drop reordering; up/down controls remain as fallback.
- [ ] Add true touch-friendly drag-and-drop reordering with Motion layout animation; keep arrow buttons as accessible fallback.
- [~] Ladder offers difficulty and archive-backed league goals, career appearances/goals and international caps. Assists/transfer-fee metrics are not yet included.
- [ ] Clearly label statistic scope, season/timeframe and units.
- [ ] Build fresh random five-player sets, no immediate repeats, unlimited practice and a shared daily puzzle.
- [ ] Animate order changes and result reveal.

### 3.9 Football 501
- [x] Football 501 now has three-dart visits, player-stat values, a bust rule, exact checkout, bank-score option, difficulty, stat selection and an animated darts board.
- [ ] Research and settle scoring rules: selecting a player subtracts their stat; bust means crossing below zero; exact zero is best, with a clear bank/closest-finish scoring system if enabled.
- [x] Football 501 offers Easy/Standard/Hard/Extreme and league goals/international caps when available.
- [x] Custom dartboard, animated dart flight, three dart slots, visit totals and checkout/bust feedback are in the interface. Real haptics not implemented.
- [ ] Randomize player choices from the shared database and prevent duplicate player picks within a run.
- [ ] Add daily challenge and unlimited practice.

### 3.10 The Link Up
- [~] Link Up dynamically builds a teammate-overlap graph from dated career spells, uses multiple-choice Standard and typed Hard/Extreme, and only emits candidate pairs with a single shared teammate within the current sample. Archive completeness and manual answer QA remain.
- [x] Link Up Standard mode is multiple-choice; graph generation checks for a unique common teammate in the sample.
- [ ] Hard/Extreme: typed surname/full-name response, or a single clear player from verified teammate intersection.
- [x] Link Up now requires overlapping dated club spells rather than simply any club overlap; it still cannot prove the exact same matchday appearance.
- [ ] Provide the two endpoints, sensible hints, explanation and evidence source.
- [ ] Generate thousands of combinations from archive relationships, test uniqueness and exclude ambiguous questions.
- [ ] Unlimited mode and difficulty selector.

### 3.11 Missing XI
- [x] Missing XI is now randomized from verified World Cup starting-lineup records and shown on a schematic animated pitch with a hidden shirt. The displayed arrangement is explicitly not an exact historical formation.
- [ ] Render a responsive 2D pitch with formation positions and numbered player markers.
- [x] Missing XI and Tournament Nation use a 1,312-entry OpenFootball World Cup line-up dataset for editions 1982–2022; CI asserts eleven unique starters per record.
- [~] Missing XI hides a random starter and has four difficulty-controlled choice counts. Pitch layout is schematic; position/formation-specific historical placement is not available from current source.
- [~] Missing XI and Tournament Nation have daily/unlimited modes, difficulty, tournament context and badges where club matches exist. Dedicated national-team crests and a genuine formation-aware layout remain.
- [ ] Do not use a “starting XI” example unless the listed ten plus the answer truly match the starting lineup.

## 4. New games requested

### 4.1 Tournament Nation
- [x] Tournament Nation has its own route and menu entry.
- [ ] Show a major tournament and year (World Cup / Euros first; extend when data is sound), with a full 11-position layout.
- [ ] Each position reveals the player's club from that tournament's squad; user guesses the national team.
- [ ] Start at the 1980s and go forward; avoid tournaments before 1980.
- [~] Tournament Nation uses sourced starting XIs and attempts exact archive club lookup at tournament year. Source does not provide reliable positional coordinates and club coverage is partial.
- [ ] Add progressive hints, difficulty, badges, daily and unlimited modes.

### 4.2 Timed Football Quiz
- [x] The Quick Quiz has its own route and menu entry.
- [x] Standard Quick Quiz attempts 15 questions (5 each tier), with five options and a ten-second clock. If source coverage cannot produce a valid question, the page shows an error/retry state rather than fabricating a question.
- [x] Typewriter question reveals first; the answer options and ten-second timer begin after the question finishes typing.
- [ ] At time-out or answer selection, lock the answer, show correct answer and a short source-backed explanation, then continue.
- [ ] End screen shows score, correct answers, missed answers and shareable result.
- [x] Quick Quiz offers Easy, Medium, Hard and Extreme-only runs in addition to Standard mixed difficulty.
- [~] Quick Quiz generates varied templates from structured archive fields and uses fifteen unique player IDs per run; this is not yet a separately versioned, fully audited question bank and answer option distinctness depends on archive coverage.
- [ ] Do not generate factual questions from missing or uncertain fields. Store answer, distractors, explanation, source and difficulty with every authored question.

## 5. Visual design, accessibility and motion

- [~] PLAYGROUND now has per-game palettes, bespoke heading fonts, Strands drag trails, Ladder reorder motion, animated dartboard/flight, quiz typewriter/clock, pitch-shirt reveals and badge/flag cells. A full component-level bespoke art-direction audit across every screen remains.
- [x] Every current game route now has its own background palette and distinct display heading typeface. Further game-specific layout/illustration work remains.
- [ ] Keep a consistent navigation/interaction system so each page is still easy to learn.
- [ ] Improve readability across all games: stronger contrast, minimum comfortable mobile font sizes, clear hierarchy, larger tap targets and no pale grey microcopy for essential instructions.
- [x] Mobile game input/textarea/select font-size is forced to at least 16px to prevent iOS Safari focus-zoom. Real-device visual verification remains.
- [~] Motion/reorder, Strands SVG trails, typewriter, shirt reveals, animated ball/dartboard and reveal effects are present; a full motion pass and animation QA remains.
- [x] Shared arcade CSS disables transitions/animations for `prefers-reduced-motion`; further device profiling remains.
- [ ] Use custom CSS/SVG and original vector pitch/ball/scoreboard graphics where practical; avoid generic giant emoji-like artwork and unlicensed third-party motion clips.
- [ ] Test every interaction at narrow iPhone widths and desktop widths.

## 6. Daily / account / unlimited play

- [x] Local nickname, streak and daily scorecard exist in localStorage.
- [x] UTC midnight is the daily rollover boundary; GMT midnight means 00:00 UTC year-round.
- [~] Daily/practice modes exist across current games, but verify every game banks once only, daily puzzle is deterministic and practice never modifies streak.
- [ ] Persist recent practice targets locally so refreshes do not immediately repeat a player/puzzle.
- [ ] Add a calendar/history and best scores/streak record.
- [x] Export/restore local save is implemented: the Locker Room exports a versioned JSON backup and validates/imports it on another device. It replaces the current local save; cloud sync remains separate.
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

> Historical snapshot retained for continuity. Current implementation status is maintained in Sections 0, 13 and 14; older unchecked items below may already have been superseded.


- [x] Added this persistent master tracker and linked it from README (commit `ea869129e3833321da4ebf08e3c17ed3eb7dbcf4`).
- [x] Scout Signal club crest/flag value cells added (commit `07d6c51f0a74fed6cf2b8cb04a46311289db8727`; CI run 45927424482 passed).
- [x] iOS-safe 16px form controls and badge/microcopy CSS added (commit `7b5607b790075c2619812e09d184a7e04a6b44d5`; CI run 45927453117 passed).
- [x] Career File recent-player history persisted across refreshes (commit `c32517b5dedd3d7a2ec7aa4ed7d0f52027ef8898`; CI run 45927522190 passed).
- [x] Individual page palette and display-font pass added (commit `04ea0152e8222f39287d1f778e2857a1dd02c781`; CI run 45927599317 passed and Cloudflare deploy `4a2618cf-d2cc-4443-a132-ab615d85f135` succeeded).
- [x] Footle on-screen keyboard with Wordle priority states added (code commit `ef0effe6114b4d7d112651627a8cf5f16bf87a1b`; CI run 45927653789 passed). The following wording/CSS commits are still building at the time of this note.
- [ ] Wire the archive-backed pool into Scout Signal and the other player-driven games. Do not call the 1,600-row helper a live database feature until it is actually connected to the game routes.

**Next concrete actions:** (1) complete build/deployment verification for the Footle keyboard CSS; (2) replace the small hand-curated player source with a shared cached archive data endpoint; (3) expand and validate dynamic quiz/connection/grid pools; (4) implement 4×4 Grid difficulty; (5) implement Strands pointer/touch drag selection.

## 12. Verification update (2026-11-27, continued)

> Historical snapshot retained for continuity. Current implementation status is maintained in Sections 0, 13 and 14; older unchecked items below may already have been superseded.


- [x] Scout Signal club crests and nationality flags now render in the attribute feedback cells; matches are green. CI run: https://github.com/lewisxatk/playground-football-games/actions/runs/45927424482
- [x] Mobile inputs use 16px minimum text size to avoid iOS Safari focus zoom. CI run: https://github.com/lewisxatk/playground-football-games/actions/runs/45927453117
- [x] Career File remembers up to 600 recently tried player IDs in localStorage across refreshes. CI run: https://github.com/lewisxatk/playground-football-games/actions/runs/45927522190
- [x] All current games have their own colour palette and heading display typeface. CI run: https://github.com/lewisxatk/playground-football-games/actions/runs/45927599317
- [x] Footle has a tappable on-screen QWERTY keyboard; key states use green/yellow/grey feedback and grey keys are still available to type. CI run: https://github.com/lewisxatk/playground-football-games/actions/runs/45927677818
- [x] Production deployment for the Footle keyboard styles succeeded at https://7dd7a119.playground-football-games.pages.dev.
- [~] The shared game-ready archive helper can return up to 1,600 player records, but the game routes still use PLAYER_DATABASE for most choices. This is the main blocker to a genuinely massive and varied player experience.
- [!] Research confirmed OpenFootballBase-Data release data-1.25.0 publishes a 41,488,189-byte compressed archive. This makes a build-time compact JSON/shard pipeline worth testing, rather than asking iPhones to scan remote Parquet files at play time. Any generated dataset must retain the source's incomplete-stat and provenance flags.
- [ ] The two requested new games (Tournament Nation and Timed Football Quiz) are still not built.
- [ ] 4×4 Grid, dynamic Connections, Strands pointer drag, Ladder drag, escalating Lowball, expanded 501 and verified Link Up/Missing XI pools remain outstanding.

**Next batch (priority order):**
1. Decide and prototype the build-time player-data export from OpenFootballBase-Data, producing small compressed files with identity, aliases, clubs, nationality, position, career span, available stats and source coverage.
2. Connect that shared pool to Scout Signal and Lowball first; then reuse it for Footle, Connections, Grid, Ladder, Career File and Link Up.
3. Replace the static Connections groups with a generator that only emits unique, valid groups and difficulty levels.
4. Build 4×4 Grid with league/national-team filters and Easy/Standard/Hard/Extreme settings.
5. Implement actual pointer/touch drag paths in Strands (not tap-to-select).
6. Build Tournament Nation and Timed Football Quiz using source-backed tournament/question records.
7. Only then add private head-to-head rooms with server-authoritative state.

## 13. Verified implementation batch (2026-11-27, latest)

- [x] Shared archive pool now uses one constant seed across all ten archive-driven game components; 1,600-player sample is reused via seven-day IndexedDB caching. This improves repeated navigation but does not remove the initial DuckDB archive cost.
- [x] Lowball now uses archive-backed league-goal player records with at least two explicit league-goal seasons, hides the totals pre-guess, supports a ten-duel daily challenge and endless escalating practice streak (difficulty rises every five correct answers).
- [x] Scout Signal uses the shared pool, shows actual club badges/names and nationality flags in green matching cells, and shows position/league/age matches.
- [x] Footle builds a five-letter surname pool from archive names, daily deterministic answer, unlimited practice, six guesses and green/yellow/grey keyboard states. Its pool is not yet independently curated for duplicate or ambiguous surnames.
- [x] Connections generates four unique dynamic groups from nationality, position, latest league or career-start decade, with Easy/Standard/Hard/Extreme and unlimited practice. Groups are generated on demand, not a huge static authored question library.
- [x] Fill the Grid is 4×4, archive-generated, difficulty-selectable, and uses club crests/nationality flags. Its generator pre-indexes club/country intersections to avoid scanning all players for every random candidate.
- [x] Ladder uses archive player statistics (league goals, career appearances, career goals, international caps), difficulty tiers and Motion drag/reorder plus accessible arrow controls.
- [x] Reveal uses archive-backed player targets and career clues rather than the initial tiny hard-coded player rotation.
- [x] Football 501 uses the archive, supports league-goal/international-cap values, three-dart visits, bust, bank and checkout scoring, difficulty and a custom animated dartboard/flight.
- [x] Link Up generates unique teammate bridges from overlapping dated club spells, offers Standard multiple choice and Hard/Extreme typed input.
- [x] Missing XI draws randomized historic World Cup starting-XI records (1982–2022) and displays a schematic pitch with one hidden shirt, difficulty and unlimited practice.
- [x] Tournament Nation has its own route, sourced tournament year/round/opponent, club clues when exact year/name matches exist, multiple-choice difficulty and daily/practice.
- [x] The Quick Quiz has its own route, typewriter questions, 10-second timer, five answer options, Standard mixed tiers and Easy/Medium/Hard/Extreme modes. Templates cover nationality, position, club history, league, recorded goals/apps, caps and career dates; fifteen distinct players are used per run.
- [x] Career File daily first dossier is now deterministic by UTC day/difficulty/league; later files become random practice and don't bank another daily result. Current commit: `8e2661a33c90beaff94c7e78d90a3f63b8e682f3`.
- [x] Missing XI / Tournament Nation source file has 1,312 World Cup team line-ups, 11 unique starters per record, 11 editions from 1982–2022. Automated validation checks it alongside the 4,700+ badge index.
- [x] CI now runs `npm run validate:data` before `npm run build`.
- [x] Latest code build and data validation passed on commit `8e2661a33c90beaff94c7e78d90a3f63b8e682f3`: [GitHub Actions run 45931865447](https://github.com/lewisxatk/playground-football-games/actions/runs/45931865447).
- [x] Cloudflare Pages deployment for that commit succeeded: deployment `f1d9a2b9-b587-4eb9-b978-284710ccdfd0`, preview URL https://f1d9a2b9.playground-football-games.pages.dev; production alias resolves to latest successful production build.
- [!] No full browser/real-iPhone manual QA tool has been used in this batch. User must test the live pages and report layout/interaction issues.
- [!] A build-time compact/sharded export from the entire OpenFootballBase archive has not been created; initial first-load still uses browser-side remote DuckDB/Parquet. Shared IndexedDB caching improves repeat visits, but does not equal a complete edge-cached database.
- [!] Transfer CSV is proxied and streamed into the Career File transfer-hint index on demand; it has not been merged into the shared player model or fully audited for player name/fee coverage.
- [!] Head-to-head Rooms are still not implemented. Durable Objects + WebSockets are technically suitable; a separate Worker, room code flow, server-authoritative game state, reconnect and two-device QA remain to be built.
- [x] The Climb now builds five-question runs from archive-generated quiz templates, with a small curated fallback only when archive data is unavailable. Draft XI now draws archive-backed players and applies difficulty budgets. Strands builds dynamic 6×8 puzzles from archive names when a valid player group is available; the ten curated boards remain as fallback.
- [!] Cloud Locker Room account sync, real player portraits, complete national-team crest library, national league/global club coverage and full human QA remain outstanding.

**Next work order (supersedes the earlier list above):**
1. Replace the first-visit browser DuckDB/Parquet cost with compact build-time player-data shards or an edge-cached query endpoint; preserve source, season coverage and missing-stat flags.
2. Normalise and connect the 2005–2024 transfer-fee dataset to canonical player IDs where the match is unambiguous; keep name-only and ambiguous matches flagged.
3. Run systematic QA across all 16 routes: daily/personal seed repeatability, practice shard rotation, difficulty quality, no-repeat rules, scoring, iPhone touch gestures and small-screen typography.
4. Improve historical player and national-team coverage beyond the World Cup 1982–2022 archive, only when sourced records are available.
5. Add save-file export/restore (now implemented) to the test matrix; cloud account sync remains a separate optional service.
6. Build the head-to-head Games Room as a separate Cloudflare Worker + Durable Object service with join codes, lobby/game picker, server-authoritative rounds, reconnect, room expiry and two-device testing.

## 14. Recovery and production verification (2026-11-27, 09:30–09:40 UTC)

- [x] Recovered from the interrupted session by checking the GitHub main branch, checklist, latest commits, CI runs and Cloudflare production deployment before making further changes. No earlier work was reset or overwritten.
- [x] Fixed Strands drag tracking: removed pointer capture from the starting tile because it prevented the pointer from entering neighbouring tiles during a drag.
- [x] Corrected the 14-letter Strands spangram route so it begins at the top edge and completes at the opposite edge; the 13-letter route remains edge-to-edge.
- [x] Extended the historical career lookup to return broad player-profile position metadata alongside club spells that overlap the selected World Cup year. Only exact normalized player-name matches are used.
- [x] Reworked Tournament Nation to display the complete eleven-shirt pitch. Difficulty reveals 11, 9, 7 or 5 club clues; the pitch uses profile-position groupings only when enough compatible position data exists, otherwise the UI explicitly labels a schematic 4-3-3.
- [x] Added responsive full-XI pitch and club-clue styling for desktop and mobile.
- [x] Updated README with the Cloudflare Pages production address and link to data provenance.
- [x] Added DATA_SOURCES.md documenting OpenFootballBase-Data, openfootball/worldcup.json, the club badge index, licences and caveats.
- [x] Replaced the unloaded Cabinet Grotesk body font declaration with the already-loaded Space Grotesk family for the main arcade.
- [x] Aligned the home arcade directory/progress strip with all 16 game routes.
- [x] Created a new random practice archive shard per practice session while keeping the daily archive sample stable; a shard remains cached for seven days.
- [x] Fixed the separate Career File screen's mobile iOS focus zoom by raising form-control text to 16px and improving critical mobile microcopy sizes.
- [x] Latest CI run: [45975239424](https://github.com/lewisxatk/playground-football-games/actions/runs/45975239424) — install, data validation, TypeScript build and Vite production build passed.
- [x] Latest Cloudflare production deployment: 'b8b42f73-ad9f-437e-892c-2bec1ff5de81', commit 'd2bd46983dcb27a4df497104aab0beaf5e4124fc'. Cloudflare reports build and deploy stages successful. Preview URL: https://b8b42f73.playground-football-games.pages.dev. The stable production alias remains https://playground-football-games.pages.dev.
- [!] Real-device iPhone Safari interaction/readability testing remains outstanding; this batch has not claimed a physical device test.
- [!] First-use archive loading still depends on remote DuckDB-WASM/Parquet and needs a lighter generated shard or edge-cache architecture.

**Next work order:**
1. Design and prototype a compressed static player-data shard export that removes the initial full DuckDB/Parquet scan from the iPhone play path. Preserve field-level missing-data, source and scope metadata; do not turn missing stats into zero.
2. Audit and normalise the transfer-fee source into player/club-linked hints, keeping raw reported fees separate from cleaned approximate fee values.
3. QA the question and puzzle generators for distinct distractors, ambiguous names, accidental duplicate answers and valid game-specific difficulty.
4. Carry out a real iPhone Safari and desktop test pass for every game route, focusing on input zoom, scrolling, drag behaviour, loading states, colour contrast and timer behaviour.
5. Build the head-to-head Games Room as a separate Cloudflare Durable Objects/WebSockets service only after solo rounds and their answer sources are stable; server-authoritative score/timer state and two-device testing are mandatory.

## 15. Latest continuation batch (2026-11-27, 09:40 UTC)

- [x] Home scoreboard and tile artwork now reflect all 16 game routes (not the former 14); commit `115f281e188e447de6a9f2cd0095d003ec200d7c`, CI run [45975054441](https://github.com/lewisxatk/playground-football-games/actions/runs/45975054441), Pages deployment completed.
- [x] All 13 archive-driven game hooks now keep the same deterministic pool for Daily, but use a different seed for each Practice run. Each seed uses the existing seven-day IndexedDB cache. This enables fresh 1,600-player slices from different archive samples over repeat sessions, rather than always returning the same fixed 1,600 players. Commit `e8476533890e0cc3276ef0b4ac5197b6fa3af88b`, CI run [45975163359](https://github.com/lewisxatk/playground-football-games/actions/runs/45975163359), Cloudflare production deployment completed in later build sequence.
- [x] Body typography now uses loaded Space Grotesk rather than the unbundled Cabinet Grotesk family; individual game headings keep their own display font. Commit `eeba7dc43c40cac97f387031073b8d34428da32e`, CI run [45975087644](https://github.com/lewisxatk/playground-football-games/actions/runs/45975087644), Pages deployment succeeded.
- [x] Career File input font-size and microcopy have an additional iPhone Safari zoom/readability guard. Commit `d2bd46983dcb27a4df497104aab0beaf5e4124fc`, CI run [45975239424](https://github.com/lewisxatk/playground-football-games/actions/runs/45975239424), deployment succeeded.
- [x] Locker Room now exports the local player card to a JSON backup and can restore it on another browser/device. Import validation checks expected fields and bounds file size; restore replaces the current local record. Commit `46926bf1cebbb502f8d5f48bb5215467dd3e4cac`, CI run [45975488108](https://github.com/lewisxatk/playground-football-games/actions/runs/45975488108).
- [x] Mobile styling for save export/import controls added. Commit `e7f021a38d81832f053ede786aa9d63432e86719`, CI run [45975506506](https://github.com/lewisxatk/playground-football-games/actions/runs/45975506506), Cloudflare Pages production deployment `71fd4b94-60e4-4d64-a6d3-29fb0d750357` succeeded at https://71fd4b94.playground-football-games.pages.dev.
- [~] Practice archive shards still use browser-side DuckDB and remote Parquet on first use of a new seed. IndexedDB speeds repeat visits for that seed; this is not yet a fully static/offline player database.
- [~] Transfer fees still load from the source CSV on demand for Career File; the fee dataset has not yet been normalised into the shared archive player records.
- [!] No full real-iPhone manual QA or multi-user multiplayer test has been performed in this tool session. Production builds and automated data checks passing do not replace real-device testing.

**Next actions:** (1) prototype a compact build-time/edge-served player shard, (2) integrate transfer-fee data with canonical player matching, (3) audit all game route behaviour and difficulty levels, (4) retain source/coverage notices for every derived statistic, (5) build the separate head-to-head room service only after solo-game QA.


## 16. Latest continuation and recovery audit (2026-11-27, 11:40–12:04 UTC)

- [x] Recovered the actual current main branch rather than relying on the prior chat's claimed checkpoint. Main branch was inspected through commit history, source files, CI run details and Cloudflare Pages deployment metadata.
- [x] Confirmed the current static player archive is present in production source: 60,711 OpenFootballBase-Data player records in 61 checksum-verified shards, release `data-1.26.0`. The shared archive hook selects static shards first, samples up to 1,600 game-ready records and caches the result in memory/IndexedDB; the older remote DuckDB/Parquet route remains a fallback if static assets fail.
- [x] Confirmed the question-bank generator builds 3,200 source-derived questions: 800 each for EASY, MEDIUM, HARD and EXTREME, with 600 English-region and 200 international-region questions per tier. The data validator checks tier counts, region counts, unique IDs, five distinct options, answer inclusion, explanations/source notes, and excludes career-history/advanced-stat templates from EASY.
- [x] Improved EASY eligibility to major-division players with a meaningful recorded career footprint (100 appearances, 25 goals, 15 caps or 15 league goals). This is a source-based accessibility filter, not a guarantee that every player is famous or universally recognisable.
- [x] Corrected country/league classification so Scottish and other non-English UK records do not leak into the English pool unless English competition metadata supports that classification. Career File's region balancing and quiz-bank region diagnostics were tightened.
- [x] Standardised visible tier labels to MEDIUM / STANDARD where appropriate.
- [x] Added animated correct-answer / goal-reveal feedback to Who's Got More and shared arcade feedback styles.
- [x] Tournament Nation now reports the number of club clues actually matched against the selected XI, rather than presenting the intended clue count as if every club were resolved. Exact name/year matches only; unverified clubs remain unrecorded.
- [x] Career File transfer-feed failure handling now distinguishes blocked/unavailable data, states that no points were deducted, and leaves the player identity/career clues playable. This is graceful failure handling, **not** a fix for the upstream 403.
- [x] Footle input now advertises a mobile Go key, requests character capitalisation, disables autocomplete/spellcheck, and routes Enter / Go / NumpadEnter through the form's native `requestSubmit()` path. The on-screen Enter button remains available.
- [x] GitHub Actions run [45995395088](https://github.com/lewisxatk/playground-football-games/actions/runs/45995395088) passed: install, question-bank generation, data validation and production build.
- [x] Cloudflare Pages production deployment `080c98c9-1d0b-4d61-bf4a-6ffe734c6d8a` for commit `03c738e3f31d63b5f02d66d88d75dc50e2efb18b` completed successfully. Preview: https://080c98c9.playground-football-games.pages.dev. Stable production URL: https://playground-football-games.pages.dev.
- [!] Footle Enter behaviour has been code-hardened and build/deploy verified, but has **not** yet been manually exercised on the user's iPhone Safari keyboard. Do not claim a physical-device test.
- [!] The quiz pool is generated from source player/career records, not 3,200 individually researched general football trivia facts. EASY is filtered to established major-division player records but still needs a human recognisability audit and real playtesting.
- [!] The transfer CSV endpoint has previously returned 403 in the user's screenshot. The current app explains this without charging points, but the source has not been made reliably downloadable or replaced with a separately verified feed. Dataset documentation describes 141,538 transfers across 41,734 players, 50 leagues and 2005–2024 under CC BY 4.0; the endpoint/access problem remains.
- [!] Tournament Nation's club resolver still relies on exact normalized player-name and tournament-year overlap; many records may legitimately show no club match. The count is now honest, but historical coverage needs improving from a reliable source.
- [!] No real-device iPhone Safari / desktop acceptance test has been completed for all 16 routes. CI confirms build and data validation, not end-to-end interaction quality.
- [!] No live multiplayer rooms, server-side account sync or cross-device cloud saves have been implemented; Locker Room remains local with JSON export/restore.

**Next actions (priority):**
1. Run the live Footle keyboard flow on iPhone Safari; verify both software-keyboard Go and the on-screen Enter button, including valid and invalid surnames.
2. Review actual EASY quiz draws for recognisable names and remove ambiguous/outdated club metadata; add a separate researched general-football trivia pool only with source citations per fact.
3. Replace or reliably serve the blocked transfer-history CSV without bypassing provider restrictions; test actual player matching and fee semantics.
4. Improve Tournament Nation's historical club matching with canonical player identity and dated spells where available; keep missing clues explicit.
5. Complete a structured desktop/iPhone test matrix across all 16 games (loading, difficulty, daily/practice, timers, touch, scoring, reduced motion and no-repeat behaviour).

