// The status vocabulary (DESIGN.md 5; ui-plan.md 4.1), mapped once onto the semantic tones the
// tokens define, with a label and an icon per status, so every badge carries more than color.

import {
  ArrowRightLeft,
  Ban,
  Check,
  CircleDashed,
  Equal,
  Flag,
  Info,
  LoaderCircle,
  Minus,
  OctagonAlert,
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
/** The rest of the closed vocabulary the records carry. */
export const OTHER_STATUSES = ["running", "unavailable", "warning"] as const

export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number]
export type JudgmentStatus = (typeof JUDGMENT_STATUSES)[number]
export type ChangeVerdict = (typeof CHANGE_VERDICTS)[number]
export type Status =
  OutcomeStatus | JudgmentStatus | ChangeVerdict | (typeof OTHER_STATUSES)[number]

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
}

export function isStatus(value: string): value is Status {
  return Object.hasOwn(STATUS_STYLES, value)
}

/** Literal class strings per tone (DESIGN.md 5: no class names built from data). */
export const TONE_CLASSES: Record<Tone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  warning: "border-warning/50 bg-warning/15 text-warning",
  info: "border-info/40 bg-info/10 text-info",
  muted: "border-border bg-muted text-muted-foreground",
}

export const TONE_TEXT_CLASSES: Record<Tone, string> = {
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
  info: "text-info",
  muted: "text-muted-foreground",
}
