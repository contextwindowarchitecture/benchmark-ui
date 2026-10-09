// Pure selectors for the Domain 1 overview (ui-plan.md 8.1): the headline metrics picked out of
// the two summaries by id, the ungated summarizer metrics, the reason codes exercised, and the
// median scaling exponents the write-up tabulates. Nothing here judges anything: the producer's
// statuses are carried, counts are counted, and a median is a median of the producer's fits.

import { median } from "d3-array"

import type { CoverageV1, PerfSummaryV1, SummaryV1 } from "@/data/schema/generated"
import { ADAPTER_IDS, orderAdapters } from "@/lib/adapters"

import type { SummaryMetric } from "./run"

export type HeadlineGroup = {
  id: string
  title: string
  /** The metric ids, in the order the write-up groups them. */
  ids: readonly string[]
}

/** The write-up's grouping of the headline metrics (ui-plan.md 8.1, item 2). */
export const HEADLINE_GROUPS: readonly HeadlineGroup[] = [
  {
    id: "determinism",
    title: "Determinism",
    ids: ["s2.decision_invariance", "s2.payload_invariance", "s2.trace_invariance"],
  },
  {
    id: "agreement",
    title: "Agreement",
    ids: ["s1.differential.agreement", "s5.agreement", "s7.agreement"],
  },
  {
    id: "protected",
    title: "Protected preservation and refusal",
    ids: ["s7.protected_preserved", "s7.refusal_correct", "s8.label_rate"],
  },
  { id: "crash-free", title: "Crash-free", ids: ["s5.crash_free"] },
  { id: "metamorphic", title: "Metamorphic relations", ids: ["s4.pass_rate"] },
  { id: "purity", title: "Purity", ids: ["s10.network_violations", "s10.file_writes"] },
  { id: "goldens", title: "Goldens", ids: ["s12.golden_match", "s12.regressions"] },
]

export type MetricSource = { runId: string; summary: SummaryV1 }

/** One headline metric: its entries (one cross-adapter, or one per adapter) and the run they are from. */
export type HeadlineMetric = {
  id: string
  label: string
  unit: SummaryMetric["unit"]
  description: string
  runId: string
  /** True when the metric is judged once across adapters (`adapter: null`). */
  cross: boolean
  entries: SummaryMetric[]
}

export type HeadlineGroupView = {
  group: HeadlineGroup
  metrics: HeadlineMetric[]
  /** Ids the group names that no source carries, so the page can say which run would. */
  missing: string[]
}

function metricsById(sources: readonly MetricSource[], id: string): HeadlineMetric | undefined {
  for (const source of sources) {
    const entries = source.summary.metrics.filter((metric) => metric.id === id)
    const first = entries[0]
    if (!first) continue
    const cross = entries.every((metric) => metric.adapter === null)
    const order = (adapter: string | null) =>
      adapter === null ? -1 : orderAdapters([...ADAPTER_IDS, adapter]).indexOf(adapter)
    return {
      id,
      label: first.label,
      unit: first.unit,
      description: first.description,
      runId: source.runId,
      cross,
      entries: [...entries].sort((a, b) => order(a.adapter) - order(b.adapter)),
    }
  }
  return undefined
}

/** The headline groups filled from the sources in order; the first source that has an id wins. */
export function headlineMetrics(sources: readonly MetricSource[]): HeadlineGroupView[] {
  return HEADLINE_GROUPS.map((group) => {
    const metrics: HeadlineMetric[] = []
    const missing: string[] = []
    for (const id of group.ids) {
      const metric = metricsById(sources, id)
      if (metric) metrics.push(metric)
      else missing.push(id)
    }
    return { group, metrics, missing }
  })
}

/** The suite a headline id belongs to, from its prefix (`s7.agreement` → `S7`). */
export function suiteOfMetricId(id: string): string {
  const match = /^s(\d+)\./.exec(id)
  return match ? `S${match[1]}` : "?"
}

/** The summarizer's `info` metrics (ui-plan.md 8.1): measured, visibly ungated, in their own group. */
export function ungatedSummarizerMetrics(sources: readonly MetricSource[]): HeadlineMetric[] {
  const ids: string[] = []
  for (const source of sources) {
    for (const metric of source.summary.metrics) {
      if (metric.suite === "S11" && metric.status === "info" && !ids.includes(metric.id))
        ids.push(metric.id)
    }
  }
  return ids.flatMap((id) => {
    const metric = metricsById(sources, id)
    return metric ? [metric] : []
  })
}

export type ReasonsExercised = { exercised: number; total: number; unknown: number }

/** How many of the contract's reason codes any adapter exercised in the run (from coverage.json). */
export function reasonsExercised(coverage: CoverageV1): ReasonsExercised {
  let exercised = 0
  for (const reason of coverage.reasons) {
    const any = Object.values(reason.by_adapter).some(
      (cell) => cell !== undefined && cell.exercised > 0,
    )
    if (any) exercised += 1
  }
  return { exercised, total: coverage.reasons.length, unknown: coverage.unknown_reasons.length }
}

export type ExponentRow = {
  adapter: string
  /** The median in-process exponent over shapes with the budget at the candidates' size. */
  noPressure: number | null
  /** The median with the budget at a tenth of the candidates' tokens. */
  pressure: number | null
  /** How many shapes each median is over. */
  shapes: { noPressure: number; pressure: number }
  /** The fewest points any of those fits used. */
  fewestPoints: number | null
}

export const EXPONENT_SERIES = "diagonal"
export const EXPONENT_METHOD = "inprocess"
export const NO_PRESSURE_LABEL = "ratio:1.0"
export const PRESSURE_LABEL = "ratio:0.1"

/**
 * The write-up's table of in-process scaling exponents, median over shapes, per adapter: the
 * `diagonal` series (candidates and tokens growing together) with the in-process method, at the
 * two budget labels. Each fit's exponent is the harness's; the median is this view's, and the
 * table says so.
 */
export function medianExponents(perf: PerfSummaryV1): ExponentRow[] {
  const adapters = orderAdapters([...new Set(perf.fits.map((fit) => fit.adapter))])
  return adapters.map((adapter) => {
    const pick = (label: string) =>
      perf.fits.filter(
        (fit) =>
          fit.adapter === adapter &&
          fit.series === EXPONENT_SERIES &&
          fit.method === EXPONENT_METHOD &&
          fit.label === label,
      )
    const none = pick(NO_PRESSURE_LABEL)
    const some = pick(PRESSURE_LABEL)
    const points = [...none, ...some].map((fit) => fit.points)
    return {
      adapter,
      noPressure: median(none, (fit) => fit.exponent) ?? null,
      pressure: median(some, (fit) => fit.exponent) ?? null,
      shapes: { noPressure: none.length, pressure: some.length },
      fewestPoints: points.length > 0 ? Math.min(...points) : null,
    }
  })
}

/** How many suites of a summary pass, for the home page's one-line headline. */
export function suitesPassing(summary: SummaryV1): { passed: number; total: number } {
  return {
    passed: summary.suites.filter((suite) => suite.status === "pass").length,
    total: summary.suites.length,
  }
}
