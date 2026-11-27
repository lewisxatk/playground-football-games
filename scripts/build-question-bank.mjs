import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const manifestPath = resolve(root, "public/data/player-shards/manifest.json");
const outputPath = resolve(root, "public/data/question-bank.json");
const TARGET = 800;
const ENGLISH_TARGET = 600;
const INTERNATIONAL_TARGET = 200;
const SOURCE = "OpenFootballBase-Data player/career archive";
const DISCLAIMER = "Source records are unverified and coverage varies; missing values are not zero.";

const normalise = value => String(value ?? "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const stableNumber = value => parseInt(createHash("sha256").update(String(value)).digest("hex").slice(0, 8), 16);
const shuffled = (items, seed) => {
  const copy = [...items];
  let state = stableNumber(seed) || 1;
  for (let index = copy.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const at = state % (index + 1);
    [copy[index], copy[at]] = [copy[at], copy[index]];
  }
  return copy;
};
const unique = values => [...new Set(values.map(value => String(value ?? "").trim()).filter(Boolean))];
const number = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const regionOf = player => {
  const country = normalise(player.currentCountry);
  const league = normalise(player.currentLeague);
  const englishLeague = league.startsWith("efl") || league.includes("englishfootball") ||
    ["premierleague", "championship", "leagueone", "leaguetwo", "nationalleague"].includes(league);
  // UK country metadata does not always distinguish England, Scotland, Wales
  // and Northern Ireland. Only identify those records as English when their
  // league metadata identifies an English competition.
  if (country.includes("england") || country.includes("angleterre")) return "ENGLISH";
  if (country.includes("unitedkingdom") || country.includes("greatbritain") || country.includes("royaumeuni") || country === "uk" || country === "gb") {
    return englishLeague ? "ENGLISH" : "INTERNATIONAL";
  }
  if (country) return "INTERNATIONAL";
  if (league.startsWith("eng") || league.includes("englishfootball")) return "ENGLISH";
  if (league) return "INTERNATIONAL";
  return null;
};
const positionLabel = raw => {
  const p = normalise(raw);
  if (p.includes("goalkeeper") || p === "gk" || p === "keeper") return "Goalkeeper";
  if (p.includes("defender") || p.includes("defence") || p.includes("back") || p === "df") return "Defender";
  if (p.includes("midfielder") || p.includes("midfield") || p === "mf") return "Midfielder";
  if (p.includes("forward") || p.includes("striker") || p.includes("winger") || p.includes("attack") || p === "fw") return "Forward";
  return "";
};
const countryLabels = new Map([
  // Squad feeds mix country names and three-letter federation codes: publish one canonical UK-English label.
  ["wal", "Wales"], ["wls", "Wales"], ["eng", "England"], ["sco", "Scotland"], ["nir", "Northern Ireland"],
  ["esp", "Spain"], ["es", "Spain"], ["ger", "Germany"], ["deu", "Germany"], ["ned", "Netherlands"], ["nld", "Netherlands"],
  ["ita", "Italy"], ["fra", "France"], ["por", "Portugal"], ["prt", "Portugal"], ["bra", "Brazil"], ["arg", "Argentina"],
  ["uru", "Uruguay"], ["bel", "Belgium"], ["cro", "Croatia"], ["srb", "Serbia"], ["sui", "Switzerland"], ["che", "Switzerland"],
  ["civ", "Ivory Coast"], ["kor", "South Korea"], ["korea", "South Korea"], ["korearepublic", "South Korea"], ["jpn", "Japan"], ["usa", "United States"], ["mex", "Mexico"],
  ["mar", "Morocco"], ["nga", "Nigeria"], ["sen", "Senegal"], ["gha", "Ghana"], ["cmr", "Cameroon"], ["irn", "Iran"],
  ["aus", "Australia"], ["can", "Canada"], ["den", "Denmark"], ["swe", "Sweden"], ["nor", "Norway"], ["pol", "Poland"],
  ["ukr", "Ukraine"], ["cze", "Czechia"], ["rou", "Romania"], ["tur", "Türkiye"], ["gre", "Greece"], ["sau", "Saudi Arabia"],
  ["qat", "Qatar"], ["chn", "China"], ["cog", "Republic of the Congo"], ["republiqueducongo", "Republic of the Congo"], ["congo", "Republic of the Congo"], ["gnb", "Guinea-Bissau"], ["guineabissau", "Guinea-Bissau"], ["cod", "DR Congo"], ["democraticrepublicofthecongo", "DR Congo"], ["hnd", "Honduras"], ["hon", "Honduras"], ["crc", "Costa Rica"], ["ecu", "Ecuador"], ["par", "Paraguay"], ["chi", "Chile"], ["bol", "Bolivia"], ["per", "Peru"], ["jam", "Jamaica"], ["pan", "Panama"], ["egy", "Egypt"], ["alg", "Algeria"], ["tun", "Tunisia"], ["rsa", "South Africa"], ["isl", "Iceland"], ["aut", "Austria"], ["hun", "Hungary"], ["slo", "Slovenia"], ["svk", "Slovakia"], ["fin", "Finland"], ["irl", "Republic of Ireland"], ["alb", "Albania"], ["mkd", "North Macedonia"], ["bos", "Bosnia and Herzegovina"], ["mne", "Montenegro"], ["kos", "Kosovo"], ["est", "Estonia"], ["lva", "Latvia"], ["ltu", "Lithuania"], ["bul", "Bulgaria"], ["isr", "Israel"], ["uzb", "Uzbekistan"], ["tha", "Thailand"], ["ind", "India"],
  ["royaumeuni", "United Kingdom"], ["angleterre", "England"], ["ecosse", "Scotland"],
  ["paysdegalles", "Wales"], ["irlandedunord", "Northern Ireland"], ["italie", "Italy"],
  ["allemagne", "Germany"], ["espagne", "Spain"], ["bresil", "Brazil"],
  ["etatsunis", "United States"], ["turquie", "Türkiye"], ["paysbas", "Netherlands"],
  ["russie", "Russia"], ["argentine", "Argentina"], ["belgique", "Belgium"],
  ["grece", "Greece"], ["suisse", "Switzerland"], ["japon", "Japan"],
  ["arabiesaoudite", "Saudi Arabia"], ["republiquedecoree", "South Korea"],
  ["cotedivoire", "Ivory Coast"], ["republiquetcheque", "Czechia"]
]);
const displayCountry = value => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const stripped = raw
    .replace(/^(?:drapeau de la|drapeau de|vlag van|flag of|bandera de|flagge von|fahne von)\s+/i, "")
    .replace(/\s+u-?(?:15|16|17|18|19|20|21|23)\b/ig, "")
    .trim();
  const exact = countryLabels.get(normalise(stripped));
  if (exact) return exact;
  const firstToken = stripped.split(/[\s,(/-]+/)[0];
  const code = countryLabels.get(normalise(firstToken));
  if (code) return code;
  if (/(?:liga|league|campeonato|division|distrital|championship|nationalteam|youth|academy|reserve)/i.test(stripped) ||
      /\d{4}\s*[-–/]\s*\d{2,4}/.test(stripped)) return "";
  return stripped;
};
const leagueLabels = new Map([
  ["fussballbundesliga", "Bundesliga"], ["2fussballbundesliga", "2. Bundesliga"],
  ["primeradivisiondeespana", "La Liga"], ["segundadivisiondeespana", "Segunda División"],
  ["championnatdefrancedefootball", "Ligue 1"],
  ["championnatdefrancedefootballdedeuxiemedivision", "Ligue 2"],
  ["campeonatobrasileiroseriea", "Brazilian Série A"], ["campeonatobrasileiroserieb", "Brazilian Série B"],
  ["primeiraliga", "Primeira Liga"], ["eredivisie", "Eredivisie"], ["superlig", "Süper Lig"],
  ["majorleaguesoccer", "Major League Soccer"], ["saudiproleague", "Saudi Pro League"],
  ["premierleague", "Premier League"], ["seriea", "Serie A"], ["serieb", "Serie B"],
  ["seriec", "Serie C"], ["seried", "Serie D"], ["eflchampionship", "EFL Championship"],
  ["eflleagueone", "EFL League One"], ["eflleaguetwo", "EFL League Two"]
]);
const displayLeague = value => {
  const raw = String(value ?? "").trim();
  return leagueLabels.get(normalise(raw)) ?? raw;
};

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.source !== "OpenFootballBase-Data" || !Array.isArray(manifest.shards) || manifest.playerCount < 50000) {
  throw new Error("The pinned player-shard manifest is missing or invalid.");
}
try {
  const existing = JSON.parse(await readFile(outputPath, "utf8"));
  if (existing.version === 5 && existing.sourceRelease === manifest.sourceRelease &&
      existing.meta?.targetPerTier === TARGET &&
      ["EASY", "MEDIUM", "HARD", "EXTREME"].every(tier =>
        existing.tiers?.[tier]?.length === TARGET &&
        existing.meta?.distribution?.[tier]?.english === ENGLISH_TARGET &&
        existing.meta?.distribution?.[tier]?.international === INTERNATIONAL_TARGET)) {
    console.log("Question bank already matches the current archive release and targets.");
    process.exit(0);
  }
} catch { /* Generate a fresh bank. */ }

