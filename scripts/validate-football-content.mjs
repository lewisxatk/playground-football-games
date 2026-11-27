import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve(process.cwd(), "public/data/football-facts.seed.json");
const data = JSON.parse(await readFile(path, "utf8"));
const errors = [];
const ids = new Set();
const normalise = value => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-GB").replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

if (data.version !== 1 || !Array.isArray(data.facts)) {
  throw new Error("Football facts seed file has an unsupported format.");
}
for (const fact of data.facts) {
  if (!fact.id || ids.has(fact.id)) errors.push("Missing or duplicate ID: " + fact.id);
  ids.add(fact.id);
  if (!fact.prompt?.trim()) errors.push(fact.id + ": missing prompt");
  if (!fact.answer?.canonical?.trim()) errors.push(fact.id + ": missing canonical answer");
  const accepted = fact.answer?.accepted ?? [];
  if (!accepted.some(value => normalise(value) === normalise(fact.answer.canonical))) {
    errors.push(fact.id + ": accepted answers do not contain canonical answer");
  }
  if (!fact.explanation?.trim()) errors.push(fact.id + ": missing explanation");
  if (!fact.competition?.trim() || !fact.scope?.trim()) errors.push(fact.id + ": missing competition/scope");
  if (!fact.validAsOf) errors.push(fact.id + ": missing record cutoff");
  if (!fact.source?.name || !/^https?:\/\//.test(fact.source?.url ?? "") || !fact.source?.checkedAt) {
    errors.push(fact.id + ": missing source provenance");
  }
  if (fact.reviewStatus !== "verified") errors.push(fact.id + ": not approved for live content");
  if (!Array.isArray(fact.gameModes) || !fact.gameModes.length) errors.push(fact.id + ": no game mode mapping");
}
if (errors.length) {
  console.error("Football content validation failed:");
  errors.forEach(error => console.error(" - " + error));
  process.exit(1);
}
const byTopic = Object.fromEntries([...new Set(data.facts.map(fact => fact.topic))]
  .sort().map(topic => [topic, data.facts.filter(fact => fact.topic === topic).length]));
console.log(JSON.stringify({
  status: "passed",
  facts: data.facts.length,
  uniqueIds: ids.size,
  sourceBacked: data.facts.filter(fact => Boolean(fact.source?.url)).length,
  topicCounts: byTopic,
  liveGameIntegration: false
}, null, 2));
