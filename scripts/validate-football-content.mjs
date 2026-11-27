import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const data = JSON.parse(await readFile(resolve(process.cwd(), "public/data/football-facts.seed.json"), "utf8"));
const errors = [], ids = new Set(), questions = new Set();
const normalise = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-GB").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const difficulties = ["easy","medium","hard","extreme"];
const categories = ["players","clubs","managers","transfers","stadiums","matches","records","trophies","tournaments","firsts","history","milestones"];
const topics = ["premier-league","efl","english-cups","champions-league","european-club","world-cup","euros","la-liga","bundesliga","serie-a","ligue-1","international","players","clubs","managers","transfers","stadiums","matches","trophies"];
if (data.version !== 1 || !Array.isArray(data.facts)) throw new Error("Unsupported football facts file.");
for (const f of data.facts) {
  const id = f.id || "(missing ID)";
  if (!f.id || ids.has(f.id)) errors.push(id + ": missing/duplicate ID");
  ids.add(f.id);
  if (!f.question?.trim() || !f.question.trim().endsWith("?")) errors.push(id + ": question must end with a question mark");
  const q = normalise(f.question);
  if (questions.has(q)) errors.push(id + ": duplicate question");
  questions.add(q);
  if (!f.answer?.trim()) errors.push(id + ": missing answer");
  const aliases = (f.acceptedAnswers ?? []).map(normalise).filter(Boolean);
  if (!aliases.includes(normalise(f.answer))) errors.push(id + ": canonical answer not accepted");
  if (new Set(aliases).size !== aliases.length) errors.push(id + ": duplicate aliases after accent normalisation");
  if (!f.explanation?.trim()) errors.push(id + ": missing explanation");
  if (!topics.includes(f.topic)) errors.push(id + ": invalid/missing topic");
  if (!categories.includes(f.category)) errors.push(id + ": invalid/missing category");
  if (!difficulties.includes(f.difficulty)) errors.push(id + ": invalid/missing difficulty");
  if (!f.difficultyReason?.trim()) errors.push(id + ": missing difficulty rationale");
  if (!f.competition?.trim() || !f.scope?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(f.validAsOf ?? "")) errors.push(id + ": missing competition, scope or valid date");
  if (!f.source?.name || !/^https?:\/\//.test(f.source?.url ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(f.source?.checkedAt ?? "")) errors.push(id + ": missing or invalid source provenance");
  if (f.reviewStatus !== "verified") errors.push(id + ": not approved for live use");
  if (!Array.isArray(f.gameModes) || !f.gameModes.length) errors.push(id + ": no native quiz mode mapping");
  if (f.gameModes?.some(mode => !["timed-quiz","the-climb"].includes(mode))) errors.push(id + ": basic factual question mapped to a non-quiz mode");
  if (!Array.isArray(f.choices) || f.choices.length !== 4) errors.push(id + ": every quiz question needs four choices");
  else {
    const choices = f.choices.map(normalise);
    if (new Set(choices).size !== 4) errors.push(id + ": choices must be distinct after normalisation");
    if (choices.filter(x => x === normalise(f.answer)).length !== 1) errors.push(id + ": answer must appear exactly once");
  }
}
const byDifficulty = Object.fromEntries(difficulties.map(x => [x,data.facts.filter(f=>f.difficulty===x).length]));
const byTopic = Object.fromEntries([...new Set(data.facts.map(f=>f.topic))].sort().map(x=>[x,data.facts.filter(f=>f.topic===x).length]));
const byCategory = Object.fromEntries([...new Set(data.facts.map(f=>f.category))].sort().map(x=>[x,data.facts.filter(f=>f.category===x).length]));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(JSON.stringify({status:"passed",facts:data.facts.length,uniqueIds:ids.size,uniqueQuestions:questions.size,withFourChoices:data.facts.filter(f=>f.choices?.length===4).length,byDifficulty,byTopic,byCategory,sources:[...new Set(data.facts.map(f=>f.source.name))].length,liveGameIntegration:false},null,2));