const players = [];
for (const shard of manifest.shards) {
  const payload = JSON.parse(await readFile(resolve(root, "public/data/player-shards", shard.file), "utf8"));
  if (payload.source !== "OpenFootballBase-Data" || payload.releaseTag !== manifest.sourceRelease ||
      payload.licence !== "CC BY-SA 4.0" || !Array.isArray(payload.players) || payload.players.length !== shard.count) {
    throw new Error("Invalid player shard: " + shard.file);
  }
  players.push(...payload.players);
}
if (players.length !== manifest.playerCount) throw new Error("Player count does not match the static archive manifest.");

const clubs = unique(players.flatMap(player => [...(player.clubs ?? []), player.currentClub]));
const nationalities = unique(players.map(player => displayCountry(player.nationality)).filter(Boolean));
const nationRegions = [
  ["England","Wales","Scotland","Northern Ireland","Republic of Ireland","Germany","Spain","France","Italy","Netherlands","Portugal","Belgium","Croatia","Serbia","Switzerland","Denmark","Sweden","Norway","Poland","Ukraine","Czechia","Romania","Türkiye","Greece","Austria","Hungary","Slovenia","Slovakia","Finland","Iceland","Albania","Kosovo","Russia"],
  ["Brazil","Argentina","Uruguay","Chile","Colombia","Peru","Ecuador","Paraguay","Bolivia","Mexico","United States","Canada","Costa Rica","Panama","Jamaica"],
  ["Ivory Coast","Nigeria","Senegal","Ghana","Cameroon","Morocco","Egypt","Algeria","Tunisia","South Africa","Mali","Guinea"],
  ["Japan","South Korea","China","Iran","Saudi Arabia","Qatar","Australia","Uzbekistan","Thailand","India"]
].map(group => new Set(group.map(normalise)));
const nationalityOptions = answer => {
  const key = normalise(answer);
  const ukNations = new Set(["england","wales","scotland","northernireland","republicofireland"]);
  if (ukNations.has(key)) return nationalities.filter(label => ukNations.has(normalise(label)));
  const region = nationRegions.find(group => group.has(key));
  const close = region ? nationalities.filter(label => region.has(normalise(label))) : [];
  return close.length >= 5 ? close : nationalities;
};
const leagues = unique(players.map(player => displayLeague(player.currentLeague)));
const countries = unique(players.map(player => displayCountry(player.currentCountry)));
const sortedNumbers = values => [...new Set(values.filter(value => value !== null).map(String))].sort((a, b) => Number(a) - Number(b));
const careerApps = sortedNumbers(players.map(player => number(player.appearances)));
const careerGoals = sortedNumbers(players.map(player => number(player.goals)));
const leagueGoals = sortedNumbers(players.map(player => number(player.leagueGoals)));
const caps = sortedNumbers(players.map(player => number(player.caps)));
const internationalGoals = sortedNumbers(players.map(player => number(player.internationalGoals)));
const careerYears = sortedNumbers(players.flatMap(player => [number(player.firstYear), number(player.lastYear)]));
const careerSpans = sortedNumbers(players.map(player => {
  const first = number(player.firstYear), last = number(player.lastYear);
  return first !== null && last !== null && last >= first ? last - first + 1 : null;
}));
const clubCounts = sortedNumbers(players.map(player => unique(player.clubs ?? []).length));
const spellCounts = sortedNumbers(players.map(player => (player.spells ?? []).length).filter(value => value > 0));

