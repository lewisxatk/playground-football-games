import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const data = JSON.parse(await readFile(resolve(process.cwd(), "public/data/football-facts.seed.json"), "utf8"));
const errors = [];
const ids = new Set();
const questions = new Set();
const factKeys = new Set();

const normalise = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-GB").replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const isIsoDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value));
const difficulties = ["easy", "medium", "hard", "extreme"];
const categories = ["players", "clubs", "managers", "transfers", "stadiums", "matches", "records", "trophies", "tournaments", "firsts", "history", "milestones"];
const topics = ["premier-league", "efl", "english-cups", "champions-league", "european-club", "world-cup", "euros", "la-liga", "bundesliga", "serie-a", "ligue-1", "international", "players", "clubs", "managers", "transfers", "stadiums", "matches", "trophies"];

if (data.version !== 1 || !Array.isArray(data.facts)) throw new Error("Unsupported football facts file.");

for (const fact of data.facts) {
  const id = fact.id || "(missing ID)";
  if (!fact.id || ids.has(fact.id)) errors.push(id + ": missing/duplicate ID");
  ids.add(fact.id);

  const question = normalise(fact.question);
  if (!fact.question?.trim() || !fact.question.trim().endsWith("?")) errors.push(id + ": question must end with a question mark");
  if (questions.has(question)) errors.push(id + ": duplicate question");
  questions.add(question);

  const answer = normalise(fact.answer);
  if (!fact.answer?.trim()) errors.push(id + ": missing answer");
  const factKey = [fact.topic, fact.competition, fact.scope, answer].map(normalise).join("|");
  if (factKeys.has(factKey)) errors.push(id + ": duplicate underlying fact/scope");
  factKeys.add(factKey);

  const aliases = (fact.acceptedAnswers ?? []).map(normalise).filter(Boolean);
  if (!aliases.includes(answer)) errors.push(id + ": canonical answer not accepted");
  if (new Set(aliases).size !== aliases.length) errors.push(id + ": duplicate answer aliases");
  if (!fact.explanation?.trim()) errors.push(id + ": missing explanation");
  if (!topics.includes(fact.topic)) errors.push(id + ": invalid/missing topic");
  if (!categories.includes(fact.category)) errors.push(id + ": invalid/missing category");
  if (!difficulties.includes(fact.difficulty)) errors.push(id + ": invalid/missing difficulty");
  if (!fact.difficultyReason?.trim()) errors.push(id + ": missing difficulty rationale");
  if (!fact.competition?.trim() || !fact.scope?.trim()) errors.push(id + ": missing competition or scope");

  if (!isIsoDate(fact.validAsOf)) errors.push(id + ": validAsOf must be an ISO verification date");
  if (fact.eventDate && !isIsoDate(fact.eventDate)) errors.push(id + ": eventDate must be an ISO event date");
  if (!fact.source?.name || !/^https:\/\//.test(fact.source?.url ?? "") || !isIsoDate(fact.source?.checkedAt)) {
    errors.push(id + ": missing or invalid HTTPS source provenance");
  }
  if (fact.validAsOf !== fact.source?.checkedAt) {
    errors.push(id + ": validAsOf must match source.checkedAt; use eventDate for historic events");
  }

  if (fact.reviewStatus !== "verified") errors.push(id + ": not approved for live use");
  if (!Array.isArray(fact.gameModes) || !fact.gameModes.length) errors.push(id + ": no native quiz mode mapping");
  if (fact.gameModes?.some(mode => !["timed-quiz", "the-climb"].includes(mode))) {
    errors.push(id + ": basic factual question mapped to a non-quiz mode");
  }

  if (!Array.isArray(fact.choices) || fact.choices.length !== 4) {
    errors.push(id + ": every quiz question needs four choices");
  } else {
    const choices = fact.choices.map(normalise);
    if (new Set(choices).size !== 4) errors.push(id + ": choices must be distinct");
    if (choices.filter(choice => aliases.includes(choice)).length !== 1) {
      errors.push(id + ": exactly one canonical answer/accepted alias must appear in the choices");
    }
  }
}

const byDifficulty = Object.fromEntries(difficulties.map(value => [value, data.facts.filter(fact => fact.difficulty === value).length]));
const byTopic = Object.fromEntries([...new Set(data.facts.map(fact => fact.topic))].sort()
  .map(value => [value, data.facts.filter(fact => fact.topic === value).length]));
const byCategory = Object.fromEntries([...new Set(data.facts.map(fact => fact.category))].sort()
  .map(value => [value, data.facts.filter(fact => fact.category === value).length]));
const summary = {
  status: errors.length ? "failed" : "passed",
  facts: data.facts.length,
  uniqueIds: ids.size,
  uniqueQuestions: questions.size,
  uniqueUnderlyingFacts: factKeys.size,
  eventDatedFacts: data.facts.filter(fact => Boolean(fact.eventDate)).length,
  withFourChoices: data.facts.filter(fact => fact.choices?.length === 4).length,
  byDifficulty,
  byTopic,
  byCategory,
  sources: [...new Set(data.facts.map(fact => fact.source?.url).filter(Boolean))].length,
  liveGameIntegration: false,
  errors
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
