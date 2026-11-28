import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dataDir = resolve(root, "public/data");
const shardDir = resolve(dataDir, "player-shards");
const fail = message => { throw new Error("Lowball pool build failed: " + message); };
const clubKey = value => String(value ?? "").toLocaleLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ")
  .replace(/\b(?:association football club|football club|a\.?f\.?c\.?|f\.?c\.?|the)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const normalise = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-GB").replace(/[^a-z0-9]/g, "");

function seededShuffle(items, seed) {
  const copy = [...items];
  let state = seed >>> 0;
  for (let index = copy.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function makeAnswers(rows) {
  const unique = new Map();
  for (const row of rows) {
    const name = String(row.record.fullName || row.record.name || "").trim();
    const key = normalise(name);
    if (!key || unique.has(key)) continue;
    unique.set(key, { ...row, metric: Math.max(0, Number(row.metric) || 0) });
  }
  const values = [...unique.values()];
  if (!values.length) return [];
  const metricValues = [...new Set(values.map(value => value.metric))].sort((a, b) => a - b);
  const answers = values.map(value => {
    const name = String(value.record.fullName || value.record.name).trim();
    const rank = metricValues.indexOf(value.metric);
    const score = metricValues.length < 2 ? 50 : Math.round(5 + 95 * rank / (metricValues.length - 1));
    return {
      id: value.record.id,
      name,
      aliases: [...new Set([value.record.name, value.record.fullName].map(alias => String(alias ?? "").trim()).filter(Boolean))],
      score,
      evidence: value.evidence,
      metric: value.metric
    };
  });
  const surnameCounts = new Map();
  const aliasCounts = new Map();
  for (const answer of answers) {
    for (const alias of answer.aliases) {
      const key = normalise(alias);
      if (key) aliasCounts.set(key, (aliasCounts.get(key) ?? 0) + 1);
    }
    const surname = answer.name.split(/\s+/).at(-1) ?? "";
    const key = normalise(surname);
    if (key) surnameCounts.set(key, (surnameCounts.get(key) ?? 0) + 1);
  }
  for (const answer of answers) {
    answer.aliases = answer.aliases.filter(alias => aliasCounts.get(normalise(alias)) === 1);
  }
  const aliasOwners = new Set(answers.flatMap(answer => answer.aliases.map(normalise)));
  for (const answer of answers) {
    const surname = answer.name.split(/\s+/).at(-1) ?? "";
    const key = normalise(surname);
    if (key && surnameCounts.get(key) === 1 && !aliasOwners.has(key)) {
      answer.aliases.push(surname);
      aliasOwners.add(key);
    }
  }
  return answers;
}

const archiveManifest = JSON.parse(await readFile(resolve(shardDir, "manifest.json"), "utf8"));
if (archiveManifest.source !== "OpenFootballBase-Data" || archiveManifest.dataLicence !== "CC BY-SA 4.0") fail("the pinned English football archive source or licence is unexpected");
if (!Array.isArray(archiveManifest.shards) || archiveManifest.playerCount < 1000) fail("the full player archive is missing");

const clubIndex = JSON.parse(await readFile(resolve(dataDir, "football-knowledge-football-grid-clubs.cc0.json"), "utf8"));
const englishNames = [...new Map(
  [...(clubIndex.premierLeagueClubs ?? []), ...(clubIndex.englishLeagueClubs ?? [])]
    .map(name => [clubKey(name), String(name).trim()])
    .filter(([key, name]) => key && name)
).values()];
const canonical = new Map(englishNames.map(name => [clubKey(name), name]));
const englishKeys = new Set(canonical.keys());
const premierKeys = new Set((clubIndex.premierLeagueClubs ?? []).map(clubKey));

const records = [];
for (const shard of archiveManifest.shards) {
  const payload = JSON.parse(await readFile(resolve(shardDir, shard.file), "utf8"));
  for (const player of payload.players ?? []) {
    const clubs = new Map();
    for (const stat of player.seasonStats ?? []) {
      if (stat.competitionGroup !== "League") continue;
      const key = clubKey(stat.club);
      if (!englishKeys.has(key)) continue;
      const apps = Math.max(0, Number(stat.apps ?? 0) || 0);
      const goals = Math.max(0, Number(stat.goals ?? 0) || 0);
      if (apps <= 0 && goals <= 0) continue;
      const current = clubs.get(key) ?? { name: canonical.get(key) ?? String(stat.club), apps: 0, goals: 0 };
      current.apps += apps;
      current.goals += goals;
      clubs.set(key, current);
    }
    if (!clubs.size) continue;
    const rows = [...clubs.values()];
    records.push({
      id: player.id,
      name: player.name,
      fullName: player.fullName,
      clubs,
      totalApps: rows.reduce((sum, row) => sum + row.apps, 0),
      totalGoals: rows.reduce((sum, row) => sum + row.goals, 0),
      clubCount: rows.filter(row => row.apps > 0).length,
      maxClubApps: Math.max(0, ...rows.map(row => row.apps)),
      maxClubGoals: Math.max(0, ...rows.map(row => row.goals))
    });
  }
}
if (records.length < 1000) fail("too few players have English league statistics: " + records.length);

const byClub = new Map();
for (const record of records) {
  for (const [key, stat] of record.clubs) {
    if (stat.apps <= 0 && stat.goals <= 0) continue;
    const list = byClub.get(key) ?? [];
    list.push(record);
    byClub.set(key, list);
  }
}
const questionPool = [];
const addQuestion = (id, type, prompt, scope, rows) => {
  const answers = makeAnswers(rows);
  if (answers.length < 8) return false;
  questionPool.push({ id, type, prompt, scope, answers });
  return true;
};

const clubs = seededShuffle(englishNames, 1729)
  .sort((a, b) => Number(premierKeys.has(clubKey(b))) - Number(premierKeys.has(clubKey(a))));
let clubAppearanceCount = 0;
let clubGoalCount = 0;
for (const club of clubs) {
  const key = clubKey(club);
  const clubPlayers = byClub.get(key) ?? [];
  if (clubAppearanceCount < 40) {
    const rows = clubPlayers.flatMap(record => {
      const stat = record.clubs.get(key);
      return stat?.apps > 0 ? [{ record, metric: stat.apps, evidence: stat.apps + " recorded league appearances for " + club }] : [];
    });
    if (addQuestion("club-apps:" + key, "club-appearances", "Name a player with a recorded league appearance for " + club + ".", "English league archive · all recorded seasons", rows)) clubAppearanceCount++;
  }
  if (clubGoalCount < 30) {
    const rows = clubPlayers.flatMap(record => {
      const stat = record.clubs.get(key);
      return stat?.goals > 0 ? [{ record, metric: stat.goals, evidence: stat.goals + " recorded league goals for " + club }] : [];
    });
    if (addQuestion("club-goals:" + key, "club-goals", "Name a player who scored a recorded league goal for " + club + ".", "English league archive · all recorded seasons", rows)) clubGoalCount++;
  }
  if (clubAppearanceCount >= 40 && clubGoalCount >= 30) break;
}

const pairClubs = clubs.slice(0, 42);
let pairCount = 0;
for (let left = 0; left < pairClubs.length && pairCount < 55; left++) {
  for (let right = left + 1; right < pairClubs.length && pairCount < 55; right++) {
    const clubA = pairClubs[left], clubB = pairClubs[right];
    const keyA = clubKey(clubA), keyB = clubKey(clubB);
    const leftPlayers = byClub.get(keyA) ?? [];
    const rightIds = new Set((byClub.get(keyB) ?? []).map(record => record.id));
    const rows = leftPlayers.flatMap(record => {
      if (!rightIds.has(record.id)) return [];
      const a = record.clubs.get(keyA), b = record.clubs.get(keyB);
      return a?.apps > 0 && b?.apps > 0
        ? [{ record, metric: a.apps + b.apps, evidence: (a.apps + b.apps) + " recorded league appearances across " + clubA + " and " + clubB }]
        : [];
    });
    if (addQuestion("club-pair:" + keyA + ":" + keyB, "two-club-career",
      "Name a player with recorded league appearances for both " + clubA + " and " + clubB + ".",
      "English league archive · recorded career history", rows)) pairCount++;
  }
}

const milestones = [
  ["milestone:100-apps", "career-appearances", "Name a player with at least 100 recorded league appearances for English clubs.",
    records.filter(record => record.totalApps >= 100).map(record => ({ record, metric: record.totalApps, evidence: record.totalApps + " recorded league appearances for English clubs" }))],
  ["milestone:10-goals", "career-goals", "Name a player with at least 10 recorded league goals for English clubs.",
    records.filter(record => record.totalGoals >= 10).map(record => ({ record, metric: record.totalGoals, evidence: record.totalGoals + " recorded league goals for English clubs" }))],
  ["milestone:three-clubs", "multi-club-career", "Name a player with recorded league appearances for at least three English clubs.",
    records.filter(record => record.clubCount >= 3).map(record => ({ record, metric: record.clubCount * 100 + record.totalApps, evidence: record.clubCount + " English clubs · " + record.totalApps + " recorded league appearances" }))],
  ["milestone:50-apps-at-club", "club-appearances", "Name a player with at least 50 recorded league appearances for one English club.",
    records.filter(record => record.maxClubApps >= 50).map(record => ({ record, metric: record.maxClubApps, evidence: record.maxClubApps + " recorded league appearances for one English club" }))],
  ["milestone:5-goals-at-club", "club-goals", "Name a player with at least five recorded league goals for one English club.",
    records.filter(record => record.maxClubGoals >= 5).map(record => ({ record, metric: record.maxClubGoals, evidence: record.maxClubGoals + " recorded league goals for one English club" }))]
];
for (const [id, type, prompt, rows] of milestones) {
  addQuestion(id, type, prompt, "English league archive · recorded career totals", rows);
}

const questions = questionPool.slice(0, 160);
const answerRecordCount = questions.reduce((sum, question) => sum + question.answers.length, 0);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  source: archiveManifest.source,
  sourceRelease: archiveManifest.sourceRelease,
  licence: archiveManifest.dataLicence,
  archivePlayerCount: archiveManifest.playerCount,
  playersWithEnglishLeagueStats: records.length,
  scoring: "Provisional archive estimate: answers are ranked by recorded English league appearances or goals. This is not a fan survey.",
  dailyQuestions: 7,
  questions
};
const serialized = JSON.stringify(output);
const bytes = Buffer.byteLength(serialized);
if (bytes > 20 * 1024 * 1024) fail("question bank exceeds the 20 MB safety target: " + bytes);
await writeFile(resolve(dataDir, "lowball-questions.json"), serialized);

const reportPath = resolve(dataDir, "football-knowledge-report.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));
report.counts = { ...report.counts, lowballQuestions: questions.length, lowballAnswerRecords: answerRecordCount };
delete report.counts.lowballPacks;
report.games.lowball = {
  unit: "English-football rarity question",
  count: questions.length,
  ready: questions.length >= 50,
  integrated: true,
  metric: "Provisional rank from recorded English league appearances and goals; not a fan survey",
  format: "Seven free-text questions; complete answer sets from the full season archive; lowest total wins"
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log("Lowball archive build passed: " + questions.length + " English questions, " +
  answerRecordCount.toLocaleString("en-GB") + " accepted answer records from " +
  records.length.toLocaleString("en-GB") + " players with English league statistics (" +
  (bytes / 1024 / 1024).toFixed(2) + " MB).");
