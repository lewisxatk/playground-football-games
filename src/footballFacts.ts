/**
 * Shared, source-backed fact/question record for PLAYGROUND's football games.
 * Different game modes render the same fact in different mechanics.
 */
export type FootballTopic =
  | "premier-league"
  | "efl"
  | "english-cups"
  | "champions-league"
  | "european-club"
  | "world-cup"
  | "euros"
  | "la-liga"
  | "bundesliga"
  | "serie-a"
  | "ligue-1"
  | "international"
  | "players"
  | "clubs"
  | "managers"
  | "transfers"
  | "stadiums"
  | "matches"
  | "trophies";

export type FootballAnswer = {
  canonical: string;
  accepted: string[];
};

export type FootballSource = {
  name: string;
  url: string;
  checkedAt: string;
};

export type FootballFact = {
  id: string;
  topic: FootballTopic;
  prompt: string;
  answer: FootballAnswer;
  /** Complete valid answer set for prompts that intentionally have multiple answers. */
  additionalAnswers?: FootballAnswer[];
  options?: string[];
  explanation: string;
  competition: string;
  scope: string;
  /** ISO date or season label; required for records that can change. */
  validAsOf: string;
  source: FootballSource;
  reviewStatus: "verified" | "needs-review" | "retired";
  /** A fact can power several formats without copying/rewording its underlying truth. */
  gameModes: string[];
};

export type FootballFactValidation = {
  valid: boolean;
  errors: string[];
};

export function normaliseFootballAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-GB")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateFootballFacts(facts: FootballFact[]): FootballFactValidation {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const fact of facts) {
    if (!fact.id.trim()) errors.push("A fact is missing its stable ID.");
    else if (ids.has(fact.id)) errors.push("Duplicate fact ID: " + fact.id);
    ids.add(fact.id);

    if (!fact.prompt.trim()) errors.push(fact.id + ": missing prompt.");
    if (!fact.answer.canonical.trim()) errors.push(fact.id + ": missing canonical answer.");
    if (!fact.answer.accepted.some(value => normaliseFootballAnswer(value) === normaliseFootballAnswer(fact.answer.canonical))) {
      errors.push(fact.id + ": accepted answers must include the canonical answer.");
    }
    if (!fact.explanation.trim()) errors.push(fact.id + ": missing answer explanation.");
    if (!fact.competition.trim() || !fact.scope.trim()) errors.push(fact.id + ": competition and statistical scope are required.");
    if (!fact.validAsOf.trim()) errors.push(fact.id + ": missing date/season cutoff.");
    if (!fact.source.name.trim() || !/^https?:\/\//.test(fact.source.url) || !fact.source.checkedAt.trim()) {
      errors.push(fact.id + ": source name, URL and checked date are required.");
    }
    if (!fact.gameModes.length) errors.push(fact.id + ": must be assigned to at least one game format.");
    if (fact.reviewStatus !== "verified") errors.push(fact.id + ": cannot enter a live pack before review is complete.");
    const answers = [fact.answer, ...(fact.additionalAnswers ?? [])];
    for (const answer of answers) {
      const accepted = answer.accepted.map(normaliseFootballAnswer).filter(Boolean);
      if (!accepted.length || new Set(accepted).size !== accepted.length) {
        errors.push(fact.id + ": accepted answer aliases are empty or duplicated.");
      }
    }
    if (fact.options) {
      const options = fact.options.map(normaliseFootballAnswer);
      if (options.length < 2 || new Set(options).size !== options.length) {
        errors.push(fact.id + ": multiple-choice options must be distinct.");
      }
      if (!options.includes(normaliseFootballAnswer(fact.answer.canonical))) {
        errors.push(fact.id + ": multiple-choice options do not include the canonical answer.");
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
