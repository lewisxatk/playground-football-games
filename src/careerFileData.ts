import * as duckdb from "@duckdb/duckdb-wasm";

export type LeagueCode = "ALL" | "ENG-PL" | "ESP-LL" | "ITA-SA" | "DEU-BL" | "FRA-L1";
export type CareerDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXTREME";
export type Candidate = { id: string; name: string; apps: number; spells: number; clubs: number; statSeasons: number; region?: "ENGLISH" | "INTERNATIONAL" };
export type Spell = {
  seq: number; years: string; start: number | null; end: number | null; club: string;
  clubLink: string; clubQid: string; loan: boolean; apps: number | null; goals: number | null;
  sourceTitle: string; sourceRevision: number | null;
};
export type Stat = { club: string; clubLink: string; clubQid: string; season: string; apps: number | null; goals: number | null; assists: number | null };
export type Player = {
  id: string; name: string; fullName: string; nationality: string; position: string;
  height: number | null; birthDate: string; birthPrecision: number | null; birthplace: string;
  spells: Spell[]; stats: Stat[]; caps: number | null; internationalGoals: number | null;
  teams: string[]; wikipediaUrl: string;
};
export type Transfer = { year: string; from: string; to: string; fee: string; league: string };

type Archive = { db: any; conn: any; query: (sql: string, params?: unknown[]) => Promise<any[]> };
let dbPromise: Promise<Archive> | undefined;
const CDN = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/dist/";
const BIG_FIVE = ["ENG-PL", "ESP-LL", "ITA-SA", "DEU-BL", "FRA-L1"];

