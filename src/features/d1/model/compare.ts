// Comparing two runs (ui-plan.md 8.10; DESIGN.md 6.4): the harness's own report when it compared
// exactly this pair, else the same sections computed here from the two summaries and the runs
// index, said to be computed. Nothing is re-judged: statuses and values are the producer's, and
// this module only lines them up.

import type { CiReportV1, SummaryV1 } from "@/data/schema/generated"
import { ADAPTER_IDS, orderAdapters } from "@/lib/adapters"

import type { SummaryMetric } from "./run"
import { compareSuites, type RunEntry } from "./runs"

export type RunSide = { runId: string; summary: SummaryV1; entry?: RunEntry | undefined }

export type SuiteStatus = SummaryV1["suites"][number]["status"]

export type SuiteChange = {
  id: string
  title: string
  from: SuiteStatus | null
  to: SuiteStatus | null
  changed: boolean
}

export type MetricSide = { value: number | null; status: SummaryMetric["status"] }

export type MetricChange = {
  id: string
  adapter: string | null
  label: string
  unit: SummaryMetric["unit"]
  from: MetricSide | null
  to: MetricSide | null
}

export type FindingsChange = { suite: string; from: number; to: number }

export type Bump = { what: string; from: string | null; to: string | null }

export type Comparison = {
  status: { from: SummaryV1["status"]; to: SummaryV1["status"] }
  /** Commits that differ between the two runs, from the runs index; empty when it names none. */
  bumps: Bump[]
  /** Every suite of either run, in suite order, the changed ones flagged. */
  suites: SuiteChange[]
  /** Metrics whose value or status differs, or that only one run carries. */
  metrics: MetricChange[]
  /** Findings per suite where either run counts any. */
  findings: FindingsChange[]
  totals: { from: number; to: number }
}

/** Whether the harness's report on `to` compares it with `from`. */
export function harnessCompared(ci: CiReportV1 | undefined, from: string): boolean {
  return ci?.previous?.run_id === from
}

export function computeComparison(from: RunSide, to: RunSide): Comparison {
  return {
    status: { from: from.summary.status, to: to.summary.status },
    bumps: bumps(from.entry, to.entry),
    suites: suiteChanges(from.summary, to.summary),
    metrics: metricChanges(from.summary.metrics, to.summary.metrics),
    findings: findingsChanges(from.summary, to.summary),
    totals: { from: from.summary.findings.total, to: to.summary.findings.total },
  }
}

function bumps(from: RunEntry | undefined, to: RunEntry | undefined): Bump[] {
  const a = from?.commits ?? {}
  const b = to?.commits ?? {}
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
  const adapters = orderAdapters(keys.filter((key) => key !== "contract"))
  const ordered = [...(keys.includes("contract") ? ["contract"] : []), ...adapters]
  return ordered.flatMap((what) => {
    const before = a[what] ?? null
    const after = b[what] ?? null
    return before === after ? [] : [{ what, from: before, to: after }]
  })
}

function suiteChanges(from: SummaryV1, to: SummaryV1): SuiteChange[] {
  const a = new Map(from.suites.map((suite) => [suite.id, suite]))
  const b = new Map(to.suites.map((suite) => [suite.id, suite]))
  const ids = [...new Set([...a.keys(), ...b.keys()])].sort(compareSuites)
  return ids.map((id) => {
    const before = a.get(id)
    const after = b.get(id)
    return {
      id,
      title: after?.title ?? before?.title ?? id,
      from: before?.status ?? null,
      to: after?.status ?? null,
      changed: (before?.status ?? null) !== (after?.status ?? null),
    }
  })
}

const key = (metric: SummaryMetric) => `${metric.id}|${metric.adapter ?? ""}`

function metricChanges(from: SummaryMetric[], to: SummaryMetric[]): MetricChange[] {
  const a = new Map(from.map((metric) => [key(metric), metric]))
  const b = new Map(to.map((metric) => [key(metric), metric]))
  const keys = [...new Set([...a.keys(), ...b.keys()])]
  const order = (adapter: string | null) =>
    adapter === null ? -1 : orderAdapters([...ADAPTER_IDS, adapter]).indexOf(adapter)
  const changes: MetricChange[] = []
  for (const k of keys) {
    const before = a.get(k)
    const after = b.get(k)
    const moved =
      !before || !after || before.value !== after.value || before.status !== after.status
    if (!moved) continue
    const any = (after ?? before) as SummaryMetric
    changes.push({
      id: any.id,
      adapter: any.adapter,
      label: any.label,
      unit: any.unit,
      from: before ? { value: before.value, status: before.status } : null,
      to: after ? { value: after.value, status: after.status } : null,
    })
  }
  return changes.sort(
    (x, y) =>
      compareSuites(suiteOf(x.id), suiteOf(y.id)) ||
      x.id.localeCompare(y.id) ||
      order(x.adapter) - order(y.adapter),
  )
}

function suiteOf(id: string): string {
  const match = /^s(\d+)\./.exec(id)
  return match ? `S${match[1]}` : id
}

function findingsChanges(from: SummaryV1, to: SummaryV1): FindingsChange[] {
  const suites = [
    ...new Set([...Object.keys(from.findings.by_suite), ...Object.keys(to.findings.by_suite)]),
  ].sort(compareSuites)
  return suites.flatMap((suite) => {
    const before = from.findings.by_suite[suite] ?? 0
    const after = to.findings.by_suite[suite] ?? 0
    return before === 0 && after === 0 ? [] : [{ suite, from: before, to: after }]
  })
}
