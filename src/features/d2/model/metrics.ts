// Pure selectors over Domain 2's metrics (the UI-D2 plan): the summary's typed `metrics[]`, where a
// metric is measured per arm, per family and per tier, with an interval where the harness computed
// one. Nothing here re-judges a metric or reads an open block: values, statuses and intervals are
// the producer's, laid out by arm and tier.

import type { D2SummaryV1 } from "@/data/schema/generated"
import { armGroup, compareArms, type ArmGroup } from "@/content/d2/vocabulary"
import type { ArmOrder } from "@/features/shared/vocabulary"

/** An order over a metric's tiers; Domain 2's by default (compareTiers). */
export type TierCompare = (a: string, b: string) => number

/** Domain 2's arm order and groups, the selectors' default; Domain 5 passes its own. */
export const D2_ARM_ORDER: ArmOrder = { groupOf: armGroup, compare: compareArms }
import { formatCount } from "@/lib/format"

export type D2Metric = D2SummaryV1["metrics"][number]

/**
 * What a tier names: a budget in input tokens (`8192`), no budget (`control`), a ratio of the
 * snapshot's full size (`r0.50`, S1's frames), or a corpus as a multiple of the budget (`x4`, S4).
 */
export type TierKind = "budget" | "control" | "ratio" | "corpus" | "other"

export type Tier = { id: string; kind: TierKind; value: number | null }

export function parseTier(id: string): Tier {
  if (/^[0-9]+$/.test(id)) return { id, kind: "budget", value: Number(id) }
  if (id === "control") return { id, kind: "control", value: null }
  const ratio = /^r([0-9]+(?:\.[0-9]+)?)$/.exec(id)
  if (ratio) return { id, kind: "ratio", value: Number(ratio[1]) }
  const corpus = /^x([0-9]+(?:\.[0-9]+)?)$/.exec(id)
  if (corpus) return { id, kind: "corpus", value: Number(corpus[1]) }
  return { id, kind: "other", value: null }
}

const TIER_KIND_ORDER: Record<TierKind, number> = {
  budget: 0,
  ratio: 1,
  corpus: 2,
  control: 3,
  other: 4,
}

/**
 * Budgets from the tightest up, then ratios of the full size from the whole down (as S1 sweeps
 * them), then corpora from the smallest up, then no budget, then anything else by name.
 */
export function compareTiers(a: string, b: string): number {
  const ta = parseTier(a)
  const tb = parseTier(b)
  const kind = TIER_KIND_ORDER[ta.kind] - TIER_KIND_ORDER[tb.kind]
  if (kind !== 0) return kind
  if (ta.value !== null && tb.value !== null && ta.value !== tb.value) {
    return ta.kind === "ratio" ? tb.value - ta.value : ta.value - tb.value
  }
  return a.localeCompare(b)
}

/** A tier in words: "8,192 tokens", "no budget", "0.5 × full size", "4 × the budget". */
export function tierLabel(id: string): string {
  const tier = parseTier(id)
  switch (tier.kind) {
    case "budget":
      return `${formatCount(tier.value ?? 0)} tokens`
    case "control":
      return "no budget"
    case "ratio":
      return `${tier.value} × full size`
    case "corpus":
      return `${tier.value} × the budget`
    case "other":
      return id
  }
}

/** The metrics of one id, in the summary's order. */
export function metricsOf(metrics: readonly D2Metric[], id: string): D2Metric[] {
  return metrics.filter((metric) => metric.id === id)
}

/** The one metric of an id measured across every arm and tier (a gate count, a self-check). */
export function crossArm(metrics: readonly D2Metric[], id: string): D2Metric | undefined {
  return metrics.find((metric) => metric.id === id && metric.arm === null && metric.tier === null)
}

export type ArmTierTable = {
  id: string
  label: string
  unit: D2Metric["unit"]
  description: string
  /** The tiers the metric is measured at, in compareTiers order. */
  tiers: string[]
  /** The arms, in the write-up's order, with their groups. */
  arms: { id: string; group: ArmGroup }[]
  /** Whether any of its metrics carries an interval. */
  intervals: boolean
  cell(arm: string, tier: string): D2Metric | undefined
}

