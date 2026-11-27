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
  // Do not register every season squad parquet on startup. The files are numerous and
  // very large on mobile; the quiz can draw and show its core career clues without them.
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
  // Keep the initial draw lightweight: only scan career and club identity tables here.
  // Season-stat validation happens on the selected player record, not in a global aggregation.
  const sql =
    "WITH big_clubs AS (" +
    " SELECT DISTINCT c.wikidata_qid AS qid FROM competition_club cc " +
    " JOIN club c ON c.wikipedia_title=cc.club " +
    " WHERE cc.competition IN (" + marks + ") AND c.wikidata_qid IS NOT NULL" +
    "), eligible AS (" +
    " SELECT DISTINCT cr.player_qid FROM career cr JOIN big_clubs b ON b.qid=cr.club_qid " +
    " WHERE cr.player_qid IS NOT NULL AND trim(cr.player_qid)<>''" +
    ") " +
    "SELECT cr.player_qid AS candidate_id, any_value(cr.player) AS player_name, " +
    "COUNT(*) AS spells, COUNT(DISTINCT coalesce(nullif(cr.club_qid,''),cr.club_name)) AS clubs, " +
    "SUM(coalesce(cr.apps,0)) AS apps " +
    "FROM career cr JOIN eligible e ON e.player_qid=cr.player_qid " +
    "GROUP BY cr.player_qid HAVING SUM(coalesce(cr.apps,0))>=20 " +
    "ORDER BY hash(cr.player_qid) LIMIT 12000";
  const rows = await archive.query(sql, codes);
  return rows.map((r: any) => ({
    id: String(r.candidate_id), name: String(r.player_name ?? ""),
    apps: Number(r.apps ?? 0), spells: Number(r.spells ?? 0),
    clubs: Number(r.clubs ?? 0), statSeasons: Number(r.stat_seasons ?? 0)
  }));
}
const n = (v: unknown): number | null => v == null || v === "" ? null : Number(v);


/**
 * Preflight a small random batch of candidates against the season-stat table.
 * Career File used to fetch six tables for each candidate sequentially; that meant
 * a mobile device could scan the same Parquet source many times before a file appeared.
 * This performs one grouped pass for the whole batch and only opens a full profile
 * after a candidate has at least two usable club/season rows.
 */
export async function getStatEligibleCandidates(candidates: Candidate[]): Promise<Candidate[]> {
  if (!candidates.length) return [];
  const archive = await careerArchive();
  const eligible = new Map<string, number>();
  const batchSize = 120;
  for (let offset = 0; offset < candidates.length; offset += batchSize) {
    const batch = candidates.slice(offset, offset + batchSize);
    const ids = batch.map(candidate => candidate.id);
    const marks = ids.map(() => "?").join(",");
    const rows = await archive.query(
      "SELECT player_qid, COUNT(DISTINCT coalesce(nullif(club_qid,''), nullif(club_link,''), club) || '|' || season) AS stat_seasons " +
      "FROM stat_club WHERE player_qid IN (" + marks + ") " +
      "AND coalesce(competition_group,'') <> 'Total' AND apps IS NOT NULL AND goals IS NOT NULL " +
      "AND coalesce(trim(season),'') <> '' GROUP BY player_qid " +
      "HAVING COUNT(DISTINCT coalesce(nullif(club_qid,''), nullif(club_link,''), club) || '|' || season) >= 2",
      ids
    );
    for (const row of rows) eligible.set(String(row.player_qid), Number(row.stat_seasons ?? 0));
  }
  return candidates
    .filter(candidate => eligible.has(candidate.id))
    .map(candidate => ({ ...candidate, statSeasons: eligible.get(candidate.id) ?? 0 }));
}

export async function getPlayer(id: string): Promise<Player> {
  const a = await careerArchive();
  // Run queries sequentially on the shared DuckDB connection; concurrent prepared queries can contend on one connection.
  const spells = await a.query("SELECT * FROM career WHERE player_qid=? ORDER BY seq", [id]);
  const stats = await a.query("SELECT club,club_link,club_qid,season,SUM(apps) apps,SUM(goals) goals,SUM(assists) assists " +
    "FROM stat_club WHERE player_qid=? AND coalesce(competition_group,'')<>'Total' GROUP BY club,club_link,club_qid,season", [id]);
  const profile = await a.query("SELECT * FROM player_profile WHERE player_qid=? LIMIT 1", [id]);
  const birth = await a.query("SELECT birth_date,precision FROM birth WHERE player_qid=? LIMIT 1", [id]);
  const national = await a.query("SELECT SUM(caps) caps,SUM(goals) goals,list(team_name) teams FROM national WHERE player_qid=?", [id]);
  // Position and nationality are optional profile clues. Never scan every season squad file
  // just to populate them; those files are intentionally excluded from the initial load.
  if (!spells.length) throw new Error("No usable career record for this player. Try the next file.");
  const first = spells[0], info = profile[0] ?? {}, dob = birth[0] ?? {}, intl = national[0] ?? {};
  const source = String(first.source_title ?? "");
  const revision = n(first.source_revid);
  return {
    id, name: String(first.player ?? "Unknown"), fullName: String(info.full_name ?? first.player ?? "Unknown"),
    nationality: String(info.nationality ?? (Array.isArray(intl.teams) ? intl.teams[0] : "") ?? ""), position: String(info.position ?? ""),
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
  if (!response.ok || !response.body) throw new Error("Transfer data download failed (" + response.status + ").");
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
