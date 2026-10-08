// The status vocabulary (DESIGN.md 5; ui-plan.md 4.1), mapped once onto the semantic tones the
// tokens define, with a label and an icon per status, so every badge carries more than color.

import {
  ArrowRightLeft,
  Ban,
  Check,
  CircleDashed,
  Crosshair,
  Equal,
  Flag,
  Info,
  ListTodo,
  LoaderCircle,
  Minus,
  OctagonAlert,
  Plus,
  ShieldCheck,
  TrendingDown,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react"

/** Outcome statuses: a run, a suite, or a suite for one adapter. */
export const OUTCOME_STATUSES = ["pass", "fail", "partial", "error"] as const
/** Judgment statuses: a metric the producer measured but did not gate, or did not measure. */
export const JUDGMENT_STATUSES = ["info", "na", "not-run"] as const
/** Change verdicts: a CI report against the previous run of its profile. */
export const CHANGE_VERDICTS = ["baseline", "unchanged", "changed", "regressed"] as const
/** Row verdicts: what a suite concluded about one judged row (ui-plan.md 4.1). */
export const ROW_VERDICTS = ["passed", "failed", "skipped", "rejected", "triage"] as const
/** Golden drift: how an answer compares with the adopted golden (S12). */
export const GOLDEN_DRIFTS = ["match", "spec_change", "regression", "new"] as const
/** The self-check's mutants (S0): killed by a check, or survived every check. */
export const MUTANT_STATUSES = ["killed", "survived"] as const
/** The rest of the closed vocabulary the records carry. */
export const OTHER_STATUSES = ["running", "unavailable", "warning"] as const

export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number]
export type JudgmentStatus = (typeof JUDGMENT_STATUSES)[number]
export type ChangeVerdict = (typeof CHANGE_VERDICTS)[number]
export type RowVerdict = (typeof ROW_VERDICTS)[number]
export type GoldenDrift = (typeof GOLDEN_DRIFTS)[number]
export type MutantStatus = (typeof MUTANT_STATUSES)[number]
export type Status =
  | OutcomeStatus
  | JudgmentStatus
  | ChangeVerdict
  | RowVerdict
  | GoldenDrift
  | MutantStatus
  | (typeof OTHER_STATUSES)[number]

export type Tone = "success" | "destructive" | "warning" | "info" | "muted"

export type StatusStyle = { tone: Tone; label: string; icon: LucideIcon }

export const STATUS_STYLES: Record<Status, StatusStyle> = {
  pass: { tone: "success", label: "pass", icon: Check },
  fail: { tone: "destructive", label: "fail", icon: X },
  partial: { tone: "warning", label: "partial", icon: CircleDashed },
  error: { tone: "destructive", label: "error", icon: OctagonAlert },
  running: { tone: "info", label: "running", icon: LoaderCircle },
  info: { tone: "info", label: "info", icon: Info },
  na: { tone: "muted", label: "not measured", icon: Minus },
  "not-run": { tone: "muted", label: "not run", icon: CircleDashed },
  unavailable: { tone: "muted", label: "unavailable", icon: Ban },
  warning: { tone: "warning", label: "warning", icon: TriangleAlert },
  baseline: { tone: "muted", label: "baseline", icon: Flag },
  unchanged: { tone: "success", label: "unchanged", icon: Equal },
  changed: { tone: "warning", label: "changed", icon: ArrowRightLeft },
  regressed: { tone: "destructive", label: "regressed", icon: TrendingDown },
  // Row verdicts. A rejection case the adapter rejected is what the suite expected: `rejected`
  // is a passing verdict, while the outcome `rejected` on an ordinary case is not (Outcome).
  passed: { tone: "success", label: "passed", icon: Check },
  failed: { tone: "destructive", label: "failed", icon: X },
  skipped: { tone: "muted", label: "skipped", icon: CircleDashed },
  rejected: { tone: "success", label: "rejected", icon: ShieldCheck },
  triage: { tone: "warning", label: "triage", icon: ListTodo },
  // Golden drift (S12). A spec change is expected movement, a regression is not.
  match: { tone: "success", label: "match", icon: Equal },
  spec_change: { tone: "info", label: "spec change", icon: ArrowRightLeft },
  regression: { tone: "destructive", label: "regression", icon: TrendingDown },
  new: { tone: "info", label: "new", icon: Plus },
  // Mutants (S0): a killed mutant is the auditor working; a survivor is a gap it did not catch.
  killed: { tone: "success", label: "killed", icon: Crosshair },
  survived: { tone: "warning", label: "survived", icon: TriangleAlert },
}

export function isStatus(value: string): value is Status {
  return Object.hasOwn(STATUS_STYLES, value)
}

/** Literal class strings per tone (DESIGN.md 5: no class names built from data). */
export const TONE_CLASSES: Record<Tone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  destructive: "border-failure/40 bg-failure/10 text-failure",
  warning: "border-warning/50 bg-warning/15 text-warning",
  info: "border-info/40 bg-info/10 text-info",
  muted: "border-border bg-transparent text-muted-foreground",
}

export const TONE_TEXT_CLASSES: Record<Tone, string> = {
  success: "text-success",
  destructive: "text-failure",
  warning: "text-warning",
  info: "text-info",
  muted: "text-muted-foreground",
}
