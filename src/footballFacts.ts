/**
 * Plain-language, source-backed football quiz records shared across PLAYGROUND.
 * Other games must convert these facts into valid game-specific puzzle packs.
 */
export type FootballTopic =
  | "premier-league" | "efl" | "english-cups" | "champions-league"
  | "european-club" | "world-cup" | "euros" | "la-liga" | "bundesliga"
  | "serie-a" | "ligue-1" | "international" | "players" | "clubs"
  | "managers" | "transfers" | "stadiums" | "matches" | "trophies";
export type FootballQuestionCategory =
  | "players" | "clubs" | "managers" | "transfers" | "stadiums"
  | "matches" | "records" | "trophies" | "tournaments" | "firsts" | "history" | "milestones";
export type FootballDifficulty = "easy" | "medium" | "hard" | "extreme";
export type FootballFact = {
  id: string;
  topic: FootballTopic;
  category: FootballQuestionCategory;
  difficulty: FootballDifficulty;
  difficultyReason: string;
  question: string;
  answer: string;
  acceptedAnswers: string[];
  choices?: string[];
  explanation: string;
  competition: string;
  scope: string;
  validAsOf: string;
  source: { name: string; url: string; checkedAt: string };
  reviewStatus: "verified" | "needs-review" | "retired";
  /** Native question modes only. Other games require a conversion step. */
  gameModes: string[];
};
export function normaliseFootballAnswer(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-GB").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
export function validateFootballFacts(facts: FootballFact[]) {
  const errors: string[] = [];
  const ids = new Set<string>(), questions = new Set<string>();
  const categories = new Set<FootballQuestionCategory>(["players","clubs","managers","transfers","stadiums","matches","records","trophies","tournaments","firsts","history","milestones"]);
  const difficulties = new Set<FootballDifficulty>(["easy","medium","hard","extreme"]);
  for (const fact of facts) {
    const id = fact.id || "(missing ID)";
    if (!fact.id || ids.has(fact.id)) errors.push(id + ": missing or duplicate ID.");
    ids.add(fact.id);
    if (!fact.question?.trim() || !fact.question.trim().endsWith("?")) errors.push(id + ": question must be a complete, natural question.");
    const question = normaliseFootballAnswer(fact.question ?? "");
    if (question && questions.has(question)) errors.push(id + ": duplicate question.");
    questions.add(question);
    if (!fact.answer?.trim()) errors.push(id + ": missing short answer.");
    const accepted = (fact.acceptedAnswers ?? []).map(normaliseFootballAnswer).filter(Boolean);
    if (!accepted.includes(normaliseFootballAnswer(fact.answer ?? ""))) errors.push(id + ": accepted answers must include the canonical answer.");
    if (new Set(accepted).size !== accepted.length) errors.push(id + ": duplicate accepted aliases after normalisation.");
    if (!fact.explanation?.trim()) errors.push(id + ": missing explanation.");
    if (!categories.has(fact.category)) errors.push(id + ": missing or invalid category.");
    if (!difficulties.has(fact.difficulty)) errors.push(id + ": missing or invalid difficulty tier.");
    if (!fact.difficultyReason?.trim()) errors.push(id + ": missing difficulty rationale.");
    if (!fact.competition?.trim() || !fact.scope?.trim()) errors.push(id + ": missing competition/statistical scope.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fact.validAsOf ?? "")) errors.push(id + ": validAsOf must be an ISO date.");
    if (!fact.source?.name || !/^https?:\/\//.test(fact.source?.url ?? "") || !fact.source?.checkedAt) errors.push(id + ": missing source provenance.");
    if (fact.reviewStatus !== "verified") errors.push(id + ": not approved for live content.");
    if (!Array.isArray(fact.gameModes) || !fact.gameModes.length) errors.push(id + ": no native quiz mode mapping.");
    if (fact.gameModes?.some(mode => !["timed-quiz","the-climb"].includes(mode))) errors.push(id + ": use a game-specific converter before mapping to other games.");
    if (fact.choices) {
      const choices = fact.choices.map(normaliseFootballAnswer);
      if (choices.length !== 4 || new Set(choices).size !== 4) errors.push(id + ": needs exactly four distinct choices.");
      if (choices.filter(choice => choice === normaliseFootballAnswer(fact.answer)).length !== 1) errors.push(id + ": correct answer must appear exactly once.");
    }
  }
  return { valid: errors.length === 0, errors };
}
