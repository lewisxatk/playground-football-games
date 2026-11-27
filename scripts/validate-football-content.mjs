import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const data = JSON.parse(await readFile(resolve(process.cwd(), "public/data/football-facts.seed.json"), "utf8"));
const errors = [];
const ids = new Set(), questions = new Set();
const normalise = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-GB").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
if (data.version !== 1 || !Array.isArray(data.facts)) throw new Error("Unsupported football facts file.");
for (const fact of data.facts) {
  const id = fact.id || "(missing ID)";
  if (!fact.id || ids.has(fact.id)) errors.push(id + ": missing/duplicate ID");
  ids.add(fact.id);
  if (!fact.question?.trim() || !fact.question.trim().endsWith("?")) errors.push(id + ": question must be a complete question");
  const q = normalise(fact.question);
  if (questions.has(q)) errors.push(id + ": duplicate question");
  questions.add(q);
  if (!fact.answer?.trim()) errors.push(id + ": missing short answer");
  const accepted = (fact.acceptedAnswers ?? []).map(normalise).filter(Boolean);
  if (!accepted.includes(normalise(fact.answer))) errors.push(id + ": canonical answer not accepted");
  if (new Set(accepted).size !== accepted.length) errors.push(id + ": duplicate answer aliases");
  if (!fact.explanation?.trim()) errors.push(id + ": missing explanation");
  if (!fact.competition?.trim() || !fact.scope?.trim() || !fact.validAsOf) errors.push(id + ": missing competition/scope/cutoff");
  if (!fact.source?.name || !/^https?:\/\//.test(fact.source?.url ?? "") || !fact.source?.checkedAt) errors.push(id + ": missing source");
  if (fact.reviewStatus !== "verified") errors.push(id + ": not approved for live use");
  if (!Array.isArray(fact.gameModes) || !fact.gameModes.length) errors.push(id + ": no game mode mapping");
  if (fact.choices) {
    const choices = fact.choices.map(normalise);
    if (choices.length !== 4 || new Set(choices).size !== 4) errors.push(id + ": needs exactly four distinct choices");
    if (choices.filter(choice => choice === normalise(fact.answer)).length !== 1) errors.push(id + ": correct answer must appear once");
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(JSON.stringify({status:"passed",facts:data.facts.length,uniqueIds:ids.size,uniqueQuestions:questions.size,withFourChoices:data.facts.filter(f=>f.choices?.length===4).length,liveGameIntegration:false},null,2));
