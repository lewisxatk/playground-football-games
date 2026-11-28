import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const fail = message => { throw new Error("Lowball validation failed: " + message); };
const dataPath = resolve(root, "public/data/lowball-questions.json");
const manifest = JSON.parse(await readFile(resolve(root, "public/data/player-shards/manifest.json"), "utf8"));
const data = JSON.parse(await readFile(dataPath, "utf8"));
const report = JSON.parse(await readFile(resolve(root, "public/data/football-knowledge-report.json"), "utf8"));
const normalise = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-GB").replace(/[^a-z0-9]/g, "");

if (data.source !== "OpenFootballBase-Data" || data.licence !== "CC BY-SA 4.0") fail("wrong archive source or licence");
if (data.sourceRelease !== manifest.sourceRelease || data.archivePlayerCount !== manifest.playerCount) fail("Lowball bank is not built from the current player archive release");
if (data.dailyQuestions !== 7) fail("daily rounds must contain exactly seven questions");
if (!Array.isArray(data.questions) || data.questions.length < 50 || data.questions.length > 160) fail("question bank must contain 50–160 questions");
const questionIds = new Set();
let answerRecords = 0;

for (const question of data.questions) {
  if (!question.id || questionIds.has(question.id)) fail("missing or duplicate question ID");
  questionIds.add(question.id);
  if (typeof question.prompt !== "string" || !question.prompt.trim().endsWith("?")) fail(question.id + " has an invalid question prompt");
  if (!question.scope?.toLowerCase().includes("english league archive")) fail(question.id + " is missing its English-league scope");
  if (!Array.isArray(question.answers) || question.answers.length < 8) fail(question.id + " has fewer than eight accepted answers");
  const playerIds = new Set();
  const aliasOwners = new Map();
  for (const answer of question.answers) {
    if (!answer.id || !answer.name?.trim() || playerIds.has(answer.id)) fail(question.id + " has a missing or duplicate answer identity");
    playerIds.add(answer.id);
    if (!Array.isArray(answer.aliases) || !answer.aliases.length) fail(question.id + " contains an answer without aliases");
    if (!Number.isInteger(answer.score) || answer.score < 1 || answer.score > 100) fail(question.id + " has an invalid provisional rarity score");
    if (!Number.isFinite(answer.metric) || !answer.evidence?.trim()) fail(question.id + " has missing archive evidence");
    for (const alias of answer.aliases) {
      const key = normalise(alias);
      if (!key) fail(question.id + " contains an empty alias");
      const owner = aliasOwners.get(key);
      if (owner && owner !== answer.id) fail(question.id + " has an ambiguous answer alias: " + alias);
      aliasOwners.set(key, answer.id);
    }
    answerRecords++;
  }
}
if (answerRecords < 5000) fail("too few complete accepted answer records: " + answerRecords);
if (report.games?.lowball?.count !== data.questions.length || report.games?.lowball?.ready !== true) fail("build report does not match the generated Lowball question bank");
const metadata = await stat(dataPath);
if (metadata.size > 20 * 1024 * 1024) fail("Lowball question bank exceeds the 20 MB safety target");
console.log("Lowball validation passed: " + data.questions.length + " English questions and " +
  answerRecords.toLocaleString("en-GB") + " unambiguous accepted answers from the full " +
  data.archivePlayerCount.toLocaleString("en-GB") + "-player archive (" +
  (metadata.size / 1024 / 1024).toFixed(2) + " MB).");