async function openDb(): Promise<Archive> {
  const [workerRes, manifestRes] = await Promise.all([
    fetch(CDN + "duckdb-browser-eh.worker.js", { cache: "force-cache" }),
    fetch("/career-data/data/manifest.json", { cache: "force-cache" })
  ]);
  if (!workerRes.ok) throw new Error("Could not load the player archive worker (" + workerRes.status + ").");
  if (!manifestRes.ok) throw new Error("The career archive is not available right now (" + manifestRes.status + ").");
  const manifest = await manifestRes.json();
  const workerUrl = URL.createObjectURL(new Blob([await workerRes.arrayBuffer()], { type: "text/javascript" }));
  const worker = new Worker(workerUrl);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(CDN + "duckdb-eh.wasm");
  URL.revokeObjectURL(workerUrl);
  const conn = await db.connect();
  const extensionRoot = new URL("/career-data/duckdb-ext", location.origin).href;
  await conn.query("SET custom_extension_repository = '" + extensionRoot.replace(/'/g, "''") + "'");
  const root = new URL("/career-data/data/", location.origin);
  const register = async (name: string, path: string) => {
    await db.registerFileURL(name, new URL(path, root).href, duckdb.DuckDBDataProtocol.HTTP, false);
  };
  const tables = ["career", "stat_club", "player_profile", "birth", "national", "club", "competition_club"];
  for (const table of tables) {
    const path = manifest.tables?.[table]?.path;
    if (!path) throw new Error("The archive is missing the " + table + " table.");
    const file = table + ".parquet";
    await register(file, path);
    await conn.query("CREATE VIEW " + table + " AS SELECT * FROM read_parquet('" + file + "')");
  }
  // Nationality and position come from the versioned squad records, not
  // player_profile (which contains name, birthplace, height and photo fields).
  const squadPaths = Object.values(manifest.seasons ?? {})
    .map((season:any) => season.files?.squad?.path)
    .filter((path:any): path is string => typeof path === "string" && path.length > 0);
  if (!squadPaths.length) throw new Error("The archive is missing all season squad files.");
  const squadFiles:string[] = [];
  for (let index = 0; index < squadPaths.length; index++) {
    const file = "squad-" + index + ".parquet";
    await register(file, squadPaths[index]);
    squadFiles.push("'" + file + "'");
  }
  // Squad exports evolve between seasons. Read the registered files together
  // and align their columns by name instead of UNIONing positional schemas.
  await conn.query(
    "CREATE VIEW squad AS SELECT * FROM read_parquet([" + squadFiles.join(",") + "], union_by_name=true)"
  );
  const query = async (sql: string, params: unknown[] = []) => {
    const statement = await conn.prepare(sql);
    try {
      const result = await statement.query(...params);
      return result.toArray().map((row: any) => {
        const item = row.toJSON();
        for (const key of Object.keys(item)) if (typeof item[key] === "bigint") item[key] = Number(item[key]);
        return item;
      });
    } finally { await statement.close(); }
  };
  return { db, conn, query };
}
export const careerArchive = () => dbPromise ?? (dbPromise = openDb());

export async function getCandidates(league: LeagueCode, difficulty: CareerDifficulty): Promise<Candidate[]> {
  const archive = await careerArchive();
  const codes = league === "ALL" ? BIG_FIVE : [league];
  const marks = codes.map(() => "?").join(",");
  // Apply the difficulty band in SQL BEFORE sampling. Previously the query
  // selected 2,400 players across every tier, then filtered that small sample
  // in the browser. That could leave Easy or Extreme with a tiny accidental pool.
  // Each tier now receives its own deterministic sample of up to 2,400 players.
  const band = difficulty === "EASY"
    ? "SUM(coalesce(cr.apps,0))>=450"
    : difficulty === "MEDIUM"
      ? "SUM(coalesce(cr.apps,0))>=250 AND SUM(coalesce(cr.apps,0))<450"
      : difficulty === "HARD"
        ? "SUM(coalesce(cr.apps,0))>=100 AND SUM(coalesce(cr.apps,0))<250"
        : "SUM(coalesce(cr.apps,0))>=20 AND SUM(coalesce(cr.apps,0))<100";
  const sql =
    "WITH selected_clubs AS (" +
    " SELECT DISTINCT c.wikidata_qid AS club_qid, c.wikipedia_title AS club_title FROM competition_club cc " +
    " JOIN club c ON c.wikipedia_title=cc.club " +
    " WHERE cc.competition IN (" + marks + ") AND coalesce(trim(c.wikidata_qid),'')<>''" +
    ") " +
    "SELECT cr.player_qid AS candidate_id, any_value(cr.player) AS player_name, " +
    "COUNT(*) AS spells, COUNT(DISTINCT coalesce(nullif(cr.club_qid,''),sc.club_qid)) AS clubs, " +
    "SUM(coalesce(cr.apps,0)) AS apps " +
    "FROM career cr JOIN selected_clubs sc ON (sc.club_qid=cr.club_qid OR " +
    "(coalesce(trim(cr.club_qid),'')='' AND lower(trim(cr.club_link))=lower(trim(sc.club_title)))) " +
    "WHERE cr.player_qid IS NOT NULL AND trim(cr.player_qid)<>'' " +
    "AND cr.start_year IS NOT NULL AND (cr.end_year IS NULL OR cr.end_year>=cr.start_year) " +
    "GROUP BY cr.player_qid " +
    "HAVING " + band + " AND COUNT(DISTINCT coalesce(nullif(cr.club_qid,''),sc.club_qid))>=2 " +
    " AND length(trim(any_value(cr.player)))>1 " +
    " AND lower(trim(any_value(cr.player))) NOT IN ('unknown','unknown player','unnamed','unnamed player','n/a','tbd') " +
    " AND NOT starts_with(lower(trim(any_value(cr.player))),'unknown ') " +
    " AND NOT starts_with(lower(trim(any_value(cr.player))),'unnamed ') " +
    "ORDER BY hash(cr.player_qid) LIMIT 2400";
  const rows = await archive.query(sql, codes);
  return rows.map((r: any) => ({
    id: String(r.candidate_id), name: String(r.player_name ?? ""),
    apps: Number(r.apps ?? 0), spells: Number(r.spells ?? 0),
    clubs: Number(r.clubs ?? 0), statSeasons: Number(r.stat_seasons ?? 0)
  }));
}

export type ArchiveCareerSpell={seq?:number;years?:string;club:string;startYear:number|null;endYear:number|null;clubLink?:string;clubQid?:string;loan?:boolean;apps?:number|null;goals?:number|null;sourceTitle?:string;sourceRevision?:number|null};
export type ArchiveGameStat={club:string;clubLink:string;clubQid:string;season:string;competitionGroup:string;apps:number|null;goals:number|null;assists:number|null};
export type ArchiveGamePlayer = {
  id: string;
  name: string;
  fullName?: string;
  nationality: string;
  position: string;
  clubs: string[];
  spells: ArchiveCareerSpell[];
  stats?: ArchiveGameStat[];
  seasonStats?: ArchiveGameStat[];
  currentClub: string;
  appearances: number;
  goals: number;
  careerAppearanceRows?: number;
  careerGoalRows?: number;
  leagueAppearanceRows?: number;
  leagueGoalRows?: number;
  leagueAppearances: number;
  leagueGoals: number;
  leagueGoalSeasons: number;
  leagueAssists?: number;
  leagueAssistSeasons?: number;
  seasons: number;
  firstYear: number | null;
  lastYear: number | null;
  caps: number | null;
  internationalGoals: number | null;
  nationalRows?: number;
  nationalTeams?: string[];
  birthDate: string;
  birthPrecision?: number | null;
  birthPlace?: string;
  heightCm?: number | null;
  currentCountry: string;
  currentLeague: string;
  currentDivision: number | null;
  careerSourceTitle?: string;
  careerSourceRevision?: number | null;
  statSourceTitle?: string;
  statSourceRevision?: number | null;
};
const gamePoolPromises = new Map<string, Promise<ArchiveGamePlayer[]>>();

/**
 * A broad game-ready player sample drawn from OpenFootballBase's career,
 * player-profile, birth, national and club-season statistics tables.
 * A single grouped archive pass replaces the old small hand-maintained pool
 * for random player, stats and career clue games.
 */
export async function getArchiveGamePlayers(limit = 1600, seed = "PLAYGROUND-GAMES-2026-01"): Promise<ArchiveGamePlayer[]> {
  const cacheKey = seed + ":" + limit;
  let gamePoolPromise = gamePoolPromises.get(cacheKey);
  if (!gamePoolPromise) {
    gamePoolPromise = (async () => {
      const a = await careerArchive();
      const sampleSize = Math.max(2400, Math.min(9000, limit * 4));
      const sample = await a.query(
        "SELECT player_qid FROM career WHERE player_qid IS NOT NULL AND trim(player_qid)<>'' " +
        "GROUP BY player_qid ORDER BY hash(player_qid || ?) LIMIT ?",
        [seed, sampleSize]
      );
      const ids = sample.map((row: any) => String(row.player_qid)).filter(Boolean);
      if (!ids.length) return [];
      const marks = ids.map(() => "(?)").join(",");
      const sql =
        "WITH picked(player_qid) AS (VALUES " + marks + "), " +
        "career_rollup AS (" +
        " SELECT cr.player_qid, any_value(cr.player) AS name, " +
        " list(DISTINCT cr.club_name) AS clubs, " +
        " list(struct_pack(club := cr.club_name, start_year := cr.start_year, end_year := cr.end_year)) AS career_spells, " +
        " COUNT(DISTINCT cr.club_name) AS club_count, " +
        " SUM(cr.apps) AS appearances, SUM(cr.goals) AS goals, " +
        " COUNT(cr.apps) AS appearance_rows, COUNT(cr.goals) AS goal_rows, " +
        " arg_max(cr.club_name, coalesce(cr.end_year,cr.start_year,0)) AS current_club, " +
        " arg_max(cr.club_qid, coalesce(cr.end_year,cr.start_year,0)) AS current_club_qid, " +
        " MIN(cr.start_year) AS first_year, MAX(cr.end_year) AS last_year " +
        " FROM career cr JOIN picked p ON p.player_qid=cr.player_qid " +
        " GROUP BY cr.player_qid HAVING SUM(coalesce(cr.apps,0))>=10" +
        "), stat_rollup AS (" +
        " SELECT st.player_qid, COUNT(DISTINCT coalesce(nullif(st.club_qid,''),nullif(st.club_link,''),st.club)||'|'||st.season) AS seasons, " +
        " SUM(CASE WHEN st.competition_group='League' AND st.apps IS NOT NULL THEN st.apps ELSE 0 END) AS league_appearances, " +
        " SUM(CASE WHEN st.competition_group='League' AND st.goals IS NOT NULL THEN st.goals ELSE 0 END) AS league_goals, " +
        " COUNT(DISTINCT CASE WHEN st.competition_group='League' AND st.goals IS NOT NULL " +
        " THEN coalesce(nullif(st.club_qid,''),nullif(st.club_link,''),st.club)||'|'||st.season END) AS league_goal_seasons, " +
        " SUM(CASE WHEN st.competition_group='League' THEN st.assists END) AS league_assists, " +
        " COUNT(DISTINCT CASE WHEN st.competition_group='League' AND st.assists IS NOT NULL " +
        " THEN coalesce(nullif(st.club_qid,''),nullif(st.club_link,''),st.club)||'|'||st.season END) AS league_assist_seasons " +
        " FROM stat_club st JOIN picked p ON p.player_qid=st.player_qid " +
        " WHERE coalesce(st.competition_group,'')<>'Total' AND coalesce(trim(st.season),'')<>'' GROUP BY st.player_qid" +
        "), profile_rollup AS (" +
        " SELECT pp.player_qid, any_value(pp.full_name) AS full_name, " +
        " any_value(pp.birth_place) AS birth_place, any_value(pp.height_cm) AS height_cm " +
        " FROM player_profile pp JOIN picked p ON p.player_qid=pp.player_qid GROUP BY pp.player_qid" +
        "), squad_rollup AS (" +
        " SELECT sq.player_qid, arg_max(sq.nationality, try_cast(substr(sq.season,1,4) AS INTEGER)) AS nationality, " +
        " arg_max(sq.position, try_cast(substr(sq.season,1,4) AS INTEGER)) AS position " +
        " FROM squad sq JOIN picked p ON p.player_qid=sq.player_qid " +
        " WHERE coalesce(trim(sq.player_qid),'')<>'' GROUP BY sq.player_qid" +
        "), birth_rollup AS (" +
        " SELECT b.player_qid, any_value(b.birth_date) AS birth_date " +
        " FROM birth b JOIN picked p ON p.player_qid=b.player_qid WHERE b.precision=11 GROUP BY b.player_qid" +
        "), national_rollup AS (" +
        " SELECT nt.player_qid, SUM(nt.caps) AS caps, SUM(nt.goals) AS international_goals " +
        " FROM national nt JOIN picked p ON p.player_qid=nt.player_qid GROUP BY nt.player_qid" +
        "), club_rollup AS (" +
        " SELECT wikidata_qid, any_value(country) AS country, any_value(league) AS league, " +
        " any_value(division) AS division FROM club GROUP BY wikidata_qid" +
        ") " +
        "SELECT c.player_qid, c.name, c.clubs, c.current_club, c.appearances, c.goals, " +
        "c.first_year, c.last_year, coalesce(c.club_count,0) AS club_count, " +
        "coalesce(st.seasons,0) AS seasons, coalesce(st.league_appearances,0) AS league_appearances, " +
        "coalesce(st.league_goals,0) AS league_goals, coalesce(st.league_goal_seasons,0) AS league_goal_seasons, " +
        "coalesce(st.league_assists,0) AS league_assists, coalesce(st.league_assist_seasons,0) AS league_assist_seasons, " +
        "coalesce(sq.nationality,'') AS nationality, coalesce(sq.position,'') AS position, " +
        "coalesce(pp.full_name,'') AS full_name, coalesce(pp.birth_place,'') AS birth_place, pp.height_cm, " +
        "coalesce(c.appearance_rows,0) AS appearance_rows, coalesce(c.goal_rows,0) AS goal_rows, " +
        "b.birth_date, nt.caps, nt.international_goals, " +
        "coalesce(cl.country,'') AS current_country, coalesce(cl.league,'') AS current_league, cl.division AS current_division " +
        "FROM career_rollup c LEFT JOIN stat_rollup st ON st.player_qid=c.player_qid " +
        "LEFT JOIN profile_rollup pp ON pp.player_qid=c.player_qid " +
        "LEFT JOIN squad_rollup sq ON sq.player_qid=c.player_qid " +
        "LEFT JOIN birth_rollup b ON b.player_qid=c.player_qid " +
        "LEFT JOIN national_rollup nt ON nt.player_qid=c.player_qid " +
        "LEFT JOIN club_rollup cl ON cl.wikidata_qid=c.current_club_qid " +
        "WHERE c.appearances>=20 ORDER BY hash(c.player_qid) LIMIT ?";
      const rows = await a.query(sql, [...ids, limit]);
      return rows.map((r: any): ArchiveGamePlayer => {
        const spells = Array.isArray(r.career_spells) ? r.career_spells.map((spell:any)=>({
          club:String(spell.club??""),
          startYear:n(spell.start_year),
          endYear:n(spell.end_year)
        })).filter((spell:any)=>spell.club).sort((a:any,b:any)=>(a.startYear??9999)-(b.startYear??9999)) : [];
        const chronologicalClubs = Array.from(new Set(spells.map((spell:any)=>spell.club)));
        return {
        id: String(r.player_qid),
        name: String(r.name ?? "Unknown player"),
        nationality: String(r.nationality ?? ""),
        position: String(r.position ?? ""),
        clubs: chronologicalClubs.length ? chronologicalClubs : (Array.isArray(r.clubs) ? r.clubs.map(String).filter(Boolean) : []),
        spells,
        currentClub: String(r.current_club ?? ""),
        appearances: Number(r.appearances ?? 0),
        goals: Number(r.goals ?? 0),
        leagueAppearances: Number(r.league_appearances ?? 0),
        leagueGoals: Number(r.league_goals ?? 0),
        leagueGoalSeasons: Number(r.league_goal_seasons ?? 0),
        leagueAssists: Number(r.league_assists ?? 0),
        leagueAssistSeasons: Number(r.league_assist_seasons ?? 0),
        fullName: String(r.full_name ?? ""),
        birthPlace: String(r.birth_place ?? ""),
        heightCm: n(r.height_cm),
        careerAppearanceRows: Number(r.appearance_rows ?? 0),
        careerGoalRows: Number(r.goal_rows ?? 0),
        seasons: Number(r.seasons ?? 0),
        firstYear: n(r.first_year),
        lastYear: n(r.last_year),
        caps: n(r.caps),
        internationalGoals: n(r.international_goals),
        birthDate: String(r.birth_date ?? ""),
        currentCountry: String(r.current_country ?? ""),
        currentLeague: String(r.current_league ?? ""),
        currentDivision: n(r.current_division)
        };
      });
    })().catch(error => {
      gamePoolPromises.delete(cacheKey);
      throw error;
    });
    gamePoolPromises.set(cacheKey, gamePoolPromise);
  }
  const rows = await gamePoolPromise;
  return rows.slice(0, limit);
}

const n = (v: unknown): number | null => v == null || v === "" ? null : Number(v);


/**
 * Preflight a small random batch of candidates against the season-stat table.
 * Career File used to fetch six tables for each candidate sequentially; that meant
 * a mobile device could scan the same Parquet source many times before a file appeared.
 * This performs one grouped pass for the whole batch and only opens a full profile
 * after a candidate has at least two usable club/season rows.
 */
export async function getStatEligibleCandidates(candidates: Candidate[], league: LeagueCode = "ENG-PL"): Promise<Candidate[]> {
  if (!candidates.length) return [];
  const archive = await careerArchive();
  const codes = league === "ALL" ? BIG_FIVE : [league];
  const competitionMarks = codes.map(() => "?").join(",");
  const eligible = new Map<string, number>();
  const batchSize = 120;
  for (let offset = 0; offset < candidates.length; offset += batchSize) {
    const batch = candidates.slice(offset, offset + batchSize);
    const ids = batch.map(candidate => candidate.id);
    const playerMarks = ids.map(() => "?").join(",");
    const rows = await archive.query(
      "WITH selected_clubs AS (" +
      " SELECT DISTINCT c.wikidata_qid AS club_qid, c.wikipedia_title AS club_title FROM competition_club cc " +
      " JOIN club c ON c.wikipedia_title=cc.club " +
      " WHERE cc.competition IN (" + competitionMarks + ") AND coalesce(trim(c.wikidata_qid),'')<>''" +
      ") " +
      "SELECT st.player_qid, COUNT(DISTINCT coalesce(nullif(st.club_qid,''), nullif(st.club_link,''), st.club) || '|' || st.season) AS stat_seasons " +
      "FROM stat_club st JOIN selected_clubs sc ON (sc.club_qid=st.club_qid OR (coalesce(trim(st.club_qid),'')='' AND lower(trim(st.club_link))=lower(trim(sc.club_title)))) " +
      "WHERE st.player_qid IN (" + playerMarks + ") " +
      "AND coalesce(st.competition_group,'') <> 'Total' AND st.apps IS NOT NULL AND st.goals IS NOT NULL " +
      "AND coalesce(trim(st.season),'') <> '' GROUP BY st.player_qid " +
      "HAVING COUNT(DISTINCT coalesce(nullif(st.club_qid,''), nullif(st.club_link,''), st.club) || '|' || st.season) >= 2",
      [...codes, ...ids]
    );
    for (const row of rows) eligible.set(String(row.player_qid), Number(row.stat_seasons ?? 0));
  }
  return candidates
    .filter(candidate => eligible.has(candidate.id))
    .map(candidate => ({ ...candidate, statSeasons: eligible.get(candidate.id) ?? 0 }));
}

export async function getPlayer(id: string, league: LeagueCode = "ENG-PL"): Promise<Player> {
  const a = await careerArchive();
  const codes = league === "ALL" ? BIG_FIVE : [league];
  const competitionMarks = codes.map(() => "?").join(",");
  const selectedClubsCte =
    "WITH selected_clubs AS (" +
    " SELECT DISTINCT c.wikidata_qid AS club_qid, c.wikipedia_title AS club_title FROM competition_club cc " +
    " JOIN club c ON c.wikipedia_title=cc.club " +
    " WHERE cc.competition IN (" + competitionMarks + ") AND coalesce(trim(c.wikidata_qid),'')<>''" +
    ") ";
  // Keep both the visible career and its season clues inside the same selected
  // competition. Filtering candidates alone is not enough: it previously allowed
  // one PL club to qualify a player, then exposed every overseas spell in the UI.
  // Run queries sequentially on the shared DuckDB connection; concurrent prepared queries can contend on one connection.
  const spells = await a.query(selectedClubsCte +
    "SELECT cr.* FROM career cr JOIN selected_clubs sc ON sc.club_qid=cr.club_qid " +
    "WHERE cr.player_qid=? AND cr.start_year IS NOT NULL " +
    "AND (cr.end_year IS NULL OR cr.end_year>=cr.start_year) ORDER BY cr.seq", [...codes, id]);
  const stats = await a.query(selectedClubsCte +
    "SELECT st.club,st.club_link,st.club_qid,st.season,SUM(st.apps) apps,SUM(st.goals) goals,SUM(st.assists) assists " +
    "FROM stat_club st JOIN selected_clubs sc ON (sc.club_qid=st.club_qid OR (coalesce(trim(st.club_qid),'')='' AND lower(trim(st.club_link))=lower(trim(sc.club_title)))) " +
    "WHERE st.player_qid=? AND coalesce(st.competition_group,'')<>'Total' " +
    "AND coalesce(trim(st.season),'')<>'' " +
    "GROUP BY st.club,st.club_link,st.club_qid,st.season", [...codes, id]);
  const profile = await a.query("SELECT * FROM player_profile WHERE player_qid=? LIMIT 1", [id]);
  const birth = await a.query("SELECT birth_date,precision FROM birth WHERE player_qid=? LIMIT 1", [id]);
  const national = await a.query("SELECT SUM(caps) caps,SUM(goals) goals,list(team_name) teams, " +
    "arg_max(team_name,caps) FILTER (WHERE NOT regexp_matches(team_name,'(?i)\\bU(1[789]|2[0-3])\\b')) AS senior_team " +
    "FROM national WHERE player_qid=?", [id]);
  const squadInfo = await a.query("SELECT arg_max(position,try_cast(substr(season,1,4) AS INTEGER)) AS position, " +
    "arg_max(nationality,try_cast(substr(season,1,4) AS INTEGER)) AS nationality " +
    "FROM squad WHERE player_qid=?", [id]);
  if (!spells.length) throw new Error("No usable career record for this player. Try the next file.");
  const first = spells[0], info = profile[0] ?? {}, dob = birth[0] ?? {}, intl = national[0] ?? {}, squad = squadInfo[0] ?? {};
  const source = String(first.source_title ?? "");
  const revision = n(first.source_revid);
  return {
    id, name: String(first.player ?? "Unknown"), fullName: String(info.full_name ?? first.player ?? "Unknown"),
    nationality: String(squad.nationality ?? intl.senior_team ?? ""),
    position: String(squad.position ?? ""),
    height: n(info.height_cm), birthDate: String(dob.birth_date ?? ""), birthPrecision: n(dob.precision),
    birthplace: String(info.birth_place ?? ""),
    spells: spells.map((r: any) => ({ seq: Number(r.seq ?? 0), years: String(r.years_raw ?? ""),
      start: n(r.start_year), end: n(r.end_year), club: String(r.club_name ?? "Unknown club"),
      clubLink: String(r.club_link ?? ""), clubQid: String(r.club_qid ?? ""), loan: Boolean(r.loan), apps: n(r.apps), goals: n(r.goals),
      sourceTitle: String(r.source_title ?? source), sourceRevision: n(r.source_revid) ?? revision })),
    stats: stats.map((r: any) => ({ club: String(r.club ?? ""), clubLink: String(r.club_link ?? ""), clubQid: String(r.club_qid ?? ""),
      season: String(r.season ?? ""), apps: n(r.apps), goals: n(r.goals), assists: n(r.assists) })),
    caps: n(intl.caps), internationalGoals: n(intl.goals),
    teams: Array.isArray(intl.teams) ? intl.teams.map(String).filter(Boolean) : [],
    wikipediaUrl: source ? "https://en.wikipedia.org/w/index.php?title=" + encodeURIComponent(source) +
      (revision ? "&oldid=" + revision : "") : "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(first.player ?? ""))
  };
}
type TransferIndex = Map<string, Transfer[]>;
let transferIndexPromise: Promise<TransferIndex> | null = null;

function normaliseTransferName(value: string): string {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function parseTransferCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value);
  return values;
}

async function loadTransferIndex(): Promise<TransferIndex> {
  const response = await fetch("/career-data/transfers.csv", { cache: "force-cache" });
  if (!response.ok || !response.body) {
    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      throw new Error("The optional transfer-history feed is temporarily blocked by its data host (" + response.status + "). No points have been deducted. Player identity, career timeline and all other clues remain available.");
    }
    throw new Error("Transfer history is unavailable (" + response.status + "). No points have been deducted.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const index = new Map<string, Transfer[]>();
  let buffer = "";
  let columns: string[] | null = null;
  let fields: Record<string, number> = {};

  const processLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, "");
    if (!line) return;
    const values = parseTransferCsvLine(line);
    if (!columns) {
      columns = values.map((value, i) => i === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim());
      columns.forEach((column, i) => { fields[column] = i; });
      if (fields.player_name === undefined) throw new Error("Transfer data is missing its player_name column.");
      return;
    }
    const get = (key: string) => values[fields[key] ?? -1] ?? "";
    const playerKey = normaliseTransferName(get("player_name"));
    if (!playerKey) return;
    const rawFee = get("fee").trim();
    const cleaned = get("fee_cleaned").trim();
    const fee = rawFee && rawFee !== "?" && rawFee !== "-"
      ? rawFee
      : cleaned !== "" && Number.isFinite(Number(cleaned))
        ? "Approx. €" + Number(cleaned).toFixed(2) + "m"
        : "Not disclosed";
    const record: Transfer = {
      year: get("year"),
      from: get("source_club"),
      to: get("target_club"),
      fee,
      league: get("source_league") || get("target_league") || get("league")
    };
    const existing = index.get(playerKey);
    if (existing) existing.push(record);
    else index.set(playerKey, [record]);
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        processLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    if (buffer) processLine(buffer);
    if (!columns) throw new Error("The transfer data file was empty.");
  } finally {
    reader.releaseLock();
  }
  return index;
}

