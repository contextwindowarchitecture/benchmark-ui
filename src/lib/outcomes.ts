// The answer outcomes the records carry (ui-plan.md 4.1): not statuses, so not badges. The fault
// outcomes mean the adapter did not answer; the rest are answers the suites judge.

export const OUTCOMES = [
  "assembled",
  "refused",
  "rejected",
  "unsupported",
  "crashed",
  "timeout",
  "invalid_output",
] as const

export type OutcomeValue = (typeof OUTCOMES)[number]

/** Outcomes that mean the adapter faulted rather than answered. */
export const FAULT_OUTCOMES: readonly OutcomeValue[] = ["crashed", "timeout", "invalid_output"]

export function isFaultOutcome(outcome: string): boolean {
  return (FAULT_OUTCOMES as readonly string[]).includes(outcome)
}

const LABELS: Record<OutcomeValue, string> = {
  assembled: "assembled",
  refused: "refused",
  rejected: "rejected",
  unsupported: "unsupported",
  crashed: "crashed",
  timeout: "timeout",
  invalid_output: "invalid output",
}

/** An outcome's label; an outcome the vocabulary does not know keeps its own text. */
export function outcomeLabel(outcome: string): string {
  return (LABELS as Record<string, string>)[outcome] ?? outcome
}
