import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";

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

const playerIndexPath = new URL("../public/data/player-shards/manifest.json", import.meta.url);
try {
  const index = JSON.parse(await readFile(playerIndexPath, "utf8"));
  assert.ok(index.sourceRelease && index.sourceReleaseUrl, "Player index must record its upstream release");
  assert.ok(index.sourceAssetSha256, "Player index must record the verified upstream archive digest");
  assert.ok(String(index.dataLicence).includes("CC BY-SA 4.0"), "Player index must retain the source licence");
  assert.ok(index.playerCount >= 50000, "Expected a broad player career archive, not a small hand-picked list");
  assert.ok(index.shardCount >= 32 && Array.isArray(index.shards) && index.shards.length === index.shardCount,
    "Player index must contain its declared static shard set");
  let actualPlayers = 0;
  const allIds = new Set();
  for (const shard of index.shards) {
    assert.ok(shard.file && shard.count > 0 && shard.sha256, "Player shard metadata is incomplete");
    const bytes = await readFile(new URL("../public/data/player-shards/" + shard.file, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), shard.sha256, "Player shard checksum mismatch");
    const rows = JSON.parse(bytes.toString("utf8"));
    assert.ok(Array.isArray(rows) && rows.length === shard.count, "Player shard count mismatch");
    for (const player of rows) {
      assert.ok(player.id && player.name && Array.isArray(player.clubs) && Array.isArray(player.spells),
        "Player record is missing identity or career fields");
      assert.ok(!allIds.has(player.id), "Duplicate player identity across shards");
      allIds.add(player.id);
      assert.ok(Array.isArray(player.seasonStats), "Season-stat coverage should be an array (empty when unrecorded)");
      assert.ok(Number.isInteger(player.careerAppearanceRows) && Number.isInteger(player.careerGoalRows),
        "Career appearance/goal coverage counters must be present");
      assert.ok(Number.isInteger(player.leagueGoalSeasons), "League-goal season coverage must be present");
    }
    actualPlayers += rows.length;
  }
  assert.equal(actualPlayers, index.playerCount, "Player index total does not match its shards");
  assert.ok(index.warnings?.some(note => /unverified/i.test(note)), "Player index must retain the source's unverified-stat caveat");
  assert.ok(index.warnings?.some(note => /Missing statistics/i.test(note)), "Player index must state that absent statistics are not zero");
  console.log(" -", actualPlayers.toLocaleString("en-GB"), "OpenFootballBase players across", index.shardCount, "verified static shards");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log(" - Static player shards not generated yet; games retain the Parquet fallback.");
  } else {
    throw error;
  }
}
