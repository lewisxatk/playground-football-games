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
    for (const term of ["careerTotals", "clubSeasons", "pl-history.v2.json"]) {
      const at = source.indexOf(term);
      if (at >= 0) {
        console.log("SCRIPT_SCHEMA_CONTEXT", scriptUrl, term,
          source.slice(Math.max(0, at - 450), Math.min(source.length, at + 900)));
      }
    }
  }
}

