// Pure selectors for Domain 2's overview (the UI-D2 plan; ui-plan.md 7.1): the evidence each panel
// draws, from the typed metrics of the runs the composite reads each suite from and, since
// harness ask 13, from the suite summaries' typed by_arm blocks. Nothing is computed that the
// harness did not measure: a panel takes the producer's values, intervals and judgments.

import { armGroup, compareArms, type ArmGroup } from "@/content/d2/vocabulary"
import type { ArmRow } from "@/components/charts/arm-plot-geometry"
import type { TierSeries } from "@/components/charts/tier-lines-geometry"

import { byArmAndTier, type ArmBlock, type Paired } from "./blocks"
import { unsentFiledAsSent } from "./metric-text"
import { armPoints, compareTiers, crossArm, metricsOf, parseTier, type D2Metric } from "./metrics"

/** The arms the write-up compares the others with. */
export const REFERENCE_ARMS = { conversations: "truncate-pinned", documents: "rag" } as const

export type ArmRowWithMetrics = ArmRow & {
  group: ArmGroup
  metric: D2Metric
  /** The metric the backdrop bar is, when there is one. */
  backdropMetric?: D2Metric
  /** The tier the value is from: the budget, or no budget for an upper bound. */
  tier: string
}

/**
 * Accuracy per arm at a budget, with its interval, and behind it the share of the arm's probes
 * whose needed facts were in the payload at that budget (S1's fact-in-payload, when the S1 run's
 * metrics are given): the write-up's attribution, from typed metrics.
 */
export function aptitudeRows(
  s2: readonly D2Metric[],
  budget: string,
  s1: readonly D2Metric[] = [],
): ArmRowWithMetrics[] {
  const facts = new Map(
    metricsOf(s1, "s1.fact_in_payload")
      .filter((metric) => metric.tier === budget && metric.family === null && metric.arm !== null)
      .map((metric) => [metric.arm as string, metric]),
  )
  return armPoints(s2, "s2.aptitude", budget).map((point) => {
    const fact = facts.get(point.arm)
    return {
      id: point.arm,
      group: point.group,
      tier: point.tier,
      value: point.metric.value,
      low: point.metric.interval?.low ?? null,
      high: point.metric.interval?.high ?? null,
      backdrop: fact?.value ?? null,
      metric: point.metric,
      ...(fact ? { backdropMetric: fact } : {}),
    }
  })
}

/** One value per arm at a budget, with its interval when the harness computed one. */
export function valueRows(
  metrics: readonly D2Metric[],
  id: string,
  budget: string,
): ArmRowWithMetrics[] {
  return armPoints(metrics, id, budget).map((point) => ({
    id: point.arm,
    group: point.group,
    tier: point.tier,
    value: point.metric.value,
    low: point.metric.interval?.low ?? null,
    high: point.metric.interval?.high ?? null,
    metric: point.metric,
  }))
}

/** S4's accuracy per arm over the corpus tiers, one series per arm in the write-up's order. */
export function longContextSeries(metrics: readonly D2Metric[]): {
  series: TierSeries[]
  metrics: Map<string, Map<string, D2Metric>>
  tiers: string[]
} {
  const chosen = metricsOf(metrics, "s4.accuracy").filter(
    (metric) =>
      metric.arm !== null && metric.tier !== null && parseTier(metric.tier).kind === "corpus",
  )
  const byArm = new Map<string, Map<string, D2Metric>>()
  for (const metric of chosen) {
    const arm = metric.arm as string
    const tiers = byArm.get(arm) ?? new Map<string, D2Metric>()
    tiers.set(metric.tier as string, metric)
    byArm.set(arm, tiers)
  }
  const arms = [...byArm.keys()].sort(compareArms)
  const tiers = [...new Set(chosen.map((metric) => metric.tier as string))].sort(compareTiers)
  return {
    series: arms.map((arm) => ({
      id: arm,
      points: tiers.map((tier) => ({
        tier,
        size: parseTier(tier).value ?? 0,
        value: byArm.get(arm)?.get(tier)?.value ?? null,
      })),
    })),
    metrics: byArm,
    tiers,
  }
}

