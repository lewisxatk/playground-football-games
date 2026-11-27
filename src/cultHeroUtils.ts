import type { ArchiveGamePlayer } from "./careerFileData";

export type CultHeroMystery = {
  player: ArchiveGamePlayer;
  clues: string[];
};

export type CultHeroCard = {
  playerId: string;
  name: string;
  nationality: string;
  position: string;
  clubs: string[];
  collectedAt: string;
  source: "mystery" | "pack";
};

export const CULT_HERO_COLLECTION_KEY = "playground.cult-hero.collection.v1";

export function normaliseCultHeroAnswer(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function cultHeroUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayPosition(value: string): string {
  const position = value.toUpperCase();
  if (position.includes("GK") || position.includes("KEEPER")) return "goalkeeper";
  if (position.includes("DF") || position.includes("DEF")) return "defender";
  if (position.includes("MF") || position.includes("MID")) return "midfielder";
  if (position.includes("FW") || position.includes("FORWARD") || position.includes("STRIKER")) return "forward";
  return "";
}

function validYear(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1880 && value <= 2100;
}

function datedCareer(player: ArchiveGamePlayer) {
  return (player.spells ?? [])
    .filter(spell => spell.club?.trim() && (validYear(spell.startYear) || validYear(spell.endYear)))
    .map(spell => ({
      club: spell.club.trim(),
      year: validYear(spell.startYear) ? spell.startYear : spell.endYear as number,
      startYear: spell.startYear,
      endYear: spell.endYear,
    }))
    .sort((a, b) => a.year - b.year || a.club.localeCompare(b.club));
}

export function isCultHeroEligible(player: ArchiveGamePlayer): boolean {
  const nationality = player.nationality?.trim();
  const position = displayPosition(player.position ?? "");
  const career = datedCareer(player);
  const datedClubs = new Set(career.map(spell => spell.club));
  return Boolean(
    player.id &&
    player.name?.trim() &&
    nationality &&
    !["unknown", "unlisted", "not recorded"].includes(nationality.toLowerCase()) &&
    position &&
    datedClubs.size >= 3 &&
    career.length >= 3
  );
}

export function buildCultHeroMysteries(
  players: ArchiveGamePlayer[],
  seed: string,
  count = 5
): CultHeroMystery[] {
  const eligible = players
    .filter(isCultHeroEligible)
    .map(player => {
      const career = datedCareer(player);
      const clubs = Array.from(new Set(career.map(spell => spell.club)));
      const earliest = career[0];
      const latest = career[career.length - 1];
      const middleClub = clubs.find(club => club !== earliest.club && club !== latest.club) ?? clubs[1];
      const position = displayPosition(player.position);
      const clues = [
        `My recorded playing position is ${position}.`,
        `My player profile lists my nationality as ${player.nationality}.`,
        `A club spell in my recorded career was with ${middleClub}.`,
        `The earliest dated club spell in this archive record is ${earliest.club} (${earliest.year}).`,
        `The latest dated club spell in this archive record is ${latest.club} (${latest.year}).`,
      ];
      return { player, clues };
    })
    .filter(mystery => mystery.clues.length === 5);

  // Sorting by a stable hash gives every visitor the same daily draw without
  // depending on the browser's random-number generator or record ordering.
  const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };

  return eligible
    .sort((a, b) => hash(seed + ":" + a.player.id) - hash(seed + ":" + b.player.id))
    .slice(0, count);
}

export function readCultHeroCollection(): CultHeroCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CULT_HERO_COLLECTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CultHeroCard =>
      Boolean(
        item &&
        typeof item === "object" &&
        typeof (item as CultHeroCard).playerId === "string" &&
        typeof (item as CultHeroCard).name === "string" &&
        typeof (item as CultHeroCard).collectedAt === "string"
      )
    ).slice(0, 5000);
  } catch {
    return [];
  }
}

export function addCultHeroCard(
  player: ArchiveGamePlayer,
  source: CultHeroCard["source"]
): { collection: CultHeroCard[]; added: boolean } {
  const current = readCultHeroCollection();
  if (current.some(card => card.playerId === player.id)) {
    return { collection: current, added: false };
  }
  const card: CultHeroCard = {
    playerId: player.id,
    name: player.name,
    nationality: player.nationality || "Not recorded",
    position: displayPosition(player.position) || "Not recorded",
    clubs: Array.from(new Set((player.spells ?? []).map(spell => spell.club?.trim()).filter((club): club is string => Boolean(club)))).slice(0, 8),
    collectedAt: new Date().toISOString(),
    source,
  };
  const collection = [card, ...current].slice(0, 5000);
  try {
    window.localStorage.setItem(CULT_HERO_COLLECTION_KEY, JSON.stringify(collection));
  } catch {
    // The current game session remains playable if browser storage is unavailable.
  }
  return { collection, added: true };
}
