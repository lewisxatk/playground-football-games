# PLAYGROUND data sources, attribution and coverage

Last reviewed: 27 November 2026.

## Player, club and career archive

PLAYGROUND reads a sample from [OpenFootballBase-Data](https://github.com/florentfougeres/OpenFootballBase-Data) via its published Parquet files and manifest. The upstream project describes its source material as Wikipedia and Wikidata, with career and caps figures transcribed from player infoboxes and marked unverified.

The upstream project reports, as of 14 November 2026, approximately 85,099 players, 479,110 career rows, 44,970 club records and 152 competitions. These figures describe the upstream project, not the PLAYGROUND client-side sample. This remains a separate mixed-provenance archive. Career File and Football Grid use it for dated club spells and season-level appearance/goal records; the other factual games use the separate CC0-only knowledge shards. The archive is not counted as CC0 content or used to pad those CC0 game pools.

- Wikipedia text-derived data: CC BY-SA 4.0. Attribution to Wikipedia contributors and links/revision provenance should be retained wherever the upstream records provide it.
- Wikidata data: CC0.
- OpenFootballBase-Data code: MIT. This does not make all underlying data MIT-licensed.
- Data coverage and career/stat totals are not guaranteed complete. Missing values remain missing; recorded career totals should not be represented as audited official statistics.

Upstream documentation: [repository and source overview](https://github.com/florentfougeres/OpenFootballBase-Data), [data model and caveats](https://github.com/florentfougeres/OpenFootballBase-Data/blob/main/docs/en/data-model.md).

## UEFA club competition results

The match bank includes [OpenFootball Champions League](https://github.com/openfootball/champions-league), pinned at `abfaeddc2ee3d14f99ecc163c9ddb46cb4d67cef`. The importer reads the available Champions League, Europa League and Conference League result files, including qualifying rounds, and stores the season, competition, stage, date, source file and line number. It does not invent missing fixtures or player performance statistics.

## English domestic match results

The CC0 match bank includes [OpenFootball England](https://github.com/openfootball/england), pinned at `9ee7a0c351805c99cc334478a9bf04b7d0432fec`. The build imports available Premier League, Championship/First Division, League One/Second Division, League Two/Third Division/Fourth Division, FA Cup and EFL Cup result files. It skips squad files, RSSSF extracts and duplicate full-season files. Each imported match keeps its season, competition, date, source path, line number and source commit. The current source coverage is not a complete all-time English football archive; exact season/competition counts are written to the generated report.

## World Cup starting line-ups

The World Cup data file in `public/data/worldcup-lineups.json` is derived from [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json), whose repository publishes its data under CC0 1.0 Universal. The retained snapshot contains 1,312 team starting-line-up records across the 1982–2022 tournaments. The build now also imports the pinned 2026 `2026/worldcup-full.json` file, adding 208 team line-ups. The build report is the source of truth for the resulting counts.

The source includes match context and eleven starters. It does not provide reliable on-pitch coordinates or a consistently verified position for every historical player. PLAYGROUND therefore shows a full schematic pitch; where its career archive has a unique player profile position it can group shirts by broad role, but it does not claim to reproduce the historical match formation. Year-matched clubs are shown only when an exact player-name/year career-spell match exists.

## CC0 dated player-club membership snapshot

Career File, Cult Hero and Link Up use a separate build-time Wikidata snapshot. The query selects association-football-player entities (P106), dated team-membership statements (P54 with P580 start dates and optional P582 end dates), and club entities typed as association-football clubs. The import stores Wikidata QIDs, statement IDs, club QIDs, start/end years, the query endpoint and retrieval date. The build report records raw rows, accepted statements and eligible player counts.

This is **membership evidence**, not a complete playing career: it does not prove appearances, starts, exact transfer dates, loan status or season-by-season statistics. An open-ended membership statement is not treated as proof that a player remains at the club today. These clues are worded as recorded dated club memberships and are not converted into fabricated apps/goals. Wikidata structured data is CC0; its community-maintained records can be incomplete or wrong, so the UI and report retain those scope warnings.

## Club and national badges

The badge path index in `public/data/club-badges-index.json` is built from [JoseArroyave/football-logos](https://github.com/JoseArroyave/football-logos), which lists 4,700+ SVG paths and provides direct raw GitHub URLs. The upstream repository describes its code repository under MIT and its README says the logos are free to use for personal and commercial projects.

That repository-level licence is not a blanket clearance of every underlying club or national-team crest. Crests can remain trademarks or have separate rights. PLAYGROUND uses remote badge assets for identification/illustration, provides a text fallback when a path cannot be resolved, and does not imply club endorsement. Verify specific asset rights before any commercial advertising or merchandise use.

## Strands bonus-word dictionary

The Strands bonus-word checker uses `public/data/english-wordlist.cc0.txt`, filtered from [outparse/english-dictionary-dataset](https://github.com/outparse/english-dictionary-dataset) at its pinned source snapshot. The upstream repository includes a CC0 1.0 Universal licence. Words are used only to validate bonus guesses; the hidden football-player answers remain sourced from the football player/career datasets.

## Animation and UI assets

The game visuals and motion effects are implemented in CSS/SVG and Motion for React. No third-party video or stock motion clips are bundled into the games. The `motion` dependency is the code package; its code licence does not change the rights in club crests or football data.


## 2026-11-27 source-policy audit update

For a strict no-fee / no-permission workflow, make **CC0 or public-domain data the ingestion whitelist**. Keep an internal provenance record even where attribution is not required.

### CC0/public-domain candidates

- [OpenFootball England](https://github.com/openfootball/england) publishes its football data and scripts to the public domain. It covers English Premier League, Championship, League One and League Two, with match results and some squad/club information. Coverage must be measured season by season.
- [OpenFootball Champions League](https://github.com/openfootball/champions-league) publishes CC0 data for the UEFA Champions League, Europa League and Conference League.
- [OpenFootball Leagues](https://github.com/openfootball/leagues), [Europe](https://github.com/openfootball/europe), [World](https://github.com/openfootball/world), [EURO](https://github.com/openfootball/euro) and [World Cup](https://github.com/openfootball/worldcup) are further CC0/public-domain competition datasets. Their depth varies by competition and season.
- [Mart Jürisoo international_results](https://github.com/martj42/international_results) publishes a CC0-1.0 licence. The inspected README describes men's senior international results from 1872 through 2024 and provides results, shootouts, goalscorers and former names. It excludes Olympic, U23, B-team and league-select fixtures.
- [Wikidata structured data](https://www.wikidata.org/wiki/Wikidata:Licensing) is CC0. It is useful for QIDs, player/club identity, birth data, nationality, position and dated membership statements, but is community-maintained and incomplete.

CC0 is the closest practical fit for the requested approach: no paid licence, no permission request and no attribution/share-alike duty for the CC0 data. We should still preserve source URL, release/commit, retrieval date, hashes and source-row IDs internally.

### Do not bulk-ingest

- Premier League website/app data: the current terms reserve copyright/database rights and restrict commercial re-use and database creation without written approval.
- FIFA.com article text/statistics: FIFA's current rights page limits third-party reuse to purely editorial, non-commercial purposes with credit.
- Fjelstul World Cup Database: exclude from a commercial CC0-only build; the site terms have stated personal projects only and direct commercial users to request a separate licence.
- OpenFootballBase-Data's merged player archive: it combines Wikipedia-derived CC BY-SA 4.0 fields with Wikidata-derived CC0 fields. The code's MIT licence does not relicense the underlying mixed data.
- Third-party question banks: use as inspiration for coverage gaps only; do not copy question wording or import whole packs.
- Transfer CSV: source/rights are still unverified in the current application path. Hold it until provenance is established.
- Club crests: logo repository/code licences are not blanket commercial clearance for club trademarks and artwork.

### Current content-system correction

The 100-question factual seed is a development-only bank and is not the live source for The Climb or Quick Quiz. The separate generated bank has 800 questions per tier (3,200 total) and is archive-template-derived; the underlying appearance/goal/caps statistics are not independently verified. These are different datasets and must not be added together as 3,300 verified questions.


### Additional CC0 sources checked on 27 November 2026

- [OpenFootball Players](https://github.com/openfootball/players) publishes CC0-1.0 data for footballers grouped by country, with name, broad position, date of birth, height and birthplace fields in its examples. This is a useful identity/answer pool for Footle, Grid, Connections and player-profile games; it is not a reliable season-stat or career-history source by itself.
- [OpenFootball Clubs](https://github.com/openfootball/clubs) publishes CC0 public-domain club data including club names, aliases, founding years and stadium associations. Useful for club-history, stadium, nickname and alias facts. Do not treat the club name record as a licence for crest artwork or trademarks.
- [OpenFootball World Cup](https://github.com/openfootball/worldcup) currently advertises data for the Canada/USA/Mexico 2026 tournament as well as earlier editions and qualifiers. PLAYGROUND now imports the pinned 2026 `worldcup-full.json` file directly, validates both 11-player starting line-ups per match, and merges those records with the retained 1982–2022 snapshot.
- The sister [women's international results dataset](https://github.com/martj42/womens-international-results) reports around 11,020 results and says all major tournament results should be complete, while friendlies are incomplete. Treat it as a candidate only until its current repository licence file is directly checked and pinned; do not count it as approved solely from a third-party catalogue.

### Useful but not CC0: optional English history expansion

[England Football League Data](https://github.com/seanelvidge/England-football-results) reported 212,910 English league matches from 1888 through 26 November 2026 across the top four tiers, with results, league divisions, historical club names, active periods and point deductions. Its author's original contributions are CC BY 4.0 (attribution required), and the author explicitly reserves third-party source rights and logo rights. This is a very strong EFL/history candidate if the project later accepts a simple attribution credit; it is deliberately **not** part of the strict CC0-only ingestion whitelist.


## Strict CC0 build whitelist

The current factual knowledge engine uses a strict CC0-only whitelist for its generated quiz, match, World Cup and player-name shards: OpenFootball players (`125d20f7cc06cac7e758b40df535a7695632680a`), OpenFootball clubs (`ae3800227c449447b3a337fc0aac79a8f02f4c8b`), OpenFootball England (`9ee7a0c351805c99cc334478a9bf04b7d0432fec`), OpenFootball Champions League (`abfaeddc2ee3d14f99ecc163c9ddb46cb4d67cef`), OpenFootball World Cup (`516d3825c3bd23fdc298c4014e84bde78f2d4965`), and Mart Jürisoo men's senior international results (`ca84241bb3eed854a1956a2fab442fe4daad40dd`). Career history uses a dated Wikidata CC0 snapshot; its endpoint and retrieval date are recorded per build. The exact policy, source scope and accuracy caveats are in [CC0 Football Knowledge Engine](docs/CC0_FOOTBALL_KNOWLEDGE_ENGINE.md). Career File and Football Grid are explicit exceptions: they use the separate OpenFootballBase-Data archive under its documented CC BY-SA/Wikidata provenance, with source credits shown in the Career File and Grid UI. They are not counted as CC0-only shards.

The legacy mixed-provenance OpenFootballBase question-bank generator and runtime question-bank module have been retired from the build. CC BY-SA or unknown-rights data is not silently imported into the CC0 engine. Club crests, player photographs and third-party logos are not included.


## English football source research — 27 November 2026

- **OpenFootball England** remains the approved primary English-results source. Its repository publishes the data under CC0-1.0 and includes available Premier League, Championship, League One, League Two, FA Cup and EFL Cup result files. The current pinned snapshot and exact imported coverage are recorded in the CC0 manifest/report.
- **England Football League Data (Sean Elvidge)** was evaluated as a possible expansion source. Its README reports more than 212,000 results from 1888 onwards across the top four English tiers, plus club name histories, active periods, division metadata and points deductions. The contributor's original compilation is offered under CC BY 4.0, which permits commercial reuse with attribution, but the repository expressly reserves third-party source data and logo rights. Do not ingest this dataset wholesale until the underlying source rights and row-level provenance are resolved. Candidate: https://github.com/seanelvidge/England-football-results.
- **Official Premier League records and statistics pages** are useful for manual fact-checking and for identifying gaps such as goals, assists, appearances, cards and historic records. They are not an approved bulk-ingestion source: the current Premier League terms reserve copyright/database rights and prohibit commercial reuse or creating a database from website/app content without prior written approval. Use as a human editorial reference only, not a scraper or data feed. References: https://www.premierleague.com/en/stats/records and https://www.premierleague.com/en/terms-and-conditions.
- The Premier League's own statistics documentation states that player appearances, goals, assists and discipline data begin in 1992/93, while many detailed event metrics begin in 2006/07. This is a useful coverage boundary when evaluating a separately licensed statistics provider: https://www.premierleague.com/en/stats/clarification.

**Decision:** keep the live ingestion whitelist CC0/public domain for now. Do not mix a CC BY compilation or restricted Premier League website data into the CC0 shards. The next high-value English expansion should be a separately verified, rights-cleared player-stat source, not a larger match-results file alone.


## English player-stat source audit — 27 November 2026

The main remaining English-football gap is competition-scoped player statistics (Premier League/EFL appearances, goals, assists, minutes and cards). The following candidates were checked:

| Candidate | Reported coverage | Decision |
|---|---|---|
| [PL History Dashboard](https://github.com/ethankaufman/PL-History-Dashboard) | 355,716 player-match rows, 5,112 players and 34 Premier League seasons (1992/93–2025/26), including goals, assists, minutes and cards. The project says it collects the Premier League's public stats service and supplements it with other sources. | Do not import yet. No explicit data-reuse licence was verified; it includes official PL-derived data, Wikipedia-derived material and club/player artwork with separate rights. |
| [mshodge/epl-stats](https://github.com/mshodge/epl-stats) | Scraper/export for Premier League player career totals: appearances, goals, assists, clean sheets, wins and clubs. | Do not import yet. It scrapes the official PL website and no explicit redistribution licence was verified. |
| [imadeddine-belkat/Premier-League-Stats](https://github.com/imadeddine-belkat/Premier-League-Stats) | Historical PL archive from 2008/09 onward with per-player match and season statistics, plus FPL data. | Do not import yet. Official-feed provenance is described, but a clear licence for redistribution of the underlying PL data was not established. |
| [ISAR CRAN package EPL datasets](https://cran.r-project.org/package=ISAR) | Published 2023/24 and 2024/25 season datasets with appearances, starts, goals, assists, minutes and other metrics. | Research lead only. The package's software licence does not by itself prove that every underlying third-party statistics field is licensed for commercial redistribution. |
| [2025/26 Premier League CSV](https://github.com/Matthew-Duran/Premier-League-Stats-CSV) | One-season scraped player statistics file. | Not approved: one-commit data drop with no clear dataset licence/provenance record. |

The official Premier League statistics documentation confirms that appearances, goals and assists are available from 1992/93, while many detailed metrics begin in 2006/07. Its current website terms reserve copyright/database rights and prohibit commercial database extraction without prior written approval. These pages are suitable for human spot-checking, not bulk scraping.

**Decision:** do not silently import any of these player-stat dumps into the CC0 database. The practical options are (1) obtain a clearly licensed provider feed, (2) contact the relevant rights holder for permission, or (3) continue with CC0-derived match facts and only use player statistics when their source and reuse basis are independently verified. No paid source has been added.
