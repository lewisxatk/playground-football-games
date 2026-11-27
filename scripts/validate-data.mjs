import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const worldCup = JSON.parse(await readFile(new URL("../public/data/worldcup-lineups.json", import.meta.url), "utf8"));
const badges = JSON.parse(await readFile(new URL("../public/data/club-badges-index.json", import.meta.url), "utf8"));

assert.equal(worldCup.licence, "CC0", "World Cup data should retain its CC0 metadata");
assert.ok(Array.isArray(worldCup.matches) && worldCup.matches.length >= 1200, "Expected at least 1,200 World Cup team line-ups");
assert.ok(Array.isArray(worldCup.years) && worldCup.years.every(year => year >= 1980), "Tournament data must not predate the 1980s");

const ids = new Set();
for (const match of worldCup.matches) {
  assert.ok(match.id && !ids.has(match.id), "World Cup line-up IDs must be present and unique");
  ids.add(match.id);
  assert.ok(match.year >= 1980 && match.year <= 2022, "World Cup year outside supported range");
  assert.ok(match.team && match.opponent && match.round, "World Cup record missing match context");
  assert.ok(Array.isArray(match.starters) && match.starters.length === 11, "Every record must contain exactly 11 starters");
  assert.ok(match.starters.every(name => typeof name === "string" && name.trim()), "Starter names cannot be blank");
  assert.equal(new Set(match.starters.map(name => name.toLocaleLowerCase())).size, 11, "A starting XI must not duplicate a player");
}
assert.ok(Array.isArray(badges) && badges.length >= 4500, "Expected at least 4,500 club and national badge paths");
assert.ok(badges.every(path => path.startsWith("logos/") && path.endsWith(".svg")), "Badge index contains an invalid path");

console.log("Data validation passed:");
console.log(" -", worldCup.matches.length, "World Cup team line-ups across", worldCup.years.length, "editions");
console.log(" -", badges.length, "club and national badge SVG paths");
