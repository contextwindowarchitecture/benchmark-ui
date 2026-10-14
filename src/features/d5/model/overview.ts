// Pure selectors for Domain 5's overview and question pages (the UI-D5 plan): the evidence each
// panel draws, from the typed metrics of the run the composite reads each suite from. Nothing is
// computed that the harness did not measure: a panel takes the producer's values, intervals and
// judgments.

import type { TierSeries } from "@/components/charts/tier-lines-geometry"
import type { ArmRowWithMetrics } from "@/features/d2/model/overview"
import type { ArmOrder } from "@/features/shared/vocabulary"

import { D5_ARM_ORDER, isPaired, type D5Metric } from "./metrics"
import { d5TierSize } from "./tiers"

/**
 * One row per arm of a metric at one tier (null for the metrics Domain 5 writes with no tier),
 * with its interval, in the write-up's arm order; a pair or a metric without a value is left out.
 */
export function armRows(
  metrics: readonly D5Metric[],
  id: string,
  tier: string | null = null,
  order: ArmOrder = D5_ARM_ORDER,
): ArmRowWithMetrics[] {
  return metrics
    .filter(
      (m) => m.id === id && m.arm !== null && !isPaired(m) && m.tier === tier && m.value !== null,
    )
    .sort((a, b) => order.compare(a.arm as string, b.arm as string))
    .map((metric) => ({
      id: metric.arm as string,
      group: order.groupOf(metric.arm as string),
      tier: metric.tier ?? "",
      value: metric.value,
      low: metric.interval?.low ?? null,
      high: metric.interval?.high ?? null,
      metric,
    }))
}

/** The tiers a metric was measured at, in the order the harness wrote them. */
export function tiersOf(metrics: readonly D5Metric[], id: string): string[] {
  const tiers: string[] = []
  for (const m of metrics) {
    if (m.id === id && m.tier !== null && !tiers.includes(m.tier)) tiers.push(m.tier)
  }
  return tiers
}

/** The structural checks the overview leads with, by the harness's ids, in the order to read them. */
export const STRUCTURE_CHECK_IDS = [
  "s1.agreement",
  "s1.audit",
  "s1.prediction",
  "s1.structure",
  "s1.presence",
  "s1.exclusion",
  "s1.instructions_kept",
  "s1.gate",
  "s0.grader",
  "s0.attack_grader",
  "s7.golden_match",
] as const

/** Each check's metric across every arm and tier; a check no run measured is left out. */
export function structureChecks(
  sources: readonly { runId: string; metrics: readonly D5Metric[] }[],
): { runId: string; metric: D5Metric }[] {
  return STRUCTURE_CHECK_IDS.flatMap((id) => {
    for (const source of sources) {
      const metric = source.metrics.find((m) => m.id === id && m.arm === null && m.tier === null)
      if (metric) return [{ runId: source.runId, metric }]
    }
    return []
  })
}

/**
 * The adaptive attacker's held-out success at a budget beside the arm's static rate for the same
 * goal, per arm: the budget the address names, else the largest the run spent.
 */
export function adaptiveRows(
  metrics: readonly D5Metric[],
  budget?: string,
): {
  budget: string | null
  budgets: string[]
  rows: { arm: string; adaptive: D5Metric | undefined; static: D5Metric | undefined }[]
} {
  const budgets = tiersOf(metrics, "s4.asr_by_budget").sort((a, b) => Number(a) - Number(b))
  const chosen = budget && budgets.includes(budget) ? budget : (budgets.at(-1) ?? null)
  const arms = [
    ...new Set(
      metrics
        .filter((m) => (m.id === "s4.asr_by_budget" || m.id === "s4.asr_static") && m.arm)
        .map((m) => m.arm as string),
    ),
  ].sort(D5_ARM_ORDER.compare)
  return {
    budget: chosen,
    budgets,
    rows: arms.map((arm) => ({
      arm,
      adaptive: metrics.find(
        (m) => m.id === "s4.asr_by_budget" && m.arm === arm && m.tier === chosen,
      ),
      static: metrics.find((m) => m.id === "s4.asr_static" && m.arm === arm && m.tier === null),
    })),
  }
}

/** What reached the model as structure in a conventional payload: a metric by arm at a carrier. */
export function forgedRows(
  metrics: readonly D5Metric[],
): { arm: string; forged: D5Metric | undefined; markers: D5Metric | undefined }[] {
  const arms = [
    ...new Set(
      metrics
        .filter((m) => (m.id === "s1.forged" || m.id === "s1.raw_markers") && m.arm)
        .map((m) => m.arm as string),
    ),
  ].sort(D5_ARM_ORDER.compare)
  return arms.map((arm) => ({
    arm,
    forged: metrics.find((m) => m.id === "s1.forged" && m.arm === arm && m.tier === "tag"),
    markers: metrics.find((m) => m.id === "s1.raw_markers" && m.arm === arm && m.tier === "marker"),
  }))
}

/**
 * A metric over its sized tiers (lengths, budgets, bands), one series per arm in the write-up's
 * order, for small multiples; a tier without a size, or an arm without the metric there, is a gap.
 */
export function tierSeries(
  metrics: readonly D5Metric[],
  id: string,
): {
  series: TierSeries[]
  tiers: string[]
  cell(arm: string, tier: string): D5Metric | undefined
} {
  const chosen = metrics.filter(
    (m) => m.id === id && m.arm !== null && m.tier !== null && !isPaired(m),
  )
  const tiers = [...new Set(chosen.map((m) => m.tier as string))]
    .filter((tier) => d5TierSize(tier, id) !== null)
    .sort((a, b) => (d5TierSize(a, id) ?? 0) - (d5TierSize(b, id) ?? 0))
  const cells = new Map(chosen.map((m) => [`${m.arm}\u0000${m.tier}`, m]))
  const arms = [...new Set(chosen.map((m) => m.arm as string))].sort(D5_ARM_ORDER.compare)
  return {
    tiers,
    series: arms.map((arm) => ({
      id: arm,
      points: tiers.map((tier) => ({
        tier,
        size: d5TierSize(tier, id) ?? 0,
        value: cells.get(`${arm}\u0000${tier}`)?.value ?? null,
      })),
    })),
    cell: (arm, tier) => cells.get(`${arm}\u0000${tier}`),
  }
}
