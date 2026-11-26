import * as duckdb from "@duckdb/duckdb-wasm";

export type LeagueCode = "ALL" | "ENG-PL" | "ESP-LL" | "ITA-SA" | "DEU-BL" | "FRA-L1";
export type Candidate = { id: string; name: string; apps: number; spells: number; clubs: number; statSeasons: number };
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
let transferPromise: Promise<void> | undefined;
const CDN = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/dist/";
const BIG_FIVE = ["ENG-PL", "ESP-LL", "ITA-SA", "DEU-BL", "FRA-L1"];

async function openDb(): Promise<Archive> {
  const [workerRes, wasmRes, manifestRes] = await Promise.all([
    fetch(CDN + "duckdb-browser-eh.worker.js"),
    fetch(CDN + "duckdb-eh.wasm"),
    fetch("/career-data/data/manifest.json", { cache: "no-cache" })
  ]);
  if (!workerRes.ok || !wasmRes.ok) throw new Error("Could not load the player archive engine.");
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
  const squads: string[] = [];
  const seasons = Object.entries(manifest.seasons ?? {}).sort((a: any, b: any) => String(a[0]).localeCompare(String(b[0])));
  for (let index = 0; index < seasons.length; index++) {
    const season: any = seasons[index][1];
    if (!season.files?.squad?.path) continue;
    const file = "squad_" + index + ".parquet";
    await register(file, season.files.squad.path);
    squads.push("'" + file + "'");
  }
  if (!squads.length) throw new Error("The archive contains no season squad files.");
  await conn.query("CREATE VIEW squad AS SELECT * FROM read_parquet([" + squads.join(",") + "], union_by_name=true)");
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

export async function getCandidates(league: LeagueCode): Promise<Candidate[]> {
  const archive = await careerArchive();
  const codes = league === "ALL" ? BIG_FIVE : [league];
  const marks = codes.map(() => "?").join(",");
  // Require at least two real club-season statistical records so every round can offer free stats clues.
  const sql =
    "WITH big_clubs AS (" +
    " SELECT DISTINCT c.wikidata_qid AS qid FROM competition_club cc " +
    " JOIN club c ON c.wikipedia_title=cc.club " +
    " WHERE cc.competition IN (" + marks + ") AND c.wikidata_qid IS NOT NULL" +
    "), eligible AS (" +
    " SELECT DISTINCT cr.player_qid FROM career cr JOIN big_clubs b ON b.qid=cr.club_qid " +
    " WHERE cr.player_qid IS NOT NULL AND trim(cr.player_qid)<>''" +
    "), career_summary AS (" +
    " SELECT cr.player_qid AS candidate_id, any_value(cr.player) AS player_name, " +
    " COUNT(*) AS spells, COUNT(DISTINCT coalesce(nullif(cr.club_qid,''),cr.club_name)) AS clubs, " +
    " SUM(coalesce(cr.apps,0)) AS apps " +
    " FROM career cr JOIN eligible e ON e.player_qid=cr.player_qid GROUP BY cr.player_qid" +
    "), stats_summary AS (" +
    " SELECT player_qid, COUNT(DISTINCT CASE WHEN apps IS NOT NULL OR goals IS NOT NULL THEN " +
    " coalesce(nullif(club_qid,''),nullif(club_link,''),club) || '|' || season END) AS stat_seasons " +
    " FROM stat_club WHERE coalesce(competition_group,'')<>'Total' GROUP BY player_qid" +
    ") " +
    "SELECT c.candidate_id, c.player_name, c.spells, c.clubs, c.apps, s.stat_seasons " +
    "FROM career_summary c JOIN stats_summary s ON s.player_qid=c.candidate_id " +
    "WHERE c.apps>=20 AND s.stat_seasons>=2 ORDER BY random() LIMIT 30000";
  const rows = await archive.query(sql, codes);
  return rows.map((r: any) => ({
    id: String(r.candidate_id), name: String(r.player_name ?? ""),
    apps: Number(r.apps ?? 0), spells: Number(r.spells ?? 0),
    clubs: Number(r.clubs ?? 0), statSeasons: Number(r.stat_seasons ?? 0)
  }));
}
const n = (v: unknown): number | null => v == null || v === "" ? null : Number(v);

export async function getPlayer(id: string): Promise<Player> {
  const a = await careerArchive();
  // Run queries sequentially on the shared DuckDB connection; concurrent prepared queries can contend on one connection.
  const spells = await a.query("SELECT * FROM career WHERE player_qid=? ORDER BY seq", [id]);
  const stats = await a.query("SELECT club,club_link,season,SUM(apps) apps,SUM(goals) goals,SUM(assists) assists " +
    "FROM stat_club WHERE player_qid=? AND coalesce(competition_group,'')<>'Total' GROUP BY club,club_link,season", [id]);
  const profile = await a.query("SELECT full_name,height_cm,birth_place FROM player_profile WHERE player_qid=? LIMIT 1", [id]);
  const birth = await a.query("SELECT birth_date,precision FROM birth WHERE player_qid=? LIMIT 1", [id]);
  const national = await a.query("SELECT SUM(caps) caps,SUM(goals) goals,list(team_name) teams FROM national WHERE player_qid=?", [id]);
  const positions = await a.query("SELECT position,COUNT(*) n FROM squad WHERE player_qid=? AND competition IN ('ENG-PL','ESP-LL','ITA-SA','DEU-BL','FRA-L1') AND position IS NOT NULL AND trim(position)<>'' GROUP BY position ORDER BY n DESC LIMIT 1", [id]);
  const nations = await a.query("SELECT nationality,COUNT(*) n FROM squad WHERE player_qid=? AND competition IN ('ENG-PL','ESP-LL','ITA-SA','DEU-BL','FRA-L1') AND nationality IS NOT NULL AND trim(nationality)<>'' GROUP BY nationality ORDER BY n DESC LIMIT 1", [id]);
  if (!spells.length) throw new Error("No usable career record for this player. Try the next file.");
  const first = spells[0], info = profile[0] ?? {}, dob = birth[0] ?? {}, intl = national[0] ?? {};
  const source = String(first.source_title ?? "");
  const revision = n(first.source_revid);
  return {
    id, name: String(first.player ?? "Unknown"), fullName: String(info.full_name ?? first.player ?? "Unknown"),
    nationality: String(nations[0]?.nationality ?? ""), position: String(positions[0]?.position ?? ""),
    height: n(info.height_cm), birthDate: String(dob.birth_date ?? ""), birthPrecision: n(dob.precision),
    birthplace: String(info.birth_place ?? ""),
    spells: spells.map((r: any) => ({ seq: Number(r.seq ?? 0), years: String(r.years_raw ?? ""),
      start: n(r.start_year), end: n(r.end_year), club: String(r.club_name ?? "Unknown club"),
      clubLink: String(r.club_link ?? ""), loan: Boolean(r.loan), apps: n(r.apps), goals: n(r.goals),
      sourceTitle: String(r.source_title ?? source), sourceRevision: n(r.source_revid) ?? revision })),
    stats: stats.map((r: any) => ({ club: String(r.club ?? ""), clubLink: String(r.club_link ?? ""),
      season: String(r.season ?? ""), apps: n(r.apps), goals: n(r.goals), assists: n(r.assists) })),
    caps: n(intl.caps), internationalGoals: n(intl.goals),
    teams: Array.isArray(intl.teams) ? intl.teams.map(String).filter(Boolean) : [],
    wikipediaUrl: source ? "https://en.wikipedia.org/w/index.php?title=" + encodeURIComponent(source) +
      (revision ? "&oldid=" + revision : "") : "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(first.player ?? ""))
  };
}
export async function getTransferHints(names: string[]): Promise<Transfer[]> {
  const a = await careerArchive();
  if (!transferPromise) transferPromise = (async () => {
    await a.db.registerFileURL("transfers.csv", new URL("/career-data/transfers.csv", location.origin).href,
      duckdb.DuckDBDataProtocol.HTTP, false);
    await a.conn.query("CREATE VIEW transfer_archive AS SELECT * FROM read_csv_auto('transfers.csv',header=true,ignore_errors=true)");
  })();
  await transferPromise;
  const cols = await a.query("DESCRIBE transfer_archive");
  if (!cols.some((c: any) => String(c.column_name).toLowerCase() === "player_name"))
    throw new Error("The transfer source has no player name column.");
  const found: any[] = [];
  for (const name of Array.from(new Set(names.map(v => v.trim()).filter(Boolean)))) {
    found.push(...await a.query("SELECT * FROM transfer_archive WHERE lower(trim(player_name))=lower(trim(?)) LIMIT 60", [name]));
  }
  const get = (row: any, key: string) => row[key] == null ? "" : String(row[key]);
  const unique = new Map<string, Transfer>();
  for (const row of found) {
    const raw = get(row, "fee").trim(), cleaned = get(row, "fee_cleaned");
    const fee = raw && raw !== "?" && raw !== "-" ? raw :
      cleaned && Number.isFinite(Number(cleaned)) ? "Approx. €" + Number(cleaned).toFixed(2) + "m" : "Not disclosed";
    const item = { year: get(row, "year"), from: get(row, "source_club"), to: get(row, "target_club"),
      fee, league: get(row, "league") };
    unique.set([item.year,item.from,item.to,item.fee].join("|"), item);
  }
  return Array.from(unique.values()).sort((x,y) => x.year.localeCompare(y.year));
}