const pools = Object.fromEntries(["EASY", "MEDIUM", "HARD", "EXTREME"].map(tier => [tier, { ENGLISH: [], INTERNATIONAL: [] }]));
const add = (tier, player, region, idSuffix, category, question, answer, optionsSource, explanation, numeric = false) => {
  if (!answer || !player?.id || !player?.name || !Array.isArray(optionsSource) || !optionsSource.length) return;
  const answerText = String(answer).trim();
  const answerKey = normalise(answerText);
  let distractors = [];
  if (numeric) {
    const target = Number(answerText);
    let low = 0, high = optionsSource.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (Number(optionsSource[middle]) < target) low = middle + 1;
      else high = middle;
    }
    let left = low - 1, right = low;
    const used = new Set([answerKey]);
    while (distractors.length < 4 && (left >= 0 || right < optionsSource.length)) {
      const leftValue = left >= 0 ? optionsSource[left] : null;
      const rightValue = right < optionsSource.length ? optionsSource[right] : null;
      const takeLeft = leftValue !== null && (rightValue === null ||
        Math.abs(Number(leftValue) - target) <= Math.abs(Number(rightValue) - target));
      const candidate = String(takeLeft ? leftValue : rightValue);
      if (takeLeft) left--; else right++;
      const key = normalise(candidate);
      if (key && !used.has(key)) { used.add(key); distractors.push(candidate); }
    }
  } else {
    let state = stableNumber(player.id + ":" + idSuffix) || 1;
    const used = new Set([answerKey]);
    let attempts = 0;
    while (distractors.length < 4 && attempts < Math.min(128, optionsSource.length * 2)) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const candidate = String(optionsSource[state % optionsSource.length] ?? "").trim();
      const key = normalise(candidate);
      if (key && !used.has(key)) { used.add(key); distractors.push(candidate); }
      attempts++;
    }
    if (distractors.length < 4) {
      for (const raw of optionsSource) {
        const candidate = String(raw ?? "").trim();
        const key = normalise(candidate);
        if (key && !used.has(key)) { used.add(key); distractors.push(candidate); }
        if (distractors.length === 4) break;
      }
    }
  }
  if (distractors.length < 4) return;
  const options = shuffled([answerText, ...distractors], player.id + ":" + idSuffix + ":choices");
  pools[tier][region].push({
    id: player.id + ":" + idSuffix,
    tier, playerId: String(player.id), region, category,
    question, answer: answerText, options,
    explanation,
    source: SOURCE + " (CC BY-SA 4.0) · " + DISCLAIMER
  });
};
const isUsablePlayer = player => player.id && player.name && player.name !== "Unknown player" && !/^name:/i.test(player.id);
const EASY_TOP_LEAGUES = new Set([
  "premierleague", "fussballbundesliga", "seriea", "primadivisiondeespana",
  "primeradivisiondeespana", "championnatdefrancedefootball", "primeiraliga",
  "eredivisie", "superlig", "majorleaguesoccer", "saudiproleague",
  "campeonatobrasileiroseriea", "ligamx"
]);
const easyEligible = player => EASY_TOP_LEAGUES.has(normalise(player.currentLeague)) &&
  (number(player.appearances) ?? 0) >= 150;
