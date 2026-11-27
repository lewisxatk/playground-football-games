# PLAYGROUND data sources, attribution and coverage

Last reviewed: 27 November 2026.

## Player, club and career archive

PLAYGROUND reads a sample from [OpenFootballBase-Data](https://github.com/florentfougeres/OpenFootballBase-Data) via its published Parquet files and manifest. The upstream project describes its source material as Wikipedia and Wikidata, with career and caps figures transcribed from player infoboxes and marked unverified.

The upstream project reports, as of 14 November 2026, approximately 85,099 players, 479,110 career rows, 44,970 club records and 152 competitions. These figures describe the upstream project, not the PLAYGROUND client-side sample. PLAYGROUND currently draws a shared sample of up to 1,600 player records for several games. The sample, its available fields and the quality of its underlying records vary.

- Wikipedia text-derived data: CC BY-SA 4.0. Attribution to Wikipedia contributors and links/revision provenance should be retained wherever the upstream records provide it.
- Wikidata data: CC0.
- OpenFootballBase-Data code: MIT. This does not make all underlying data MIT-licensed.
- Data coverage and career/stat totals are not guaranteed complete. Missing values remain missing; recorded career totals should not be represented as audited official statistics.

Upstream documentation: [repository and source overview](https://github.com/florentfougeres/OpenFootballBase-Data), [data model and caveats](https://github.com/florentfougeres/OpenFootballBase-Data/blob/main/docs/en/data-model.md).

## World Cup starting line-ups

The World Cup data file in `public/data/worldcup-lineups.json` is derived from [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json), whose repository publishes its data under CC0 1.0 Universal. PLAYGROUND includes 1,312 team starting-line-up records across the 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018 and 2022 FIFA World Cups.

The source includes match context and eleven starters. It does not provide reliable on-pitch coordinates or a consistently verified position for every historical player. PLAYGROUND therefore shows a full schematic pitch; where its career archive has a unique player profile position it can group shirts by broad role, but it does not claim to reproduce the historical match formation. Year-matched clubs are shown only when an exact player-name/year career-spell match exists.

## Club and national badges

The badge path index in `public/data/club-badges-index.json` is built from [JoseArroyave/football-logos](https://github.com/JoseArroyave/football-logos), which lists 4,700+ SVG paths and provides direct raw GitHub URLs. The upstream repository describes its code repository under MIT and its README says the logos are free to use for personal and commercial projects.

That repository-level licence is not a blanket clearance of every underlying club or national-team crest. Crests can remain trademarks or have separate rights. PLAYGROUND uses remote badge assets for identification/illustration, provides a text fallback when a path cannot be resolved, and does not imply club endorsement. Verify specific asset rights before any commercial advertising or merchandise use.

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