/**
 * One metric id laid out by arm and tier: the rows the write-up's tables have. `tiers` keeps the
 * tiers of the given kinds only (conversations' budgets, or the corpora), when given.
 */
export function armTierTable(
  metrics: readonly D2Metric[],
  id: string,
  options: { tierKinds?: readonly TierKind[]; order?: ArmOrder; compareTier?: TierCompare } = {},
): ArmTierTable | null {
  const chosen = metricsOf(metrics, id).filter(
    (metric) =>
      metric.arm !== null &&
      metric.tier !== null &&
      (options.tierKinds === undefined || options.tierKinds.includes(parseTier(metric.tier).kind)),
  )
  const first = chosen[0]
  if (!first) return null
  const cells = new Map(chosen.map((metric) => [`${metric.arm}\u0000${metric.tier}`, metric]))
  const tiers = [...new Set(chosen.map((metric) => metric.tier as string))].sort(
    options.compareTier ?? compareTiers,
  )
  const arms = [...new Set(chosen.map((metric) => metric.arm as string))]
    .sort((options.order ?? D2_ARM_ORDER).compare)
    .map((arm) => ({ id: arm, group: (options.order ?? D2_ARM_ORDER).groupOf(arm) }))
  return {
    id,
    label: first.label,
    unit: first.unit,
    description: first.description,
    tiers,
    arms,
    intervals: chosen.some((metric) => metric.interval != null),
    cell: (arm, tier) => cells.get(`${arm}\u0000${tier}`),
  }
}

/**
 * The budget the write-up leads with: the tightest budget S2 measured aptitude at, where budget
 * pressure is real. Null when S2 measured none.
 */
export function headlineBudget(metrics: readonly D2Metric[]): string | null {
  const budgets = metricsOf(metrics, "s2.aptitude")
    .map((metric) => metric.tier)
    .filter((tier): tier is string => tier !== null && parseTier(tier).kind === "budget")
    .sort(compareTiers)
  return budgets[0] ?? null
}

export type ArmPoint = {
  arm: string
  group: ArmGroup
  /** The tier the value is from: the chosen budget, or no budget for an upper bound. */
  tier: string
  metric: D2Metric
}

/**
 * One value per arm at a budget, for a chart: every arm measured at that tier, and the upper
 * bounds, which have no budget, at theirs. Arms in the write-up's order; a metric without a value
 * is left out (the table beside the chart shows it as not measured).
 */
export function armPoints(
  metrics: readonly D2Metric[],
  id: string,
  tier: string,
  order: ArmOrder = D2_ARM_ORDER,
): ArmPoint[] {
  const points: ArmPoint[] = []
  for (const metric of metricsOf(metrics, id)) {
    if (metric.arm === null || metric.tier === null || metric.value === null) continue
    if (metric.tier !== tier && metric.tier !== "control") continue
    points.push({ arm: metric.arm, group: order.groupOf(metric.arm), tier: metric.tier, metric })
  }
  return points.sort((a, b) => order.compare(a.arm, b.arm))
}

/** The metrics of a suite measured across every arm and tier: the gate and the counts. */
export function suiteGateMetrics(metrics: readonly D2Metric[], suite: string): D2Metric[] {
  return metrics.filter(
    (metric) => metric.suite === suite && metric.arm === null && metric.tier === null,
  )
}

/** The ids of a suite's metrics measured per arm, in the summary's order. */
export function suiteArmMetricIds(metrics: readonly D2Metric[], suite: string): string[] {
  const ids: string[] = []
  for (const metric of metrics) {
    if (metric.suite !== suite || metric.arm === null) continue
    if (!ids.includes(metric.id)) ids.push(metric.id)
  }
  return ids
}

/** Filters a run's metrics by suite, judgment, arm and a search over id, label, arm and tier. */
export function filterD2Metrics(
  metrics: readonly D2Metric[],
  filter: { suite?: string; status?: string; arm?: string; q?: string },
): D2Metric[] {
  const q = filter.q?.trim().toLowerCase()
  return metrics.filter(
    (metric) =>
      (!filter.suite || metric.suite === filter.suite) &&
      (!filter.status || metric.status === filter.status) &&
      (!filter.arm || metric.arm === filter.arm) &&
      (!q ||
        [metric.id, metric.label, metric.arm ?? "", metric.family ?? "", metric.tier ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  )
}