export async function getTransferHints(names: string[]): Promise<Transfer[]> {
  if (!transferIndexPromise) {
    transferIndexPromise = loadTransferIndex().catch(error => {
      transferIndexPromise = null;
      throw error;
    });
  }
  const index = await transferIndexPromise;
  const unique = new Map<string, Transfer>();
  for (const name of names) {
    for (const record of index.get(normaliseTransferName(name)) ?? []) {
      unique.set([record.year,record.from,record.to,record.fee].join("|"), record);
    }
  }
  return Array.from(unique.values()).sort((a,b) => a.year.localeCompare(b.year));
}

export type HistoricalClubRecord={player:string;club:string;startYear:number|null;endYear:number|null;position:string};
const normaliseCareerName=(value:string)=>value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");

/**
 * Resolve the club spell recorded for a tournament-year player name.
 * Exact normalised names only: ambiguous/fuzzy surname guesses are intentionally avoided.
 * Missing/overlapping archive coverage is surfaced as unknown by the caller.
 */
export async function getCareerClubsAtYear(names:string[],year:number):Promise<Map<string,HistoricalClubRecord[]>>{
  const unique=Array.from(new Set(names.map(normaliseCareerName).filter(Boolean)));
  const result=new Map<string,HistoricalClubRecord[]>();
  if(!unique.length||!Number.isFinite(year))return result;
  const archive=await careerArchive();
  const values=unique.map(()=>"(?)").join(",");
  const rows=await archive.query(
    "WITH wanted(name_key) AS (VALUES "+values+"), profile AS ("+
    " SELECT player_qid,arg_max(position,try_cast(substr(season,1,4) AS INTEGER)) AS position "+
    " FROM squad WHERE try_cast(substr(season,1,4) AS INTEGER) BETWEEN ? AND ? GROUP BY player_qid"+
    ") "+
    "SELECT cr.player,cr.club_name,cr.start_year,cr.end_year,coalesce(profile.position,'') AS position "+
    "FROM career cr JOIN wanted w ON regexp_replace(strip_accents(lower(cr.player)),'[^a-z0-9]','','g')=w.name_key "+
    "LEFT JOIN profile ON profile.player_qid=cr.player_qid "+
    "WHERE coalesce(cr.start_year,0)<=? AND coalesce(cr.end_year,cr.start_year,0)>=? "+
    "ORDER BY cr.player_qid,cr.start_year,cr.seq",
    [...unique,year-1,year+1,year,year]
  );
  for(const row of rows){
    const player=String(row.player??"");
    const key=normaliseCareerName(player);
    const list=result.get(key)??[];
    list.push({player,club:String(row.club_name??""),startYear:n(row.start_year),endYear:n(row.end_year),position:String(row.position??"")});
    result.set(key,list);
  }
  return result;
}
