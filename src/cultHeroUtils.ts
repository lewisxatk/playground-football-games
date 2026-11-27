import type { ArchiveGamePlayer } from "./careerFileData";

export type CultHeroMystery = {
  player: ArchiveGamePlayer;
  clues: string[];
  league: string;
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
    .replace(/[\u0300-\u036f]/g, "")
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

type KnownLeague = { label: string; context: string[]; names: string[] };

// This is a recognition allow-list, not a claim that these are the only good players.
// Names are matched to the archive; every clue still comes from dated source records.
const KNOWN_LEAGUES: KnownLeague[] = [
  {
    label: "Premier League",
    context: ["premier league", "england", "eng pl"],
    names: [
      "Mohamed Salah", "Virgil van Dijk", "Erling Haaland", "Kevin De Bruyne", "Harry Kane",
      "Son Heung-min", "Bukayo Saka", "Declan Rice", "Phil Foden", "Cole Palmer",
      "Bruno Fernandes", "Martin Odegaard", "Trent Alexander-Arnold", "David Beckham",
      "Thierry Henry", "Dennis Bergkamp", "Patrick Vieira", "Steven Gerrard", "Frank Lampard",
      "Didier Drogba", "Wayne Rooney", "Alan Shearer", "Eden Hazard", "Sergio Aguero",
      "Yaya Toure", "David Silva", "Petr Cech", "John Terry", "Rio Ferdinand", "Nemanja Vidic",
      "Paul Scholes", "Ryan Giggs", "Roy Keane", "Eric Cantona", "Ian Wright", "Tony Adams",
      "Sol Campbell", "Ashley Cole", "Cesc Fabregas", "Robin van Persie", "Luis Suarez",
      "Cristiano Ronaldo", "N'Golo Kante", "Claude Makelele", "Michael Owen", "Jamie Vardy",
      "Gareth Bale", "Robert Pires", "Sadio Mane", "Roberto Firmino", "Virgil van Dijk"
    ]
  },
  {
    label: "La Liga",
    context: ["la liga", "spain", "esp ll"],
    names: [
      "Lionel Messi", "Cristiano Ronaldo", "Karim Benzema", "Luka Modric", "Vinicius Junior",
      "Kylian Mbappe", "Jude Bellingham", "Sergio Ramos", "Xavi Hernandez", "Andres Iniesta",
      "Ronaldinho", "Luis Suarez", "Gareth Bale", "Raul", "Iker Casillas", "Sergio Busquets",
      "Gerard Pique", "Antoine Griezmann", "Fernando Torres", "David Villa", "Zinedine Zidane",
      "Rivaldo", "Roberto Carlos", "Ronaldo Nazario", "Dani Alves", "Luis Figo", "Samuel Eto'o",
      "Sergio Aguero", "Pedri", "Gavi", "Raphinha", "Carles Puyol", "Xabi Alonso",
      "Fernando Hierro", "Diego Maradona", "Toni Kroos", "Thibaut Courtois", "Marcelo",
      "Isco", "Radamel Falcao", "Javier Mascherano", "David Beckham"
    ]
  },
  {
    label: "Bundesliga",
    context: ["bundesliga", "germany", "deu bl"],
    names: [
      "Robert Lewandowski", "Thomas Muller", "Manuel Neuer", "Joshua Kimmich", "Jamal Musiala",
      "Florian Wirtz", "Marco Reus", "Mats Hummels", "Bastian Schweinsteiger", "Philipp Lahm",
      "Toni Kroos", "Arjen Robben", "Franck Ribery", "Jadon Sancho", "Mario Gotze",
      "Miroslav Klose", "Michael Ballack", "Oliver Kahn", "Lothar Matthaus", "Pierre-Emerick Aubameyang",
      "Kai Havertz", "Mario Gomez", "Jurgen Klinsmann", "Matthias Sammer", "Rudi Voller",
      "Kevin De Bruyne", "Erling Haaland", "Edin Dzeko", "Claudio Pizarro", "Stefan Effenberg",
      "Marco Reus", "Serge Gnabry", "Leroy Sane", "Julian Brandt", "Ralf Rangnick"
    ]
  },
  {
    label: "Serie A",
    context: ["serie a", "italy", "ita sa"],
    names: [
      "Francesco Totti", "Andrea Pirlo", "Gianluigi Buffon", "Paolo Maldini", "Alessandro Del Piero",
      "Kaka", "Zlatan Ibrahimovic", "Ronaldo Nazario", "Paulo Dybala", "Romelu Lukaku",
      "Lautaro Martinez", "Rafael Leao", "Hakan Calhanoglu", "Ciro Immobile", "Giorgio Chiellini",
      "Alessandro Nesta", "Javier Zanetti", "Fabio Cannavaro", "Andriy Shevchenko", "Clarence Seedorf",
      "Gabriel Batistuta", "Roberto Baggio", "David Trezeguet", "Christian Vieri", "Filippo Inzaghi",
      "Daniele De Rossi", "Gennaro Gattuso", "Marek Hamsik", "Lorenzo Insigne", "Federico Chiesa",
      "Nicolo Barella", "Gianluca Vialli", "Ruud Gullit", "Marco van Basten", "Edinson Cavani",
      "Thiago Silva", "Cafu", "Alvaro Morata", "Gonzalo Higuain"
    ]
  },
  {
    label: "Ligue 1",
    context: ["ligue 1", "france", "fra l1"],
    names: [
      "Kylian Mbappe", "Neymar", "Edinson Cavani", "Angel Di Maria", "Marco Verratti",
      "Thiago Silva", "Marquinhos", "George Weah", "Juninho Pernambucano", "Didier Drogba",
      "Eden Hazard", "Radamel Falcao", "Fabinho", "N'Golo Kante", "Dimitri Payet",
      "Ousmane Dembele", "Achraf Hakimi", "Vitinha", "Pauleta", "David Ginola",
      "Sonny Anderson", "Laurent Blanc", "Zlatan Ibrahimovic", "Bernardo Silva", "Memphis Depay",
      "Mamadou Sakho", "Blaise Matuidi", "Moussa Dembele", "Alexandre Lacazette", "Karim Benzema"
    ]
  }
];

const leagueNameKeys = KNOWN_LEAGUES.map(league => ({
  ...league,
  keys: new Set(league.names.map(normaliseCultHeroAnswer))
}));

function knownLeagueFor(player: ArchiveGamePlayer): string | null {
  const names = [player.name, player.fullName ?? ""].map(normaliseCultHeroAnswer).filter(Boolean);
  const matches = leagueNameKeys.filter(league => names.some(name => league.keys.has(name)));
  if (!matches.length) return null;

  const profile = normaliseCultHeroAnswer([player.currentLeague, player.currentCountry].filter(Boolean).join(" "));
  const currentMatch = matches.find(league =>
    league.context.some(value => profile.includes(normaliseCultHeroAnswer(value)))
  );
  return (currentMatch ?? matches[0]).label;
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
    knownLeagueFor(player) &&
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
  const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };

  const eligible = players
    .filter(isCultHeroEligible)
    .map(player => {
      const career = datedCareer(player);
      const clubs = Array.from(new Set(career.map(spell => spell.club)));
      const earliest = career[0];
      const latest = career[career.length - 1];
      const middleClub = clubs.find(club => club !== earliest.club && club !== latest.club) ?? clubs[1];
      const position = displayPosition(player.position);
      return {
        player,
        league: knownLeagueFor(player) ?? "Big Five",
        clues: [
          `My recorded playing position is ${position}.`,
          `My player profile lists my nationality as ${player.nationality}.`,
          `A club spell in my recorded career was with ${middleClub}.`,
          `The earliest dated club spell in this archive record is ${earliest.club} (${earliest.year}).`,
          `The latest dated club spell in this archive record is ${latest.club} (${latest.year}).`,
        ],
      };
    });

  const sorted = eligible.sort((a, b) => hash(seed + ":" + a.player.id) - hash(seed + ":" + b.player.id));
  const selected: typeof sorted = [];
  const used = new Set<string>();

  // Put one recognisable name from each of the five major European leagues into
  // the daily set whenever the loaded archive sample contains a usable record.
  const leagueOrder = [...KNOWN_LEAGUES].sort((a, b) => hash(seed + ":" + a.label) - hash(seed + ":" + b.label));
  for (const league of leagueOrder) {
    const candidate = sorted.find(item => item.league === league.label && !used.has(item.player.id));
    if (candidate && selected.length < count) {
      selected.push(candidate);
      used.add(candidate.player.id);
    }
  }

  for (const item of sorted) {
    if (selected.length >= count) break;
    if (!used.has(item.player.id)) {
      selected.push(item);
      used.add(item.player.id);
    }
  }
  return selected.slice(0, count);
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
