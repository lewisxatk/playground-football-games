/**
 * Plain-language quiz content shared across PLAYGROUND's football games.
 * The player-facing fields are deliberately simple: question, answer, choices.
 * Provenance and competition scope are internal QA metadata.
 */
export type FootballTopic =
  | "premier-league" | "efl" | "english-cups" | "champions-league"
  | "european-club" | "world-cup" | "euros" | "la-liga" | "bundesliga"
  | "serie-a" | "ligue-1" | "international" | "players" | "clubs"
  | "managers" | "transfers" | "stadiums" | "matches" | "trophies";

export type FootballFact = {
  id: string;
  topic: FootballTopic;
  /** The exact sentence shown to the player. */
  question: string;
  /** The short, canonical answer shown after a reveal. */
  answer: string;
  /** Accepted spellings/aliases for typed-answer games. */
  acceptedAnswers: string[];
  /** Optional four-choice quiz version; answer must appear exactly once. */
  choices?: string[];
  explanation: string;
  competition: string;
  scope: string;
  validAsOf: string;
  source: { name: string; url: string; checkedAt: string };
  reviewStatus: "verified" | "needs-review" | "retired";
  gameModes: string[];
};

export function normaliseFootballAnswer(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-GB").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function validateFootballFacts(facts: FootballFact[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const questions = new Set<string>();
  for (const fact of facts) {
    const id = fact.id || "(missing ID)";
    if (!fact.id || ids.has(fact.id)) errors.push(id + ": missing or duplicate ID.");
    ids.add(fact.id);
    if (!fact.question?.trim() || !fact.question.trim().endsWith("?")) errors.push(id + ": question must be a complete, natural question.");
    const q = normaliseFootballAnswer(fact.question ?? "");
    if (q && questions.has(q)) errors.push(id + ": duplicate question.");
    questions.add(q);
    if (!fact.answer?.trim()) errors.push(id + ": missing short answer.");
    const accepted = (fact.acceptedAnswers ?? []).map(normaliseFootballAnswer).filter(Boolean);
    if (!accepted.includes(normaliseFootballAnswer(fact.answer ?? ""))) errors.push(id + ": accepted answers must include the canonical answer.");
    if (new Set(accepted).size !== accepted.length) errors.push(id + ": duplicate accepted answer aliases.");
    if (!fact.explanation?.trim()) errors.push(id + ": missing answer explanation.");
    if (!fact.competition?.trim() || !fact.scope?.trim()) errors.push(id + ": missing competition/statistical scope.");
    if (!fact.validAsOf) errors.push(id + ": missing date/season cutoff.");
    if (!fact.source?.name || !/^https?:\/\//.test(fact.source?.url ?? "") || !fact.source?.checkedAt) errors.push(id + ": missing source provenance.");
    if (fact.reviewStatus !== "verified") errors.push(id + ": not approved for live content.");
    if (!Array.isArray(fact.gameModes) || !fact.gameModes.length) errors.push(id + ": no game mode mapping.");
    if (fact.choices) {
      const choices = fact.choices.map(normaliseFootballAnswer);
      if (choices.length !== 4 || new Set(choices).size !== 4) errors.push(id + ": quiz must have exactly four distinct choices.");
      if (choices.filter(choice => choice === normaliseFootballAnswer(fact.answer)).length !== 1) errors.push(id + ": correct answer must appear exactly once in choices.");
    }
  }
  return { valid: errors.length === 0, errors };
}