const mediumEligible = player => (number(player.appearances) ?? 0) >= 120 || (player.clubs?.length ?? 0) >= 3;
const hardEligible = player => (player.careerGoalRows ?? player.goalRows ?? 0) > 0 ||
  (player.leagueGoalRows ?? 0) > 0 || (player.nationalRows ?? 0) > 0 || (number(player.appearances) ?? 0) >= 80;
const extremeEligible = player => number(player.firstYear) !== null ||
  number(player.internationalGoals) !== null || number(player.appearances) !== null || (player.spells?.length ?? 0) >= 2;

const diagnostics = {
  regionPlayers: { ENGLISH: 0, INTERNATIONAL: 0, UNCLASSIFIED: 0 },
  easyEligible: { ENGLISH: 0, INTERNATIONAL: 0 },
  countrySamples: new Map(),
  leagueSamples: new Map(),
  clubSamples: new Map()
};
for (const player of players) {
  if (!isUsablePlayer(player)) continue;
  const region = regionOf(player);
  diagnostics.regionPlayers[region ?? "UNCLASSIFIED"]++;
  const countryKey = String(player.currentCountry ?? "(blank)");
  const leagueKey = String(player.currentLeague ?? "(blank)");
  const clubKey = String(player.currentClub ?? "(blank)");
  diagnostics.countrySamples.set(countryKey, (diagnostics.countrySamples.get(countryKey) ?? 0) + 1);
  diagnostics.leagueSamples.set(leagueKey, (diagnostics.leagueSamples.get(leagueKey) ?? 0) + 1);
  diagnostics.clubSamples.set(clubKey, (diagnostics.clubSamples.get(clubKey) ?? 0) + 1);
  if (!region) continue;
  const careerClubs = unique(player.clubs ?? []);
  const latestClub = String(player.currentClub ?? "").trim();
  const firstClub = String(player.spells?.[0]?.club ?? careerClubs[0] ?? "").trim();
  const nationality = displayCountry(player.nationality);
  const position = positionLabel(player.position);
  const league = displayLeague(player.currentLeague);
  const country = displayCountry(player.currentCountry);
  const appearances = number(player.appearances);
  const goals = number(player.goals);
  const recordedLeagueGoals = number(player.leagueGoals);
  const recordedCaps = number(player.caps);
  const recordedInternationalGoals = number(player.internationalGoals);
  const firstYear = number(player.firstYear);
  const lastYear = number(player.lastYear);
  const clubCount = careerClubs.length;
  const spellCount = (player.spells ?? []).length;

  if (easyEligible(player)) {
    diagnostics.easyEligible[region]++;
    if (nationality) add("EASY", player, region, "nationality", "PLAYER BASICS",
      "Which nationality is listed for " + player.name + "?", nationality, nationalityOptions(nationality),
      player.name + " is listed with " + nationality + " nationality. The question uses the archive's latest available squad record.");
    if (latestClub) add("EASY", player, region, "latest-club", "PLAYER & CLUBS",
      "Which club is listed as " + player.name + "'s latest recorded club?", latestClub, clubs,
      latestClub + " is the latest club recorded for " + player.name + ". It is an archive record, not a live squad feed.");
    if (position) add("EASY", player, region, "position", "PLAYER BASICS",
      latestClub ? "Which position group is recorded for " + player.name + " at " + latestClub + "?" : "Which position group is recorded for " + player.name + "?",
      position, ["Goalkeeper", "Defender", "Midfielder", "Forward", "Utility player"],
      player.name + " is listed as a " + position.toLowerCase() + " in the source's squad record.");
  }

  if (mediumEligible(player)) {
    if (firstClub) add("MEDIUM", player, region, "earliest-club", "CAREER PATH",
      "Which club appears earliest in " + player.name + "'s available career record?", firstClub, clubs,
      firstClub + " is the earliest club in the available record for " + player.name + ". This is not necessarily their first-ever senior club.");
    if (clubCount >= 2) add("MEDIUM", player, region, "club-count", "CAREER PATH",
      "How many distinct clubs are listed in " + player.name + "'s recorded career?", String(clubCount), clubCounts,
      player.name + " has " + clubCount + " distinct club names in the available career record.", true);
    if (league) add("MEDIUM", player, region, "latest-league", "LEAGUES",
      "Which league is listed for " + player.name + "'s latest recorded club?", league, leagues,
      "The archive associates " + latestClub + " with " + league + " in its latest club metadata.");
    if (country && latestClub) add("MEDIUM", player, region, "club-country", "LEAGUES",
      "Which country is listed for " + latestClub + " in " + player.name + "'s latest club record?", country, countries,
      "The source's latest-club metadata associates " + latestClub + " with " + country + ".");
  }

  if (hardEligible(player)) {
    if (recordedLeagueGoals !== null && recordedLeagueGoals > 0 && (player.leagueGoalRows ?? 0) > 0) add("HARD", player, region, "league-goals", "RECORDED STATISTICS",
      "How many league goals are recorded for " + player.name + " across the available club-season rows?", String(recordedLeagueGoals), leagueGoals,
      "The source records " + recordedLeagueGoals + " league goals across the player's available league rows; this is not guaranteed to be a complete career total.", true);
    if (goals !== null && goals > 0 && (player.careerGoalRows ?? player.goalRows ?? 0) > 0) add("HARD", player, region, "career-goals", "RECORDED STATISTICS",
      "What career-goal total is recorded for " + player.name + " in the source's career rows?", String(goals), careerGoals,
      "The source records " + goals + " career-spell goals for " + player.name + "; coverage is not guaranteed complete.", true);
    if (recordedCaps !== null && recordedCaps > 0 && (player.nationalRows ?? 0) > 0) add("HARD", player, region, "international-caps", "INTERNATIONAL RECORD",
      "How many international caps are recorded for " + player.name + "?", String(recordedCaps), caps,
      "The national-team rows record " + recordedCaps + " caps for " + player.name + ". National-team coverage varies.", true);
    if (appearances !== null && appearances > 0 && (player.careerAppearanceRows ?? player.appearanceRows ?? 0) > 0) add("HARD", player, region, "career-appearances", "RECORDED STATISTICS",
      "What career-appearance total is recorded for " + player.name + " in the source's career rows?", String(appearances), careerApps,
      "The source records " + appearances + " career-spell appearances for " + player.name + "; coverage is not guaranteed complete.", true);
  }

  if (extremeEligible(player)) {
    if (firstYear !== null) add("EXTREME", player, region, "first-year", "CAREER CHRONOLOGY",
      "In which year does " + player.name + "'s earliest recorded career spell begin?", String(firstYear), careerYears,
      "The earliest career start year recorded for " + player.name + " is " + firstYear + ". Archive coverage varies by player.", true);
    if (lastYear !== null) add("EXTREME", player, region, "last-year", "CAREER CHRONOLOGY",
      "What is the latest year recorded in " + player.name + "'s career spells?", String(lastYear), careerYears,
      "The latest career year recorded for " + player.name + " is " + lastYear + ". Archive coverage varies by player.", true);
    if (firstYear !== null && lastYear !== null && lastYear >= firstYear) add("EXTREME", player, region, "career-span", "CAREER CHRONOLOGY",
      "Across how many calendar years does " + player.name + "'s recorded career span?", String(lastYear - firstYear + 1), careerSpans,
      "The available career record runs from " + firstYear + " to " + lastYear + ". This is a span, not necessarily continuous playing years.", true);
    if (recordedInternationalGoals !== null && recordedInternationalGoals > 0 && (player.nationalRows ?? 0) > 0) add("EXTREME", player, region, "international-goals", "INTERNATIONAL RECORD",
      "How many international goals are recorded for " + player.name + "?", String(recordedInternationalGoals), internationalGoals,
      "The national-team rows record " + recordedInternationalGoals + " international goals for " + player.name + ". Coverage varies.", true);
    if (clubCount >= 2) add("EXTREME", player, region, "spell-count", "CAREER CHRONOLOGY",
      "How many separate club spells are listed for " + player.name + "?", String(spellCount), spellCounts,
      "The available career timeline lists " + spellCount + " club spells for " + player.name + ".", true);
  }
}

