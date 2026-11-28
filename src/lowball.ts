import type { ArchiveGamePlayer, ArchiveGameStat } from "./careerFileData";

export type LowballAnswer = {
  id: string;
  name: string;
  aliases: string[];
  score: number;
  evidence: string;
  metric: number;
};

export type LowballQuestion = {
  id: string;
  type: string;
  prompt: string;
  scope: string;
  answers: LowballAnswer[];
};

export type LowballClubIndex = {
  premierLeagueClubs: string[];
  englishLeagueClubs: string[];
};

type PlayerRecord = {
  player: ArchiveGamePlayer;
  clubs: Map<string, { name: string; apps: number; goals: number }>;
  totalApps: number;
  totalGoals: number;
  clubCount: number;
  maxClubApps: number;
  maxClubGoals: number;
};

const normalise = (value: unknown) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").replace(/[^a-z0-9]/g, "");

const clubKey = (value: unknown) => String(value ?? "").toLocaleLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ")
  .replace(/\b(?:association football club|football club|a\.?f\.?c\.?|f\.?c\.?|the)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed >>> 0;
  for (let index = copy.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function playerStats(player: ArchiveGamePlayer): ArchiveGameStat[] {
  return player.seasonStats ?? player.stats ?? [];
}

function makeAnswers(
  rows: Array<{ record: PlayerRecord; metric: number; evidence: string }>
): LowballAnswer[] {
  const unique = new Map<string, { record: PlayerRecord; metric: number; evidence: string }>();
  for (const row of rows) {
    const name = String(row.record.player.fullName || row.record.player.name || "").trim();
    const key = normalise(name);
    if (!key || unique.has(key)) continue;
    unique.set(key, { ...row, metric: Math.max(0, Number(row.metric) || 0) });
  }
  const values = [...unique.values()];
  if (!values.length) return [];
  const metricValues = [...new Set(values.map(value => value.metric))].sort((a, b) => a - b);
  const answers = values.map(value => {
    const name = String(value.record.player.fullName || value.record.player.name).trim();
    const rank = metricValues.indexOf(value.metric);
    const score = metricValues.length < 2 ? 50 : Math.round(5 + 95 * rank / (metricValues.length - 1));
    const aliases = [...new Set([value.record.player.name, value.record.player.fullName]
      .map(alias => String(alias ?? "").trim()).filter(Boolean))];
    return {
      id: value.record.player.id,
      name,
      aliases,
      score,
      evidence: value.evidence,
      metric: value.metric
    };
  });
  const surnameCounts = new Map<string, number>();
  for (const answer of answers) {
    const surname = answer.name.split(/\s+/).at(-1) ?? "";
    const key = normalise(surname);
    if (key) surnameCounts.set(key, (surnameCounts.get(key) ?? 0) + 1);
  }
  for (const answer of answers) {
    const surname = answer.name.split(/\s+/).at(-1) ?? "";
    const key = normalise(surname);
    if (key && surnameCounts.get(key) === 1 && !answer.aliases.some(alias => normalise(alias) === key)) {
      answer.aliases.push(surname);
    }
  }
  return answers;
}

export function buildLowballQuestions(
  players: ArchiveGamePlayer[],
  index: LowballClubIndex | null,
  seed: number
): LowballQuestion[] {
  if (!index || !Array.isArray(index.englishLeagueClubs) || !players.length) return [];
  const englishNames = [...new Map(
    [...(index.premierLeagueClubs ?? []), ...index.englishLeagueClubs]
      .map(name => [clubKey(name), String(name).trim()] as const)
      .filter(([key, name]) => key && name)
  ).values()];
  const canonical = new Map(englishNames.map(name => [clubKey(name), name]));
  const englishKeys = new Set(canonical.keys());
  const records: PlayerRecord[] = [];

  for (const player of players) {
    const clubs = new Map<string, { name: string; apps: number; goals: number }>();
    for (const stat of playerStats(player)) {
      if (stat.competitionGroup !== "League") continue;
      const key = clubKey(stat.club);
      if (!englishKeys.has(key)) continue;
      const apps = Math.max(0, Number(stat.apps ?? 0) || 0);
      const goals = Math.max(0, Number(stat.goals ?? 0) || 0);
      if (apps <= 0 && goals <= 0) continue;
      const current = clubs.get(key) ?? { name: canonical.get(key) ?? String(stat.club), apps: 0, goals: 0 };
      current.apps += apps;
      current.goals += goals;
      clubs.set(key, current);
    }
    if (!clubs.size) continue;
    const totals = [...clubs.values()];
    records.push({
      player,
      clubs,
      totalApps: totals.reduce((sum, row) => sum + row.apps, 0),
      totalGoals: totals.reduce((sum, row) => sum + row.goals, 0),
      clubCount: totals.filter(row => row.apps > 0).length,
      maxClubApps: Math.max(0, ...totals.map(row => row.apps)),
      maxClubGoals: Math.max(0, ...totals.map(row => row.goals))
    });
  }
  if (records.length < 30) return [];

  const questions: LowballQuestion[] = [];
  const add = (question: LowballQuestion) => {
    if (question.answers.length >= 8) questions.push(question);
  };
  const premierKeys = new Set((index.premierLeagueClubs ?? []).map(clubKey));
  const clubs = seededShuffle(englishNames, seed + 17)
    .sort((a, b) => Number(premierKeys.has(clubKey(b))) - Number(premierKeys.has(clubKey(a))));

  for (const club of clubs) {
    const key = clubKey(club);
    const appearanceRows = records.flatMap(record => {
      const stat = record.clubs.get(key);
      return stat && stat.apps > 0
        ? [{ record, metric: stat.apps, evidence: stat.apps + " recorded league appearances for " + club }]
        : [];
    });
    if (appearanceRows.length >= 8) {
      add({
        id: "club-apps:" + key,
        type: "club-appearances",
        prompt: "Name a player with a recorded league appearance for " + club + ".",
        scope: "English league archive · all recorded seasons",
        answers: makeAnswers(appearanceRows)
      });
    }
    const goalRows = records.flatMap(record => {
      const stat = record.clubs.get(key);
      return stat && stat.goals > 0
        ? [{ record, metric: stat.goals, evidence: stat.goals + " recorded league goals for " + club }]
        : [];
    });
    if (goalRows.length >= 8) {
      add({
        id: "club-goals:" + key,
        type: "club-goals",
        prompt: "Name a player who scored a recorded league goal for " + club + ".",
        scope: "English league archive · all recorded seasons",
        answers: makeAnswers(goalRows)
      });
    }
    if (questions.length >= 180) break;
  }

  const milestoneQuestions: LowballQuestion[] = [];
  const hundredApps = records.filter(record => record.totalApps >= 100);
  if (hundredApps.length >= 8) milestoneQuestions.push({
    id: "milestone:100-apps", type: "career-appearances",
    prompt: "Name a player with at least 100 recorded league appearances for English clubs.",
    scope: "English league archive · recorded career totals",
    answers: makeAnswers(hundredApps.map(record => ({
      record, metric: record.totalApps, evidence: record.totalApps + " recorded league appearances for English clubs"
    })))
  });
  const tenGoals = records.filter(record => record.totalGoals >= 10);
  if (tenGoals.length >= 8) milestoneQuestions.push({
    id: "milestone:10-goals", type: "career-goals",
    prompt: "Name a player with at least 10 recorded league goals for English clubs.",
    scope: "English league archive · recorded career totals",
    answers: makeAnswers(tenGoals.map(record => ({
      record, metric: record.totalGoals, evidence: record.totalGoals + " recorded league goals for English clubs"
    })))
  });
  const threeClubs = records.filter(record => record.clubCount >= 3);
  if (threeClubs.length >= 8) milestoneQuestions.push({
    id: "milestone:three-clubs", type: "multi-club-career",
    prompt: "Name a player with recorded league appearances for at least three English clubs.",
    scope: "English league archive · recorded club history",
    answers: makeAnswers(threeClubs.map(record => ({
      record, metric: record.clubCount * 100 + record.totalApps,
      evidence: record.clubCount + " English clubs · " + record.totalApps + " recorded league appearances"
    })))
  });
  const fiftyAppsAtClub = records.filter(record => record.maxClubApps >= 50);
  if (fiftyAppsAtClub.length >= 8) milestoneQuestions.push({
    id: "milestone:50-apps-at-club", type: "club-appearances",
    prompt: "Name a player with at least 50 recorded league appearances for one English club.",
    scope: "English league archive · recorded club totals",
    answers: makeAnswers(fiftyAppsAtClub.map(record => ({
      record, metric: record.maxClubApps,
      evidence: record.maxClubApps + " recorded league appearances for one English club"
    })))
  });
  const fiveGoalsAtClub = records.filter(record => record.maxClubGoals >= 5);
  if (fiveGoalsAtClub.length >= 8) milestoneQuestions.push({
    id: "milestone:5-goals-at-club", type: "club-goals",
    prompt: "Name a player with at least five recorded league goals for one English club.",
    scope: "English league archive · recorded club totals",
    answers: makeAnswers(fiveGoalsAtClub.map(record => ({
      record, metric: record.maxClubGoals,
      evidence: record.maxClubGoals + " recorded league goals for one English club"
    })))
  });
  questions.push(...milestoneQuestions);

  const pairClubs = clubs.slice(0, 32);
  let pairCount = 0;
  for (let left = 0; left < pairClubs.length && pairCount < 120; left++) {
    for (let right = left + 1; right < pairClubs.length && pairCount < 120; right++) {
      const clubA = pairClubs[left], clubB = pairClubs[right];
      const keyA = clubKey(clubA), keyB = clubKey(clubB);
      const overlapRows = records.flatMap(record => {
        const a = record.clubs.get(keyA), b = record.clubs.get(keyB);
        return a && b && a.apps > 0 && b.apps > 0
          ? [{ record, metric: a.apps + b.apps, evidence: (a.apps + b.apps) + " recorded league appearances across " + clubA + " and " + clubB }]
          : [];
      });
      if (overlapRows.length < 8) continue;
      add({
        id: "club-pair:" + keyA + ":" + keyB,
        type: "two-club-career",
        prompt: "Name a player with recorded league appearances for both " + clubA + " and " + clubB + ".",
        scope: "English league archive · recorded club history",
        answers: makeAnswers(overlapRows)
      });
      pairCount++;
    }
  }

  const shuffled = seededShuffle(questions.filter(question => question.answers.length >= 8), seed + 101);
  const selected: LowballQuestion[] = [];
  const typeCounts = new Map<string, number>();
  for (const type of ["club-appearances", "club-goals", "two-club-career", "career-appearances", "career-goals", "multi-club-career"]) {
    const candidate = shuffled.find(question => question.type === type);
    if (candidate && !selected.some(question => question.id === candidate.id)) {
      selected.push(candidate);
      typeCounts.set(type, 1);
    }
  }
  for (const question of shuffled) {
    if (selected.length >= 7) break;
    if (selected.some(item => item.id === question.id)) continue;
    const count = typeCounts.get(question.type) ?? 0;
    if (count >= 2) continue;
    selected.push(question);
    typeCounts.set(question.type, count + 1);
  }
  if (selected.length < 7) {
    for (const question of shuffled) {
      if (selected.length >= 7) break;
      if (!selected.some(item => item.id === question.id)) selected.push(question);
    }
  }
  return selected.slice(0, 7);
}
