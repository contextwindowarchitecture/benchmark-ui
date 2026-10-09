import type { RunIndexV1, SuiteSummaryV1 } from "@/data/schema/generated"

/** What every suite panel gets (ui-plan.md 8.4): the run, the suite summary and the run's index. */
export type SuitePanelProps = {
  runId: string
  suite: string
  summary: SuiteSummaryV1
  index: RunIndexV1
}

export type SuiteMetric = SuiteSummaryV1["metrics"][number]

/** The cross-adapter metrics with these ids, in the order given. */
export function metricsNamed(summary: SuiteSummaryV1, ids: readonly string[]): SuiteMetric[] {
  return ids.flatMap((id) => summary.metrics.filter((m) => m.id === id && m.adapter === null))
}

/** Every cross-adapter metric of the suite. */
export function crossMetrics(summary: SuiteSummaryV1): SuiteMetric[] {
  return summary.metrics.filter((m) => m.adapter === null)
}

/** The metrics with one id, one per adapter, in the summary's order. */
export function perAdapterMetrics(summary: SuiteSummaryV1, id: string): SuiteMetric[] {
  return summary.metrics.filter((m) => m.id === id && m.adapter !== null)
}
