import { useCallback, useEffect, useState } from "react";

export type QuizTier = "EASY" | "MEDIUM" | "HARD" | "EXTREME";
export type QuizQuestion = {
  id: string;
  tier: QuizTier;
  playerId: string;
  region: "ENGLISH" | "INTERNATIONAL";
  category: string;
  question: string;
  answer: string;
  options: string[];
  explanation: string;
  source: string;
};
export type QuestionBank = {
  version: number;
  source: string;
  sourceRelease: string;
  sourceReleaseUrl: string;
  licence: string;
  warnings: string[];
  meta: {
    targetPerTier: number;
    distribution: Record<QuizTier, { english: number; international: number; total: number }>;
    regionalRule: string;
    note: string;
  };
  tiers: Record<QuizTier, QuizQuestion[]>;
};

let bankPromise: Promise<QuestionBank> | null = null;

export async function loadQuestionBank(force = false): Promise<QuestionBank> {
  if (force) bankPromise = null;
  if (!bankPromise) {
    bankPromise = fetch("/data/question-bank.json", { cache: force ? "no-store" : "force-cache" }).then(async response => {
      if (!response.ok) throw new Error("The curated question bank is unavailable (" + response.status + ").");
      const bank = await response.json() as QuestionBank;
      const tiers: QuizTier[] = ["EASY", "MEDIUM", "HARD", "EXTREME"];
      if (bank.version !== 2 || bank.source !== "OpenFootballBase-Data" ||
          !bank.meta || bank.meta.targetPerTier < 750 || !bank.tiers ||
          tiers.some(tier => {
            const questions = bank.tiers[tier];
            const distribution = bank.meta?.distribution?.[tier];
            return !Array.isArray(questions) || questions.length < 750 ||
              distribution?.total !== questions.length ||
              distribution?.english + distribution?.international !== questions.length ||
              distribution?.english !== 600 || distribution?.international !== 200 ||
              questions.some(question => question.tier !== tier || !question.playerId ||
                !question.question || !question.answer || !Array.isArray(question.options) ||
                question.options.length !== 5 || !question.options.includes(question.answer));
          })) throw new Error("The question bank failed its four-tier, 800-question and 75/25 integrity checks.");
      return bank;
    }).catch(error => { bankPromise = null; throw error; });
  }
  return bankPromise;
}

export function useQuestionBank() {
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    loadQuestionBank(attempt > 0).then(value => {
      if (live) setBank(value);
    }).catch(problem => {
      if (live) setError(problem instanceof Error ? problem.message : "Question bank unavailable.");
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { bank, loading, error, retry };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;
  for (let index = result.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const at = state % (index + 1);
    [result[index], result[at]] = [result[at], result[index]];
  }
  return result;
}

/** Select a round from the pre-generated tier, keeping player identities unique within the round. */
export function makeQuestionRound(bank: QuestionBank, tier: QuizTier, seed: number, count = 15): QuizQuestion[] {
  const questions = bank.tiers[tier] ?? [];
  const englishCount = Math.round(count * 0.75);
  const internationalCount = count - englishCount;
  const selectedIds = new Set<string>();
  const chooseRegion = (region: QuizQuestion["region"], needed: number, salt: number) => {
    const result: QuizQuestion[] = [];
    for (const question of shuffle(questions.filter(item => item.region === region), seed + salt)) {
      if (selectedIds.has(question.playerId)) continue;
      selectedIds.add(question.playerId);
      result.push(question);
      if (result.length === needed) break;
    }
    return result;
  };
  const english = chooseRegion("ENGLISH", englishCount, 101);
  const international = chooseRegion("INTERNATIONAL", internationalCount, 211);
  if (english.length !== englishCount || international.length !== internationalCount) {
    throw new Error("Not enough distinct players to create the requested 75/25 quiz round.");
  }
  return shuffle([...english, ...international], seed + 307);
}
