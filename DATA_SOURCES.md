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


## Career File future hint enrichment: caps and honours

The current Quiz FC Premier League history endpoint provides the player identity, position, nationality, birth date and Premier League club-season statistics used by Career File. It does not currently provide broad international-cap totals or a player-honours field, so those hints are hidden when the current player record has no supported value.

A candidate enrichment source has been researched: [OpenFootballBase-Data](https://github.com/florentfougeres/OpenFootballBase-Data) and its [data model](https://github.com/florentfougeres/OpenFootballBase-Data/blob/main/docs/en/data-model.md). The published release describes:
- `national`: national-team caps and goals copied from player infoboxes. The source explicitly marks these values unverified and includes youth teams.
- `stat_national`: national-team appearances by team/year, also copied from Wikipedia career-stat tables and unverified.
- `national_title`: players listed in winning national-team tournament squads. The source explicitly warns that a listed player may not have played.
- `award`: Ballon d'Or rankings since 2000, not a general list of every player honour.
- `winner`: competition-season winners, keyed to club/competition/season rather than proof that a specific player earned a medal.

The dataset is derived from Wikipedia (CC BY-SA 4.0, with attribution to the source pages/revisions) and Wikidata (CC0). Before wiring any of these fields into a paid hint, match players by canonical Wikidata QID, keep senior and youth caps separate, preserve the unverified-source warning, and label squad-list honours as "listed in winning squad" rather than claiming the player personally appeared or won an individual medal. This enrichment is researched but not yet imported into Career File.


## Career File weighted player pools (2026-11-28)

The Career File draw is split into a 100-pick cycle: 95 slots are sourced from the Quiz FC Premier League history pool, 3 slots from a curated EFL-legend list, and 2 slots from a curated global-legend list. The practice draw advances through this exact 95/3/2 cycle; the daily file uses a deterministic date-based slot. If a special player cannot be matched to a source record with at least two usable club spells, the game falls back to the verified Premier League pool rather than inventing a career.

The Premier League pool includes current and former players with at least one fully recorded Premier League club-season row and ten recorded league appearances. It no longer requires two different Premier League clubs, so a player with one PL club spell remains eligible. The displayed Premier League stats remain league-only and missing figures stay blank.

The EFL list is a curated selection of players documented as EFL legends who never appeared in the Premier League, including Bartosz Bialkowski, Richard Keogh, Aden Flint, Tom Lees, Jed Wallace, Lewis McGugan, Paul McKenna, Sean Scannell, Fernando Forestieri, Lee Trundle, Ross McCormack, Britt Assombalonga, Dele Adebola, Will Grigg, Billy Paynter, Brett Pitman, Robin Friday, Steve Fletcher, Simon Garner, Graham Ford, Geoff Bradford, Wilf Kirkham, Dean Lewington, Steve Bull, Tommy Tynan and Jimmy Chamberlain. Research references: [Planet Football EFL XI](https://www.planetfootball.com/lists-and-rankings/amazing-xi-efl-legends-never-played-premier-league), [The Real EFL](https://therealefl.co.uk/2025/06/03/legendary-efl-strikers-who-never-played-in-the-premier-league/), [The League Paper](https://www.theleaguepaper.com/guest-blogs/435562/the-best-efl-players-never-to-play-in-the-premier-league/).

The global list contains non-Premier-League legends including Messi, Maradona, Zidane, Ronaldinho, Iniesta, Maldini, Buffon, Pirlo, Totti, Del Piero, Cruyff, Beckenbauer, Eusébio, Platini, Baggio, Stoichkov, Figo, Zico, Casillas, Riquelme, Batistuta, Klose, Matthäus, Rivaldo, Neymar, Benzema and Lewandowski.

EFL/global career rows prefer the OpenFootballBase career infobox table. Its release contains 85,099 player identities and 479,110 senior-career spell rows, but its squad-derived player coverage is not a complete EFL-only archive. If a curated EFL/global name is absent there, Career File falls back to Wikidata P54 club-membership statements for the club pathway. National-team entities are explicitly excluded from the club query. Wikidata fallback rows show dates where qualifiers exist, but appearances/goals/assists are deliberately blank because P54 does not provide those statistics. OpenFootballBase appearances/goals are unverified senior-career club-spell totals, not necessarily league-only figures; the UI labels this difference and leaves assists unavailable. Youth national-team rows are excluded from the senior-cap hint; the remaining Wikipedia-infobox cap totals are still marked unverified. OpenFootballBase is Wikipedia CC BY-SA 4.0 (source page/revision attribution) and Wikidata CC0.
