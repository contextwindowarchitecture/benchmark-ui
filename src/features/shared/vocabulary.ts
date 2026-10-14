// The words a domain's arms, suites and tiers are shown with (UI-D5): Domains 2 and 5 send the
// model payloads built by arms, grouped the same three ways (conventional, a control, CWA) but with
// arms, labels and tiers of their own. A component that lists arms or names a tier asks the
// vocabulary of the current route's domain, so one table or plot serves both domains.

import {
  ARM_GROUPS as D2_GROUPS,
  armGroup as d2ArmGroup,
  armWords as d2ArmWords,
  compareArms as d2CompareArms,
  suiteWords as d2SuiteWords,
  type ArmGroup,
} from "@/content/d2/vocabulary"
import {
  ARM_GROUPS as D5_GROUPS,
  armGroup as d5ArmGroup,
  armWords as d5ArmWords,
  compareArms as d5CompareArms,
  suiteWords as d5SuiteWords,
} from "@/content/d5/vocabulary"
import { useResultsDomain } from "@/data/queries"
import {
  intervalLevel,
  intervalWords as d2IntervalWords,
  POINTS_OUT_OF_100,
  type PointsFormat,
} from "@/features/d2/model/metric-text"
import { tierLabel as d2TierLabel } from "@/features/d2/model/metrics"
import { suiteOfMetric } from "@/features/d5/model/metrics"
import { d5TierLabel } from "@/features/d5/model/tiers"
import { formatPointsDifference, formatPointsDifferenceInterval } from "@/lib/format"

export type { ArmGroup }

/** How a group's arms are marked: the accent for CWA, grey for conventional, an outline else. */
export type ArmTone = "accent" | "muted" | "outline"

export type ArmGroupWords = {
  id: ArmGroup
  label: string
  text: string
  /** The group in a legend: "upper bound, no budget". */
  legend: string
  /** The group beside an arm's id, for assistive technology: "upper bound". */
  name: string
  tone: ArmTone
}

/** The order and grouping of a domain's arms, for the pure selectors. */
export type ArmOrder = {
  groupOf(arm: string): ArmGroup
  compare(a: string, b: string): number
}

export type ArmVocabulary = ArmOrder & {
  /** The groups, in the order tables list them. */
  groups: readonly ArmGroupWords[]
  words(arm: string): { payload: string; role?: string } | undefined
  /** A tier in words; Domain 5's tiers mean what their metric means. */
  tierLabel(tier: string, metricId?: string): string
  suiteWords(suite: string): string | undefined
  /**
   * What a value in points is: Domain 2 writes points out of 100 (unreliability), Domain 5 a
   * difference of two rates as a fraction (its paired metrics; ask 21).
   */
  points: PointsFormat
  /** A metric's interval in words: "95% cluster-bootstrap interval over task instances". */
  intervalWords(metric: IntervalMetric): string | null
}

/** What naming a metric's interval needs. */
export type IntervalMetric = {
  id: string
  suite: string | null
  interval?: { level: number; method: string } | null
}

/**
 * What Domain 5's intervals cluster over, by suite, as its write-up states it: Domain 2's
 * statistics name every interval as over conversations (ask 23), and Domain 5 reuses them.
 */
const D5_CLUSTERS: Record<string, string> = {
  S2: "task instances",
  S3: "SEP cases and LLMail-Inject's submitting teams",
  S4: "task instances",
  S5: "task instances",
  S6: "conversations",
}

const D2_GROUP_MARKS: Record<ArmGroup, Pick<ArmGroupWords, "legend" | "name" | "tone">> = {
  control: { legend: "upper bound, no budget", name: "upper bound", tone: "outline" },
  conventional: { legend: "conventional baseline", name: "conventional", tone: "muted" },
  cwa: { legend: "CWA arm", name: "CWA", tone: "accent" },
}

const D5_GROUP_MARKS: Record<ArmGroup, Pick<ArmGroupWords, "legend" | "name" | "tone">> = {
  conventional: { legend: "conventional", name: "conventional", tone: "muted" },
  control: { legend: "the escaping control", name: "control", tone: "outline" },
  cwa: { legend: "CWA arm", name: "CWA", tone: "accent" },
}

export const D2_VOCABULARY: ArmVocabulary = {
  groups: D2_GROUPS.map((group) => ({ ...group, ...D2_GROUP_MARKS[group.id] })),
  groupOf: d2ArmGroup,
  compare: d2CompareArms,
  words: d2ArmWords,
  tierLabel: (tier) => d2TierLabel(tier),
  suiteWords: d2SuiteWords,
  points: POINTS_OUT_OF_100,
  intervalWords: (metric) => d2IntervalWords(metric.interval),
}

export const D5_VOCABULARY: ArmVocabulary = {
  groups: D5_GROUPS.map((group) => ({ ...group, ...D5_GROUP_MARKS[group.id] })),
  groupOf: d5ArmGroup,
  compare: d5CompareArms,
  words: d5ArmWords,
  tierLabel: d5TierLabel,
  suiteWords: d5SuiteWords,
  points: { value: formatPointsDifference, interval: formatPointsDifferenceInterval },
  intervalWords: (metric) => {
    if (!metric.interval) return null
    const over = D5_CLUSTERS[suiteOfMetric(metric) ?? ""]
    return `${intervalLevel(metric.interval.level)} cluster-bootstrap interval${over ? ` over ${over}` : ""}`
  },
}

/**
 * The vocabulary of the current route's domain. Domain 1 has no arms; its pages never ask, and
 * would get Domain 2's.
 */
export function useArmVocabulary(): ArmVocabulary {
  return useResultsDomain() === "d5" ? D5_VOCABULARY : D2_VOCABULARY
}
