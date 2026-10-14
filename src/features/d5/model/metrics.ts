// Pure selectors over Domain 5's metrics (the UI-D5 plan): the summary's typed `metrics[]`, in
// Domain 2's shape (arm, family, tier, a value with its fraction and an interval where the harness
// computed one). Two of the harness's ways of writing a metric are read through one function each,
// so each is one change when the harness changes (ui-plan.md 14, asks 21 and 22): a paired
// difference names both its arms in `arm` ("b vs a"), and S5's rates carry `suite: "S2"`.

import { armGroup, compareArms } from "@/content/d5/vocabulary"
import type { D5SummaryV1 } from "@/data/schema/generated"
import { compareSuites } from "@/features/d1/model/runs"
import type { ArmOrder } from "@/features/shared/vocabulary"

export type D5Metric = D5SummaryV1["metrics"][number]

/** Domain 5's arm order and groups, for the shared selectors. */
export const D5_ARM_ORDER: ArmOrder = { groupOf: armGroup, compare: compareArms }

/**
 * The suite a metric belongs to, by its id's prefix (`s5.asr` is S5's): the harness files S5's
 * rates under S2 (ask 22), and every id names its suite.
 */
export function suiteOfMetric(metric: Pick<D5Metric, "id" | "suite">): string | null {
  const prefix = /^s([0-9]+)\./.exec(metric.id)
  return prefix ? `S${prefix[1]}` : metric.suite
}

/** The run's metrics, each filed under the suite its id names. */
export function d5Metrics(metrics: readonly D5Metric[]): D5Metric[] {
  return metrics.map((metric) => {
    const suite = suiteOfMetric(metric)
    return suite === metric.suite ? metric : { ...metric, suite }
  })
}

/** A paired difference's two arms: b less the reference a. */
export type Pair = { arm: string; reference: string }

/** The arms of a paired metric's `arm` ("cwa vs xml-unescaped"); null when it is not a pair. */
export function pairOf(arm: string | null): Pair | null {
  if (!arm) return null
  const parts = arm.split(" vs ")
  return parts.length === 2 && parts[0] && parts[1] ? { arm: parts[0], reference: parts[1] } : null
}

/** Whether a metric is a paired difference rather than one arm's value. */
export const isPaired = (metric: Pick<D5Metric, "arm">) => pairOf(metric.arm) !== null

/** A suite's metrics measured across every arm and tier: the gates and the counts. */
export function suiteGateMetrics(metrics: readonly D5Metric[], suite: string): D5Metric[] {
  return metrics.filter((m) => m.suite === suite && m.arm === null && m.tier === null)
}

/** One arm's metrics with no tier, as a table: arms down, metric ids across. */
export type ArmMetricTable = {
  ids: { id: string; label: string; description: string }[]
  arms: string[]
  cell(arm: string, id: string): D5Metric | undefined
}

/**
 * A suite's per-arm metrics that carry no tier, laid out by arm and metric id; `only` keeps those
 * ids only, in that order.
 */
export function armMetricTable(
  metrics: readonly D5Metric[],
  suite: string,
  only?: readonly string[],
): ArmMetricTable | null {
  const chosen = metrics
    .filter(
      (m) =>
        m.suite === suite &&
        m.arm !== null &&
        m.tier === null &&
        !isPaired(m) &&
        (!only || only.includes(m.id)),
    )
    .sort((a, b) => (only ? only.indexOf(a.id) - only.indexOf(b.id) : 0))
  if (chosen.length === 0) return null
  const ids: ArmMetricTable["ids"] = []
  for (const metric of chosen) {
    if (!ids.some((entry) => entry.id === metric.id)) {
      ids.push({ id: metric.id, label: metric.label, description: metric.description })
    }
  }
  const cells = new Map(chosen.map((m) => [`${m.arm}\u0000${m.id}`, m]))
  return {
    ids,
    arms: [...new Set(chosen.map((m) => m.arm as string))].sort(compareArms),
    cell: (arm, id) => cells.get(`${arm}\u0000${id}`),
  }
}

/** The ids of a suite's per-arm metrics that carry a tier, in the summary's order. */
export function tieredMetricIds(metrics: readonly D5Metric[], suite: string): string[] {
  const ids: string[] = []
  for (const m of metrics) {
    if (
      m.suite === suite &&
      m.arm !== null &&
      m.tier !== null &&
      !isPaired(m) &&
      !ids.includes(m.id)
    ) {
      ids.push(m.id)
    }
  }
  return ids
}

/** A suite's paired differences, in the summary's order. */
export function pairedMetrics(
  metrics: readonly D5Metric[],
  suite: string,
): { metric: D5Metric; pair: Pair }[] {
  return metrics.flatMap((metric) => {
    const pair = metric.suite === suite ? pairOf(metric.arm) : null
    return pair ? [{ metric, pair }] : []
  })
}

/** The suites a run's metrics name, in suite order. */
export function metricSuites(metrics: readonly D5Metric[]): string[] {
  return [...new Set(metrics.flatMap((m) => (m.suite ? [m.suite] : [])))].sort(compareSuites)
}
