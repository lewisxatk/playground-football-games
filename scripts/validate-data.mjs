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

const playerManifestPath = new URL("../public/data/player-pool/manifest.json", import.meta.url);
try {
  const pool = JSON.parse(await readFile(playerManifestPath, "utf8"));
  assert.equal(pool.source, "OpenFootballBase-Data", "Player pool source must be identified");
  assert.equal(pool.licence, "CC BY-SA 4.0", "Player pool licence/attribution must be retained");
  assert.ok(pool.releaseTag && pool.generatedAt, "Player pool must record its source release and build date");
  assert.ok(pool.playerCount >= 70000, "Expected the broad career-player dataset, not a tiny seed list");
  assert.ok(pool.shardCount >= 32 && Array.isArray(pool.shards) && pool.shards.length === pool.shardCount,
    "Player pool must contain its declared shard set");
  let actualPlayers = 0;
  for (const shard of pool.shards) {
    assert.ok(shard.file && shard.count > 0, "Player shard metadata is incomplete");
    const payload = JSON.parse(await readFile(new URL("../public/data/player-pool/" + shard.file, import.meta.url), "utf8"));
    assert.equal(payload.releaseTag, pool.releaseTag, "Player shard release does not match the manifest");
    assert.ok(Array.isArray(payload.players) && payload.players.length === shard.count, "Player shard count mismatch");
    const seen = new Set();
    for (const player of payload.players) {
      assert.ok(player.id && player.name && Array.isArray(player.clubs) && Array.isArray(player.spells),
        "Player record is missing its identity or career fields");
      assert.ok(!seen.has(player.id), "Duplicate player ID inside shard");
      seen.add(player.id);
      assert.ok(Array.isArray(player.stats), "Player season statistics should be an array (empty when not recorded)");
      assert.ok(Number.isInteger(player.appearanceRows) && Number.isInteger(player.goalRows),
        "Appearance/goal coverage counters must be present");
    }
    actualPlayers += payload.players.length;
  }
  assert.equal(actualPlayers, pool.playerCount, "Player pool manifest total does not match its shards");
  assert.ok(pool.caveats?.some(note => /unverified/i.test(note)), "Player pool must retain the source's unverified-stat caveat");
  assert.ok(pool.caveats?.some(note => /transfer fees are not part/i.test(note)), "Player pool must not imply transfer fees are in this source");
  console.log(" -", actualPlayers.toLocaleString("en-GB"), "OpenFootballBase players across", pool.shardCount, "static shards");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log(" - Static player shards not generated yet; games retain the Parquet fallback.");
  } else {
    throw error;
  }
}
