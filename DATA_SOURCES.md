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

## Career File selection and limits

Career File currently targets Premier League club careers. The candidate draw, difficulty totals, season-stat preflight and displayed club timeline use the same club identity mapping: `competition_club.competition = ENG-PL`, joined to `club.wikipedia_title` and the club's Wikidata QID. This is deliberately based on competition membership rather than a generic country field, which can be too broad for distinguishing English and other UK clubs.

A player must have at least two qualifying Premier League club spells and a usable name. Only qualifying club spells contribute to the candidate's appearance and club counts; the timeline and season clues are filtered to those Premier League clubs. A player is not admitted merely because one spell was at an English club while their unrelated overseas spells are displayed. The source defines an empty career `end_year` as ongoing or unknown; Career File preserves that uncertainty instead of converting it into a false one-year stay. Where an end year is unknown, the timeline shows the start and any separately recorded club-season rows without inventing an end date.

Coverage is not complete. OpenFootballBase's `career` table records club spells transcribed from English Wikipedia infoboxes. Its `stat_club` table records club/season/competition rows only for a subset of players (the published data model describes players of Champions League clubs from seven major countries since 2010). Career and season figures are published as found, not independently audited; blanks remain unknown, not zero. Premier League-only Career File is therefore a curated game pool, not a complete record of every English professional or every historical season.

For a future EFL and lower-league expansion, English Football Vault describes an eight-tier English pyramid archive from 1888–89 onwards. Its coverage is useful research context, but no data has been imported from it; API access, reuse terms and field-level provenance must be checked before integration.

Upstream technical reference: [OpenFootballBase data model](https://github.com/florentfougeres/OpenFootballBase-Data/blob/main/docs/en/data-model.md). Further English-football archive research: [English Football Vault — About](https://englishfootballvault.co.uk/about.html).

## World Cup starting line-ups

The World Cup data file in `public/data/worldcup-lineups.json` is derived from [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json), whose repository publishes its data under CC0 1.0 Universal. PLAYGROUND includes 1,312 team starting-line-up records across the 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018 and 2022 FIFA World Cups.

The source includes match context and eleven starters. It does not provide reliable on-pitch coordinates or a consistently verified position for every historical player. PLAYGROUND therefore shows a full schematic pitch; where its career archive has a unique player profile position it can group shirts by broad role, but it does not claim to reproduce the historical match formation. Year-matched clubs are shown only when an exact player-name/year career-spell match exists.

## Club and national badges

The badge path index in `public/data/club-badges-index.json` is built from [JoseArroyave/football-logos](https://github.com/JoseArroyave/football-logos), which lists 4,700+ SVG paths and provides direct raw GitHub URLs. The upstream repository describes its code repository under MIT and its README says the logos are free to use for personal and commercial projects.

That repository-level licence is not a blanket clearance of every underlying club or national-team crest. Crests can remain trademarks or have separate rights. PLAYGROUND uses remote badge assets for identification/illustration, provides a text fallback when a path cannot be resolved, and does not imply club endorsement. Verify specific asset rights before any commercial advertising or merchandise use.

## Animation and UI assets

The game visuals and motion effects are implemented in CSS/SVG and Motion for React. No third-party video or stock motion clips are bundled into the games. The `motion` dependency is the code package; its code licence does not change the rights in club crests or football data.