/** The model in the loop: each arm's accuracy and its difference from the scripted result. */
export function loopRows(
  metrics: readonly D2Metric[],
): { arm: string; group: ArmGroup; aptitude: D2Metric; against: D2Metric | undefined }[] {
  const against = new Map(
    metricsOf(metrics, "s6.against_scripted").map((metric) => [metric.arm, metric]),
  )
  return metricsOf(metrics, "s6.aptitude")
    .filter((metric) => metric.arm !== null)
    .sort((a, b) => compareArms(a.arm as string, b.arm as string))
    .map((metric) => ({
      arm: metric.arm as string,
      group: armGroup(metric.arm as string),
      aptitude: metric,
      against: against.get(metric.arm),
    }))
}

/** The checks the evidence passed, by the id the harness gives each, in the order to read them. */
export const CHECK_IDS = [
  "s1.agreement",
  "s1.audit",
  "s1.prediction",
  "s1.fact_oracle",
  "s1.baseline_fact_oracle",
  "s1.gate",
  "s0.grader",
  "s0.plant",
  "s0.replay",
  "s0.fact",
  "s0.baseline",
  "s5.budget_overruns",
  "s7.golden_match",
] as const

export type CheckSource = { suite: string; runId: string; metrics: readonly D2Metric[] }

/** Each check's metric from the run its suite is read from; a check no run measured is left out. */
export function checks(sources: readonly CheckSource[]): { runId: string; metric: D2Metric }[] {
  return CHECK_IDS.flatMap((id) => {
    const suite = `S${id.slice(1, id.indexOf("."))}`
    const source = sources.find((candidate) => candidate.suite === suite)
    const metric = source ? crossArm(source.metrics, id) : undefined
    return source && metric ? [{ runId: source.runId, metric }] : []
  })
}

export type PairedRow = ArmRow & { group: ArmGroup; tier: string; paired: Paired }

/**
 * Each arm's paired difference from the reference arm at a tier, for a chart: the harness's
 * mean per-observation difference with its interval, in the write-up's arm order. The reference
 * arm and the upper bounds, which are not paired, are left out; the chart's rule at zero is the
 * reference.
 */
export function pairedRows(
  entries: readonly { arm: string; tier: string; paired: Paired | null }[],
  tier: string,
): PairedRow[] {
  return entries
    .filter((entry) => entry.tier === tier && entry.paired !== null)
    .sort((a, b) => compareArms(a.arm, b.arm))
    .map((entry) => {
      const paired = entry.paired as Paired
      return {
        id: entry.arm,
        group: armGroup(entry.arm),
        tier: entry.tier,
        value: paired.difference,
        low: paired.interval.low,
        high: paired.interval.high,
        paired,
      }
    })
}

export type AttributionRow = {
  arm: string
  group: ArmGroup
  /** The tier the row is from: the chosen one, or no budget for an upper bound. */
  tier: string
  given: ArmBlock["given"]
  /**
   * The arm's answers that reached no model (overflows, refusals) yet sit under "facts sent", as a
   * run from before the harness filed them as not sent shows them; null when there are none.
   */
  filedAsSent: { count: number; atLeast: boolean } | null
}

/**
 * Correct answers with the needed facts sent and without, per arm at a tier; an upper bound,
 * which has no budget, at its own. Arms in the write-up's order.
 */
export function attributionRows(entries: readonly ArmBlock[], tier: string): AttributionRow[] {
  const layout = byArmAndTier(entries)
  return layout.arms.flatMap((arm) => {
    const entry = layout.at(arm.id, tier) ?? layout.at(arm.id, "control")
    return entry
      ? [
          {
            arm: arm.id,
            group: arm.group,
            tier: entry.tier,
            given: entry.given,
            filedAsSent: unsentFiledAsSent(entry.verdicts, entry.given),
          },
        ]
      : []
  })
}
