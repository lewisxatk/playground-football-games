/**
 * PLAYGROUND football knowledge coverage targets.
 *
 * Counts are playable, validated content units, not raw player rows:
 * questions for quiz modes; answer entries for word games; complete packs
 * for grid/group/line-up modes; and complete clue/stat challenges elsewhere.
 */
export type ContentUnit =
  | "question"
  | "answer"
  | "puzzle-pack"
  | "challenge-pack"
  | "player-card";

export type GameContentTarget = {
  unit: ContentUnit;
  minimum: number;
  target: number;
  maximum: number;
  coverage: "all-football";
};

export const FOOTBALL_CONTENT_TARGETS = {
  "lowball": { unit: "challenge-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "the-climb": { unit: "question", minimum: 500, target: 1000, maximum: 1000, coverage: "all-football" },
  "draft-xi": { unit: "challenge-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "career-file": { unit: "player-card", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "footle": { unit: "answer", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "connections": { unit: "puzzle-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "football-grid": { unit: "puzzle-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "ladder": { unit: "challenge-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "the-reveal": { unit: "player-card", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "football-501": { unit: "challenge-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "link-up": { unit: "puzzle-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "missing-xi": { unit: "puzzle-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "strands": { unit: "puzzle-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "scout-signal": { unit: "player-card", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "tournament-nation": { unit: "puzzle-pack", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
  "timed-quiz": { unit: "question", minimum: 500, target: 1000, maximum: 1000, coverage: "all-football" },
  "cult-hero": { unit: "player-card", minimum: 500, target: 750, maximum: 1000, coverage: "all-football" },
} as const satisfies Record<string, GameContentTarget>;

/** UK-first topic mix shared by every game's content selector. */
export const FOOTBALL_TOPIC_WEIGHTS = {
  premierLeague: 40,
  eflAndEnglishCups: 20,
  championsLeagueAndEuropeanCups: 15,
  worldCupAndEuros: 15,
  otherBigFiveLeagues: 10,
} as const;

export const FOOTBALL_TOPIC_TOTAL = Object.values(FOOTBALL_TOPIC_WEIGHTS)
  .reduce((total, value) => total + value, 0);

export const FOOTBALL_CONTENT_RULES = [
  "Every game draws from the same UK-first football knowledge universe; format changes, subject coverage does not.",
  "Questions may cover current and historic players, teams, seasons, managers, transfers, trophies, grounds, matches and records.",
  "Premier League history and records are core; include EFL, FA Cup, League Cup and other English football.",
  "Include UEFA Champions League history from the European Cup era where records are continuous and clearly labelled.",
  "Include FIFA World Cup and UEFA European Championship records, past and present.",
  "Use La Liga, Bundesliga, Serie A and Ligue 1 clubs and players, prioritising recognisable names and major European stories.",
  "Every factual item must carry a source, competition/scope, relevant date or season cutoff, accepted answers and review status.",
  "Do not mix Premier League-only statistics with all-competition or career totals.",
  "Do not treat player nationality as proof of a national-team appearance or club membership as proof of a trophy/record.",
  "Do not publish ambiguous puzzles, incomplete answer sets or fabricated crowd-rarity scores.",
] as const;
