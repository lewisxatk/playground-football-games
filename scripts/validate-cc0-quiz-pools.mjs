import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(resolve(root, "public/data/football-knowledge-manifest.cc0.json"), "utf8"));
const tiers = ["EASY", "MEDIUM", "HARD", "EXTREME"];
const games = {
  "the-climb": ["the-climb-easy-1", "the-climb-easy-2", "the-climb-medium", "the-climb-hard", "the-climb-extreme"],
  "timed-quiz": ["timed-quiz-easy-1", "timed-quiz-easy-2", "timed-quiz-medium", "timed-quiz-hard", "timed-quiz-extreme"]
};
const normalise = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-GB").replace(/[^a-z0-9]/g, "");
const fail = message => { throw new Error("CC0 quiz validation failed: " + message); };

for (const [game, keys] of Object.entries(games)) {
  const questions = [];
  for (const key of keys) {
    const entry = manifest.shards?.[key];
    if (!entry?.file || !entry?.sha256) fail(game + " is missing manifest metadata for " + key);
    const path = resolve(root, "public", entry.file.replace(/^\/+/, ""));
    const payload = JSON.parse(await readFile(path, "utf8"));
    if (!Array.isArray(payload.questions)) fail(key + " has no questions array");
    if (payload.questions.length !== entry.recordCounts?.questions) fail(key + " count does not match the manifest");
    questions.push(...payload.questions);
  }

  const ids = new Set();
  const matchIds = new Set();
  const byTier = Object.fromEntries(tiers.map(tier => [tier, { ENGLISH_DOMESTIC: 0, INTERNATIONAL: 0, total: 0 }]));
  for (const question of questions) {
    if (!question.id || ids.has(question.id)) fail(game + " has a missing or duplicate question ID");
    ids.add(question.id);
    if (!question.factId || !question.matchId || matchIds.has(question.matchId)) fail(game + " repeats or omits an underlying match fact");
    matchIds.add(question.matchId);
    if (!tiers.includes(question.tier)) fail(question.id + " has an invalid difficulty");
    if (question.region !== "ENGLISH_DOMESTIC" && question.region !== "INTERNATIONAL") fail(question.id + " has an invalid region");
    if (typeof question.question !== "string" || !question.question.trim().endsWith("?")) fail(question.id + " has an unreadable question stem");
    if (typeof question.answer !== "string" || !question.answer.trim()) fail(question.id + " has no answer");
    if (!Array.isArray(question.options) || question.options.length !== 5) fail(question.id + " must have exactly five answer options");
    const options = question.options.map(normalise);
    if (new Set(options).size !== 5) fail(question.id + " has duplicate answer options");
    if (options.filter(option => option === normalise(question.answer)).length !== 1) fail(question.id + " must have exactly one correct option");
    if (!/^https:\/\//.test(question.source ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(question.eventDate ?? "")) {
      fail(question.id + " is missing source provenance or event date");
    }
    byTier[question.tier][question.region]++;
    byTier[question.tier].total++;
  }

  for (const tier of tiers) {
    const counts = byTier[tier];
    // A ten-question practice round needs eight English-domestic and two
    // international questions; the five-question Climb needs four and one.
    if (counts.ENGLISH_DOMESTIC < 8 || counts.INTERNATIONAL < 3) {
      fail(game + " " + tier + " cannot satisfy the English-first 75/25 round allocation: " + JSON.stringify(counts));
    }
  }

  const englishDomestic = questions.filter(question => question.region === "ENGLISH_DOMESTIC").length;
  const international = questions.length - englishDomestic;
  console.log(game + " available pool: " + questions.length + " unique questions; " + englishDomestic + " English-domestic (" +
    (100 * englishDomestic / questions.length).toFixed(1) + "%), " + international + " international (" +
    (100 * international / questions.length).toFixed(1) + "%).");
  console.log("  Runtime allocation: 5-question 3/2 or 4/1; 10-question practice 7/3 or 8/2; 17-question daily 12/5 or 13/4, balanced to 75% over four seeds.");
  console.log("  Tier coverage: " + tiers.map(tier => tier + " " + byTier[tier].ENGLISH_DOMESTIC + " English domestic / " +
    byTier[tier].INTERNATIONAL + " international").join("; "));
}

console.log("CC0 quiz content validation passed.");
