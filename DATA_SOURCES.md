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