const tiers = {};
const distribution = {};
for (const tier of ["EASY", "MEDIUM", "HARD", "EXTREME"]) {
  const english = pools[tier].ENGLISH.sort((a, b) => stableNumber(a.id) - stableNumber(b.id)).slice(0, ENGLISH_TARGET);
  const international = pools[tier].INTERNATIONAL.sort((a, b) => stableNumber(a.id) - stableNumber(b.id)).slice(0, INTERNATIONAL_TARGET);
  if (english.length < ENGLISH_TARGET || international.length < INTERNATIONAL_TARGET) {
    const top = map => [...map.entries()].sort((a,b) => b[1] - a[1]).slice(0,18).map(([value,count]) => value + " (" + count + ")");
    throw new Error(tier + " bank shortfall: " + english.length + "/" + ENGLISH_TARGET +
      " English and " + international.length + "/" + INTERNATIONAL_TARGET +
      " international questions. Diagnostics: regionPlayers=" + JSON.stringify(diagnostics.regionPlayers) +
      "; easyEligible=" + JSON.stringify(diagnostics.easyEligible) +
      "; countries=" + top(diagnostics.countrySamples).join(", ") +
      "; leagues=" + top(diagnostics.leagueSamples).join(", ") +
      "; clubs=" + top(diagnostics.clubSamples).join(", "));
  }
  tiers[tier] = shuffled([...english, ...international], "PLAYGROUND-QUESTION-BANK-V2:" + tier);
  distribution[tier] = { english: english.length, international: international.length, total: tiers[tier].length };
}

const bank = {
  version: 5,
  source: manifest.source,
  sourceRelease: manifest.sourceRelease,
  sourceReleaseUrl: manifest.sourceReleaseUrl ?? manifest.releaseUrl,
  licence: manifest.licence,
  warnings: manifest.warnings ?? manifest.caveats ?? [],
  meta: {
    targetPerTier: TARGET,
    distribution,
    regionalRule: "Questions are grouped by the country/league of the player's latest recorded club, not the player's nationality. United Kingdom records without English league metadata are classified as international because the source does not always distinguish the UK nations.",
    note: "English share refers to clubs identified as English by their country or league metadata. International share includes other countries and leagues present in the source archive."
  },
  tiers
};
await writeFile(outputPath, JSON.stringify(bank));
console.log("Built PLAYGROUND question bank:", distribution);
for (const tier of ["EASY", "MEDIUM", "HARD", "EXTREME"]) {
  const examples = tiers[tier].slice(0, 2).map(question => question.question + " → " + question.answer);
  console.log(tier + " examples:", examples.join(" | "));
}
