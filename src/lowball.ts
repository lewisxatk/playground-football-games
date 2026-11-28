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

export type LowballQuestionBank = {
  source: string;
  licence: string;
  sourceRelease: string;
  archivePlayerCount: number;
  playersWithEnglishLeagueStats: number;
  scoring: string;
  dailyQuestions: number;
  questions: LowballQuestion[];
};

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

export function selectLowballQuestions(bank: LowballQuestionBank | null, seed: number): LowballQuestion[] {
  if (!bank || bank.dailyQuestions !== 7 || !Array.isArray(bank.questions)) return [];
  const shuffled = seededShuffle(bank.questions, seed);
  const selected: LowballQuestion[] = [];
  const counts = new Map<string, number>();
  for (const question of shuffled) {
    if (selected.length >= 7) break;
    const count = counts.get(question.type) ?? 0;
    if (count >= 2) continue;
    selected.push(question);
    counts.set(question.type, count + 1);
  }
  if (selected.length < 7) {
    for (const question of shuffled) {
      if (selected.length >= 7) break;
      if (!selected.some(item => item.id === question.id)) selected.push(question);
    }
  }
  return selected.slice(0, 7);
}

export function matchLowballAnswer(question: LowballQuestion, guess: string): LowballAnswer | null {
  const normalise = (value: unknown) => String(value ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").replace(/[^a-z0-9]/g, "");
  const key = normalise(guess);
  if (!key) return null;
  return question.answers.find(answer => answer.aliases.some(alias => normalise(alias) === key)) ?? null;
}
