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
  assert.ok(match.year >= 1980 && match.year <= 2026, "World Cup year outside supported range");
  assert.ok(match.team && match.opponent && match.round, "World Cup record missing match context");
  assert.ok(Array.isArray(match.starters) && match.starters.length === 11, "Every record must contain exactly 11 starters");
  assert.ok(match.starters.every(name => typeof name === "string" && name.trim()), "Starter names cannot be blank");
  assert.equal(new Set(match.starters.map(name => name.toLocaleLowerCase())).size, 11, "A starting XI must not duplicate a player");
}
assert.ok(Array.isArray(badges) && badges.length >= 4500, "Expected at least 4,500 club and national badge paths");
assert.ok(badges.every(path => path.startsWith("logos/") && path.endsWith(".svg")), "Badge index contains an invalid path");

const englishClubIndex = JSON.parse(await readFile(new URL("../public/data/football-knowledge-football-grid-clubs.cc0.json", import.meta.url), "utf8"));
assert.equal(englishClubIndex.licence, "CC0-1.0", "English club index must retain its CC0 licence");
assert.ok(Array.isArray(englishClubIndex.premierLeagueClubs), "Premier League club index is missing");
assert.ok(Array.isArray(englishClubIndex.englishLeagueClubs), "English league club index is missing");
const normaliseClub = value => String(value ?? "").toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/&/g, " and ").replace(/\\b(?:association football club|football club|a\\.?f\\.?c\\.?|f\\.?c\\.?|the)\\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\\s+/g, " ");
const premierClubKeys = englishClubIndex.premierLeagueClubs.map(normaliseClub);
const englishClubKeyList = englishClubIndex.englishLeagueClubs.map(normaliseClub);
const englishClubKeys = new Set(englishClubKeyList);
assert.ok(englishClubIndex.premierLeagueClubs.length >= 40 && englishClubIndex.premierLeagueClubs.length <= 100,
  "Premier League index should contain a plausible historic Premier League club count, not pre-1992 First Division clubs");
assert.equal(new Set(premierClubKeys).size, premierClubKeys.length, "Premier League club index contains duplicates");
assert.equal(englishClubKeys.size, englishClubKeyList.length, "English league club index contains duplicates after normalization");
assert.ok(premierClubKeys.every(key => englishClubKeys.has(key)), "Every Premier League club must also exist in the English club index");

console.log("Data validation passed:");
console.log(" -", worldCup.matches.length, "World Cup team line-ups across", worldCup.years.length, "editions");
console.log(" -", badges.length, "club and national badge SVG paths");
console.log(" -", englishClubIndex.premierLeagueClubs.length, "historically correct Premier League clubs and", englishClubIndex.englishLeagueClubs.length, "English clubs");

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
    const payload = JSON.parse(bytes.toString("utf8"));
    assert.equal(payload.source, "OpenFootballBase-Data", "Player shard source metadata mismatch");
    assert.equal(payload.releaseTag, index.sourceRelease, "Player shard release metadata mismatch");
    assert.equal(payload.licence, "CC BY-SA 4.0", "Player shard licence metadata mismatch");
    const rows = payload.players;
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


try {
  const questionBank = JSON.parse(await readFile(new URL("../public/data/question-bank.json", import.meta.url), "utf8"));
  assert.equal(questionBank.version, 5, "Question bank version mismatch");
  assert.equal(questionBank.source, "OpenFootballBase-Data", "Question bank source metadata mismatch");
  assert.equal(questionBank.meta?.targetPerTier, 800, "Question bank target must be at least 750 per tier");
  for (const tier of ["EASY", "MEDIUM", "HARD", "EXTREME"]) {
    const questions = questionBank.tiers?.[tier];
    const distribution = questionBank.meta?.distribution?.[tier];
    assert.ok(Array.isArray(questions) && questions.length >= 750, tier + " must contain at least 750 questions");
    assert.deepEqual(distribution, { english: 600, international: 200, total: 800 }, tier + " must preserve the 75/25 regional balance");
    assert.equal(questions.length, distribution.total, tier + " count must match metadata");
    const ids = new Set();
    const regions = { ENGLISH: 0, INTERNATIONAL: 0 };
    for (const question of questions) {
      assert.ok(question.id && !ids.has(question.id), tier + " question IDs must be unique");
      ids.add(question.id);
      assert.equal(question.tier, tier, "Question tier mismatch");
      assert.ok(question.playerId && question.question && question.answer, "Question is missing core fields");
      assert.ok(question.options && question.options.length === 5, "Every quiz question must have five options");
      assert.ok(question.options.includes(question.answer), "Every question must include its answer in the options");
      assert.equal(new Set(question.options).size, 5, "Answer options must be unique");
      assert.ok(question.explanation && question.source, "Question needs an explanation and source note");
      assert.ok(Object.hasOwn(regions, question.region), "Question has an invalid regional classification");
      regions[question.region]++;
      if (tier === "EASY") {
        assert.ok(["PLAYER BASICS", "PLAYER & CLUBS"].includes(question.category),
          "Easy questions must use accessible player, club or league basics");
        assert.ok(!/earliest career|earliest.*club|career.?goal total|international caps/i.test(question.question),
          "Easy questions must not use obscure career-history or advanced-stat templates");
      }
    }
    assert.deepEqual(regions, { ENGLISH: 600, INTERNATIONAL: 200 },
      tier + " question records must actually match the declared 75/25 regional distribution");
  }
  console.log(" - 3,200 legacy curated quiz questions: 800 per tier, 75% English clubs / 25% other leagues");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log(" - Legacy question-bank.json is absent; CC0 quiz pools are validated by validate-cc0-quiz-pools.mjs.");
  } else {
    throw error;
  }
}
