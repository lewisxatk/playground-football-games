import type { Candidate, CareerDifficulty, Player } from "./careerFileData";

type RawPlayer = [
  string, string, string | null, string | null, string | null,
  number, number, string[] | null, string | null, string | null,
  string[] | null, number | null, number
];
type RawClub = [string, string, string, string];
type RawStat = [
  number, number, number, number | null, number | null,
  number | null, number | null, number | null, number?
];
type RawCareerTotal = [number, number | null, number | null, number, number, number];
type RawDataset = {
  format: string;
  version: number;
  meta: { license?: string; licenseUrl?: string; sourceDate?: string; coverage?: any };
  players: RawPlayer[];
  clubs: RawClub[];
  stats: RawStat[];
  clubSeasons: [number, number, "full" | "goals"][];
  careerTotals: RawCareerTotal[];
};

type NormalPlayer = {
  index: number;
  id: string;
  name: string;
  dob: string;
  nationality: string;
  position: string;
  prominence: number;
  fameRank: number;
  aliases: string[];
  qid: string;
  birthYear: number | null;
  careerComplete: boolean;
};

type NormalStat = {
  playerIndex: number;
  seasonEndYear: number;
  clubIndex: number;
  apps: number | null;
  goals: number | null;
  assists: number | null;
  seq: number | null;
  statsLevel: "full" | "goals" | "none";
};

type CareerTotal = {
  apps: number | null;
  goals: number | null;
  appsComplete: boolean;
  goalsComplete: boolean;
  linesComplete: boolean;
};

type Dataset = {
  players: NormalPlayer[];
  clubs: { id: string; name: string; short: string; country: string }[];
  statsByPlayer: Map<number, NormalStat[]>;
  playerIndexById: Map<string, number>;
  totalsByPlayer: Map<number, CareerTotal>;
};

let datasetPromise: Promise<Dataset> | null = null;
const playerCache = new Map<string, Player>();

