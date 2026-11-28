const SOURCE_URL = "https://quiz-fc.com/data/pl-history.v2.json";

const response = await fetch(SOURCE_URL, {
  headers: { "user-agent": "PLAYGROUND-CareerFile-Research/1.0" }
});
if (!response.ok) {
  throw new Error("Quiz FC source request failed: HTTP " + response.status);
}
const bytes = Number(response.headers.get("content-length") || 0);
const payload = await response.json();

console.log("SOURCE", SOURCE_URL);
console.log("HTTP", response.status);
console.log("CONTENT_LENGTH_BYTES", bytes || "not supplied");
console.log("ROOT_TYPE", Array.isArray(payload) ? "array" : typeof payload);
console.log("ROOT_KEYS", Object.keys(payload ?? {}).join(", "));
console.log("META", JSON.stringify(payload?.meta ?? null));
console.log("JSON_CHAR_LENGTH", JSON.stringify(payload).length);
const clubSeasonLevel = new Map((payload.clubSeasons ?? []).map(([year, clubIndex, level]) => [year + "|" + clubIndex, level]));
const statsByPlayer = new Map();
for (const row of payload.stats ?? []) {
  const [playerIndex, year, clubIndex, apps, goals] = row;
  const list = statsByPlayer.get(playerIndex) ?? [];
  list.push({ year, clubIndex, apps, goals, level: clubSeasonLevel.get(year + "|" + clubIndex) ?? "none" });
  statsByPlayer.set(playerIndex, list);
}
const careerByPlayer = new Map((payload.careerTotals ?? []).map(([playerIndex, apps, goals, appsFlag, goalsFlag, linesFlag]) => [
  playerIndex, { apps, goals, appsComplete: appsFlag === 1 && typeof apps === "number", goalsComplete: goalsFlag === 1 && typeof goals === "number", linesComplete: linesFlag === 1 }
]));
const tierCounts = () => ({ EASY: 0, MEDIUM: 0, HARD: 0, EXTREME: 0 });
const strictTiers = tierCounts();
const flexibleTiers = tierCounts();
const oneClubTiers = tierCounts();
let complete10Plus = 0;
let twoFullSeasons = 0;
let twoFullClubs = 0;
for (let playerIndex = 0; playerIndex < (payload.players ?? []).length; playerIndex++) {
  const player = payload.players[playerIndex];
  const fameRank = player[6];
  const total = careerByPlayer.get(playerIndex);
  const seasonRows = (statsByPlayer.get(playerIndex) ?? []).filter(row => row.level === "full" && typeof row.apps === "number" && typeof row.goals === "number");
  const clubs = new Set(seasonRows.map(row => row.clubIndex));
  const seasonApps = seasonRows.reduce((sum, row) => sum + row.apps, 0);
  const hasTwoSeasons = seasonRows.length >= 2 && seasonApps >= 10;
  const hasTwoClubs = clubs.size >= 2;
  const totalsComplete = total?.appsComplete && total?.goalsComplete && player[12] === 1 && total.apps >= 10;
  const tier = fameRank <= 300 ? "EASY" : fameRank <= 1200 ? "MEDIUM" : fameRank <= 2500 ? "HARD" : "EXTREME";
  if (totalsComplete) complete10Plus++;
  if (hasTwoSeasons) twoFullSeasons++;
  if (hasTwoSeasons && hasTwoClubs) twoFullClubs++;
  if (totalsComplete && hasTwoSeasons && hasTwoClubs) strictTiers[tier]++;
  if (hasTwoSeasons && hasTwoClubs) flexibleTiers[tier]++;
  if (hasTwoSeasons) oneClubTiers[tier]++;
}
console.log("CANDIDATE_COUNTS", JSON.stringify({ complete10Plus, twoFullSeasons, twoFullClubs, strictTiers, flexibleTiers, oneClubTiers }));
for (const key of ["competitions", "seasons", "clubs", "players", "stats", "clubSeasons", "careerTotals", "lineups"]) {
  const rows = payload?.[key];
  if (Array.isArray(rows) && rows.length) {
    console.log("SAMPLE_ROW", key, JSON.stringify(rows[0]));
    if (rows.length > 1) console.log("SAMPLE_ROW_2", key, JSON.stringify(rows[1]));
    if (key === "players") {
      for (const index of [394, 558]) console.log("PLAYER_INDEX_SAMPLE", index, JSON.stringify(rows[index] ?? null));
    }
    if (key === "careerTotals") {
      for (const index of [0, 394, 558]) console.log("CAREER_TOTAL_BY_PLAYER", index, JSON.stringify(rows.find((row) => row[0] === index) ?? null));
    }
    if (key === "stats") {
      for (const index of [0, 1, 2, 3]) console.log("STAT_INDEX_SAMPLE", index, JSON.stringify(rows[index] ?? null));
    }
  }
}

const seen = new Set();
function inspect(value, path = "$", depth = 0) {
  if (depth > 5 || value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    console.log("ARRAY", path, "COUNT", value.length);
    if (value.length && value[0] && typeof value[0] === "object") {
      console.log("ARRAY_SAMPLE_KEYS", path, Object.keys(value[0]).join(", "));
      inspect(value[0], path + "[0]", depth + 1);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = path + "." + key;
    if (child && typeof child === "object") {
      if (!seen.has(childPath)) {
        seen.add(childPath);
        inspect(child, childPath, depth + 1);
      }
    }
  }
}
inspect(payload);

// Read only the public Career Path bundle references to understand compact
// array indexes. This is a schema audit; no application code is copied.
const pageResponse = await fetch("https://quiz-fc.com/career-path/", {
  headers: { "user-agent": "PLAYGROUND-CareerFile-Research/1.0" }
});
console.log("CAREER_PATH_PAGE_HTTP", pageResponse.status);
if (pageResponse.ok) {
  const html = await pageResponse.text();
  const scriptUrls = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => new URL(match[1], "https://quiz-fc.com").href);
  console.log("CAREER_PATH_SCRIPT_COUNT", scriptUrls.length);
  for (const scriptUrl of scriptUrls) {
    const scriptResponse = await fetch(scriptUrl, {
      headers: { "user-agent": "PLAYGROUND-CareerFile-Research/1.0" }
    });
    if (!scriptResponse.ok) continue;
    const source = await scriptResponse.text();
    for (const term of ["function ox", "careerTotals.map", "clubSeasons", "pl-history.v2.json", "career-index", "careerIndex", "Career index data"]) {
      let searchFrom = 0;
      let found = 0;
      while (found < 3) {
        const at = source.indexOf(term, searchFrom);
        if (at < 0) break;
        console.log("SCRIPT_SCHEMA_CONTEXT", scriptUrl, term,
          source.slice(Math.max(0, at - 700), Math.min(source.length, at + 2400)));
        searchFrom = at + term.length;
        found++;
      }
    }
    /* old term loop removed */
    for (const term of []) {
      const at = source.indexOf(term);
      if (at >= 0) {
        console.log("SCRIPT_SCHEMA_CONTEXT", scriptUrl, term,
          source.slice(Math.max(0, at - 450), Math.min(source.length, at + 900)));
      }
    }
  }
}

