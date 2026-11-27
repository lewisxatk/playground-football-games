import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const manifestPath = resolve(root, "public/data/player-shards/manifest.json");
const fail = message => { throw new Error("Player shard validation failed: " + message); };
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.source !== "OpenFootballBase-Data") fail("unexpected player archive source");
if (!manifest.sourceRelease || !manifest.sourceAssetSha256) fail("missing pinned upstream release or asset hash");
if (manifest.dataLicence !== "CC BY-SA 4.0") fail("unexpected player archive licence");
if (!Array.isArray(manifest.shards) || manifest.shards.length < 32) fail("player shard manifest is incomplete");
if (manifest.shardCount !== manifest.shards.length) fail("manifest shard count does not match its shard list");

const ids = new Set();
let total = 0;
for (const shard of manifest.shards) {
  if (!shard?.file || !Number.isInteger(shard.count) || shard.count < 1) fail("invalid shard metadata");
  if (!/^([a-f0-9]{64})$/.test(shard.sha256 ?? "")) fail(shard.file + " has no valid SHA-256");
  const path = resolve(root, "public/data/player-shards", shard.file);
  const metadata = await stat(path).catch(() => null);
  if (!metadata?.isFile()) fail(shard.file + " is missing");
  if (Number.isInteger(shard.bytes) && metadata.size !== shard.bytes) fail(shard.file + " byte count differs from the manifest");
  const bytes = await readFile(path);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== shard.sha256) fail(shard.file + " SHA-256 mismatch");
  const payload = JSON.parse(bytes.toString("utf8"));
  if (payload.source !== manifest.source || payload.releaseTag !== manifest.sourceRelease) fail(shard.file + " source release mismatch");
  if (payload.licence !== manifest.dataLicence) fail(shard.file + " licence mismatch");
  if (!Array.isArray(payload.players) || payload.players.length !== shard.count) fail(shard.file + " player count mismatch");
  for (const player of payload.players) {
    if (!player?.id || !player?.name) fail(shard.file + " contains a player without a stable ID or name");
    if (ids.has(player.id)) fail("duplicate player ID across shards: " + player.id);
    ids.add(player.id);
    if (!Array.isArray(player.careerSpells)) fail(shard.file + " contains a player without career-spell data");
  }
  total += payload.players.length;
}
if (total !== manifest.playerCount) fail("total player count does not match the manifest");
console.log("Player archive validation passed: " + total.toLocaleString("en-GB") + " unique players across " + manifest.shards.length + " verified shards.");
