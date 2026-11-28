# PLAYGROUND data sources, attribution and coverage

Last reviewed: 28 November 2026.

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

### Better Premier League season-stat source found (not yet integrated)

Research identified [Quiz FC's published `pl-history.v2.json`](https://quiz-fc.com/data/pl-history.v2.json), explicitly distributed under **CC BY-SA 4.0**. Its credits state that it contains Premier League league appearances and goals by club-season plus senior-career spells, built from Wikipedia club-season articles/player infoboxes, openfootball results (CC0) and Wikidata (CC0). It covers Premier League history from 1992/93 and deliberately excludes cup/European figures; incomplete figures are not shown. Reuse is permitted subject to attribution, a link to CC BY-SA 4.0, documenting changes, and sharing the adapted data under the same licence.

This is a substantially closer match to Career File's required season clues than OpenFootballBase's `stat_club` table, whose documentation limits its coverage to a subset of Champions League-club players from seven major countries since 2010. The Quiz FC source also has an existing Career Path game, making it a useful public reference for clue design. The data file has been identified and its licence/coverage checked, but it has **not yet been downloaded, imported, or merged** into PLAYGROUND.

A second research reference, [PL-History-Dashboard](https://github.com/ethankaufman/PL-History-Dashboard), reports 18,662 player-season-club rows covering 34 seasons (1992/93–2025/26), 5,112 players and 51 clubs, and describes cross-checking player-season data against Premier League records. Its README says it uses the Premier League's public statistics service, which is undocumented and could change. The repository does not make the player-data licence sufficiently clear in its README, so do not copy that file until its reuse terms are confirmed. It is a useful independent validation lead, not an approved import source.

[English Football Vault](https://englishfootballvault.co.uk/about.html) remains a possible source for English league/team history across eight tiers from 1888/89, but it documents match/team results rather than the player-season appearance/goals dataset needed by Career File. It is not a drop-in player-career source.

## World Cup starting line-ups

The World Cup data file in `public/data/worldcup-lineups.json` is derived from [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json), whose repository publishes its data under CC0 1.0 Universal. PLAYGROUND includes 1,312 team starting-line-up records across the 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018 and 2022 FIFA World Cups.

The source includes match context and eleven starters. It does not provide reliable on-pitch coordinates or a consistently verified position for every historical player. PLAYGROUND therefore shows a full schematic pitch; where its career archive has a unique player profile position it can group shirts by broad role, but it does not claim to reproduce the historical match formation. Year-matched clubs are shown only when an exact player-name/year career-spell match exists.

## Club and national badges

The badge path index in `public/data/club-badges-index.json` is built from [JoseArroyave/football-logos](https://github.com/JoseArroyave/football-logos), which lists 4,700+ SVG paths and provides direct raw GitHub URLs. The upstream repository describes its code repository under MIT and its README says the logos are free to use for personal and commercial projects.

That repository-level licence is not a blanket clearance of every underlying club or national-team crest. Crests can remain trademarks or have separate rights. PLAYGROUND uses remote badge assets for identification/illustration, provides a text fallback when a path cannot be resolved, and does not imply club endorsement. Verify specific asset rights before any commercial advertising or merchandise use.

## Animation and UI assets

The game visuals and motion effects are implemented in CSS/SVG and Motion for React. No third-party video or stock motion clips are bundled into the games. The `motion` dependency is the code package; its code licence does not change the rights in club crests or football data.