const NATIONALITIES: Record<string, string> = {
  ENG: "England", SCO: "Scotland", WAL: "Wales", NIR: "Northern Ireland",
  IRL: "Republic of Ireland", FRA: "France", SEN: "Senegal", CIV: "Ivory Coast",
  NGA: "Nigeria", GHA: "Ghana", CMR: "Cameroon", MAR: "Morocco", ALG: "Algeria",
  EGY: "Egypt", BRA: "Brazil", ARG: "Argentina", URU: "Uruguay", COL: "Colombia",
  CHI: "Chile", ECU: "Ecuador", MEX: "Mexico", USA: "United States", CAN: "Canada",
  AUS: "Australia", NZL: "New Zealand", JPN: "Japan", KOR: "South Korea",
  ESP: "Spain", POR: "Portugal", NED: "Netherlands", GER: "Germany", ITA: "Italy",
  BEL: "Belgium", DEN: "Denmark", SWE: "Sweden", NOR: "Norway", FIN: "Finland",
  ISL: "Iceland", CRO: "Croatia", SRB: "Serbia", POL: "Poland", CZE: "Czechia",
  UKR: "Ukraine", RUS: "Russia", TUR: "Turkey", GRE: "Greece", SUI: "Switzerland",
  AUT: "Austria", SVK: "Slovakia", SVN: "Slovenia", ROU: "Romania", BUL: "Bulgaria",
  PAR: "Paraguay", PER: "Peru", VEN: "Venezuela", JAM: "Jamaica", RSA: "South Africa",
  TUN: "Tunisia", COD: "DR Congo", GUI: "Guinea", MLI: "Mali", BFA: "Burkina Faso",
  TOG: "Togo", GAB: "Gabon", GIN: "Guinea", ANG: "Angola", CPV: "Cape Verde",
  BIH: "Bosnia and Herzegovina", MNE: "Montenegro", ALB: "Albania", MKD: "North Macedonia"
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function loadDataset(): Promise<Dataset> {
  const response = await fetch("/api/career-file-history", { cache: "force-cache" });
  if (!response.ok) throw new Error("Premier League history could not be loaded (" + response.status + ").");
  const raw = await response.json() as RawDataset;
  if (!String(raw.meta?.license ?? "").includes("CC BY-SA 4.0") || raw.meta?.licenseUrl !== "https://creativecommons.org/licenses/by-sa/4.0/") {
    throw new Error("The Premier League history source licence or attribution has changed; data was not loaded.");
  }
  if (raw.format !== "quizfc-pl-history" || raw.version !== 2 ||
      !Array.isArray(raw.players) || !Array.isArray(raw.clubs) ||
      !Array.isArray(raw.stats) || !Array.isArray(raw.clubSeasons) ||
      !Array.isArray(raw.careerTotals)) {
    throw new Error("The Premier League history file has an unexpected format.");
  }

  const players: NormalPlayer[] = raw.players.map((row, index) => ({
    index,
    id: String(row[0] ?? ""),
    name: String(row[1] ?? "").trim(),
    dob: String(row[2] ?? ""),
    nationality: String(row[3] ?? "UNK"),
    position: String(row[4] ?? ""),
    prominence: asNumber(row[5]) ?? 0,
    fameRank: asNumber(row[6]) ?? Number.MAX_SAFE_INTEGER,
    aliases: Array.isArray(row[7]) ? row[7].map(String).filter(Boolean) : [],
    qid: String(row[8] ?? row[0] ?? ""),
    birthYear: asNumber(row[11]),
    careerComplete: row[12] === 1
  }));
  const clubs = raw.clubs.map((row: RawClub) => ({
    id: String(row[0]), name: String(row[1]), short: String(row[2]), country: String(row[3])
  }));
  const levels = new Map<string, "full" | "goals">(
    raw.clubSeasons.map(([year, clubIndex, level]) => [year + "|" + clubIndex, level])
  );
  const statsByPlayer = new Map<number, NormalStat[]>();
  for (const row of raw.stats) {
    const [playerIndex, seasonEndYear, clubIndex, apps, goals, assists, _starts, _minutes, seq] = row;
    if (!players[playerIndex] || !clubs[clubIndex]) continue;
    const list = statsByPlayer.get(playerIndex) ?? [];
    list.push({
      playerIndex, seasonEndYear, clubIndex,
      apps: asNumber(apps), goals: asNumber(goals), assists: asNumber(assists),
      seq: asNumber(seq), statsLevel: levels.get(seasonEndYear + "|" + clubIndex) ?? "none"
    });
    statsByPlayer.set(playerIndex, list);
  }
  const totalsByPlayer = new Map<number, CareerTotal>();
  for (const [playerIndex, apps, goals, appsFlag, goalsFlag, linesFlag] of raw.careerTotals) {
    totalsByPlayer.set(playerIndex, {
      apps: asNumber(apps), goals: asNumber(goals),
      appsComplete: appsFlag === 1 && asNumber(apps) !== null,
      goalsComplete: goalsFlag === 1 && asNumber(goals) !== null,
      linesComplete: linesFlag === 1
    });
  }
  return {
    players, clubs, statsByPlayer, totalsByPlayer,
    playerIndexById: new Map(players.map(player => [player.id, player.index]))
  };
}

function getDataset(): Promise<Dataset> {
  if (!datasetPromise) {
    datasetPromise = loadDataset().catch(error => {
      datasetPromise = null;
      throw error;
    });
  }
  return datasetPromise;
}

export async function getQuizFcCareerCandidates(): Promise<Candidate[]> {
  const data = await getDataset();
  const candidates: Candidate[] = [];
  for (const player of data.players) {
    if (!player.id || !player.name) continue;
    const rows = (data.statsByPlayer.get(player.index) ?? []).filter(row =>
      row.statsLevel === "full" && row.apps !== null && row.goals !== null
    );
    const clubIds = new Set(rows.map(row => row.clubIndex));
    const recordedApps = rows.reduce((sum, row) => sum + (row.apps ?? 0), 0);
    // Require two independently recorded full PL season rows, at least ten
    // recorded league appearances and two PL clubs. Missing career totals do
    // not disqualify a player; their total-stat hints remain unavailable.
    if (rows.length < 2 || clubIds.size < 2 || recordedApps < 10) continue;
    const total = data.totalsByPlayer.get(player.index);
    const appsAreComplete = player.careerComplete && total?.appsComplete;
    candidates.push({
      id: player.id, name: player.name,
      apps: appsAreComplete ? (total?.apps ?? recordedApps) : recordedApps,
      spells: clubIds.size, clubs: clubIds.size, statSeasons: rows.length,
      fameRank: player.fameRank, source: "quizfc-pl"
    });
  }
  return candidates.sort((a, b) =>
    (a.fameRank ?? Number.MAX_SAFE_INTEGER) - (b.fameRank ?? Number.MAX_SAFE_INTEGER) ||
    a.id.localeCompare(b.id)
  );
}

export function getQuizFcStatEligibleCandidates(candidates: Candidate[]): Candidate[] {
  return candidates.filter(candidate => candidate.source === "quizfc-pl" && candidate.statSeasons >= 2 && candidate.clubs >= 2);
}

function seasonLabel(seasonEndYear: number): string {
  return (seasonEndYear - 1) + "/" + String(seasonEndYear).slice(-2);
}

function positionName(position: string): string {
  return ({ GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", ATT: "Forward" } as Record<string, string>)[position] ?? position;
}

function buildSpells(rows: NormalStat[], clubs: Dataset["clubs"]): Player["spells"] {
  const byClub = new Map<number, NormalStat[]>();
  for (const row of rows) {
    const group = byClub.get(row.clubIndex) ?? [];
    group.push(row);
    byClub.set(row.clubIndex, group);
  }
  const spells: Player["spells"] = [];
  let spellSeq = 0;
  for (const [clubIndex, group] of byClub) {
    const sorted = [...group].sort((a, b) => a.seasonEndYear - b.seasonEndYear);
    const club = clubs[clubIndex];
    const first = sorted[0].seasonEndYear - 1;
    const last = sorted[sorted.length - 1].seasonEndYear - 1;
    // The source has season-by-season PL club participation, not exact
    // transfer dates or loan spells. Keep one record per club and leave
    // missing seasons blank rather than inventing separate return spells.
    spells.push({
      seq: spellSeq++,
      years: first === last ? String(first) : first + "–" + last,
      start: first, end: last, club: club.name,
      clubLink: club.id, clubQid: "", loan: false,
      apps: null, goals: null, sourceTitle: "", sourceRevision: null
    });
  }
  return spells.sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999) || a.seq - b.seq);
}

export async function getQuizFcCareerPlayer(id: string): Promise<Player> {
  const cached = playerCache.get(id);
  if (cached) return cached;
  const data = await getDataset();
  const playerIndex = data.playerIndexById.get(id);
  if (playerIndex === undefined) throw new Error("This player is not in the Premier League history source.");
  const source = data.players[playerIndex];
  const rows = [...(data.statsByPlayer.get(playerIndex) ?? [])].sort((a, b) =>
    a.seasonEndYear - b.seasonEndYear || a.clubIndex - b.clubIndex
  );
  const stats = rows.map(row => {
    const club = data.clubs[row.clubIndex];
    return {
      club: club.name, clubLink: club.id, clubQid: "",
      season: seasonLabel(row.seasonEndYear),
      apps: row.apps, goals: row.goals, assists: row.assists, seq: row.seq
    };
  });
  const total = data.totalsByPlayer.get(playerIndex);
  const careerAppsComplete = source.careerComplete && Boolean(total?.appsComplete);
  const careerGoalsComplete = source.careerComplete && Boolean(total?.goalsComplete);
  const birthDate = source.dob || (source.birthYear ? String(source.birthYear) : "");
  const birthPrecision = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? 11 : /^\d{4}$/.test(birthDate) ? 9 : null;
  const player: Player = {
    id: source.id, name: source.name, fullName: source.name,
    nationality: source.nationality === "UNK" ? "" : (NATIONALITIES[source.nationality] ?? source.nationality),
    position: positionName(source.position),
    height: null, birthDate, birthPrecision, birthplace: "",
    spells: buildSpells(rows, data.clubs), stats,
    caps: null, internationalGoals: null, teams: [],
    wikipediaUrl: source.qid ? "https://www.wikidata.org/wiki/" + source.qid : "",
    aliases: source.aliases,
    careerApps: careerAppsComplete ? (total?.apps ?? null) : null,
    careerGoals: careerGoalsComplete ? (total?.goals ?? null) : null,
    careerAppsComplete, careerGoalsComplete
  };
  playerCache.set(id, player);
  return player;
}

export function getQuizFcSourceNote(): string {
  return "Premier League league statistics only (1992/93 onward). Club dates are first/last recorded PL seasons, not exact transfer dates; gaps remain unrecorded. Missing appearances, goals and incomplete career totals remain unrecorded; cup, European and EFL figures are not included.";
}

export type { CareerDifficulty };
