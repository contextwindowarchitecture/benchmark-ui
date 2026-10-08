// Pure selectors for the run page (ui-plan.md 8.3): warnings from the manifest, metric
// definitions from the summary, findings grouped, the file list annotated with what this build
// reads.

import type {
  CiReportV1,
  FindingV1,
  ManifestV1,
  RunIndexV1,
  SummaryV1,
} from "@/data/schema/generated"
import { isKnownKind, parseSchemaString, schemaStringOf } from "@/data/validate"
import { ADAPTER_IDS, orderAdapters } from "@/lib/adapters"
import { formatMetricValue, formatTarget } from "@/lib/format"
import type { MetricDefinition } from "@/lib/metric"

import { compareSuites } from "./runs"

export type ProvenanceWarning = { id: string; message: string }

/** Dirty checkouts and a contract commit other than the pinned one are warnings (ui-plan.md 8.3). */
export function provenanceWarnings(manifest: ManifestV1): ProvenanceWarning[] {
  const warnings: ProvenanceWarning[] = []
  const { contract } = manifest
  if (contract.commit !== null && contract.commit !== contract.pinned) {
    warnings.push({
      id: "contract-commit",
      message: `The contract checkout was at ${contract.commit.slice(0, 7)}, not the pinned ${contract.pinned.slice(0, 7)}.`,
    })
  }
  if (contract.commit === null) {
    warnings.push({
      id: "contract-unknown",
      message: "The contract checkout's commit is not recorded.",
    })
  }
  if (contract.dirty) {
    warnings.push({
      id: "contract-dirty",
      message: "The contract checkout had uncommitted changes.",
    })
  }
  for (const [id, adapter] of Object.entries(manifest.adapters)) {
    if (!adapter) continue
    if (adapter.dirty)
      warnings.push({ id: `${id}-dirty`, message: `The ${id} checkout had uncommitted changes.` })
    if (!adapter.available) {
      warnings.push({
        id: `${id}-unavailable`,
        message: `The ${id} adapter was unavailable${adapter.error ? `: ${adapter.error}` : "."}`,
      })
    }
    if (adapter.stale_artifacts && adapter.stale_artifacts.length > 0) {
      warnings.push({
        id: `${id}-stale`,
        message: `The ${id} build had stale artifacts: ${adapter.stale_artifacts.join(", ")}.`,
      })
    }
  }
  if (manifest.host_suspended_seconds > 0) {
    warnings.push({
      id: "host-suspended",
      message: `The host was suspended for ${manifest.host_suspended_seconds} s during the run; timings are unreliable.`,
    })
  }
  return warnings
}

export type AdapterProvenance = { id: string } & ManifestV1["adapters"][string]

/** The manifest's adapters in the fixed order, with any the identities do not know after them. */
export function adapterProvenance(manifest: ManifestV1): AdapterProvenance[] {
  const ids = orderAdapters(Object.keys(manifest.adapters))
  return ids.flatMap((id) => {
    const adapter = manifest.adapters[id]
    return adapter ? [{ id, ...adapter }] : []
  })
}

export type SummaryMetric = SummaryV1["metrics"][number]

/** A DESIGN.md 4.4 definition from a summary metric; the producer's judgment is carried, not made. */
export function metricDefinition(metric: SummaryMetric): MetricDefinition {
  return {
    id: metric.id,
    label: metric.label,
    unit: metric.unit,
    value: metric.value,
    formattedValue: formatMetricValue(
      metric.unit,
      metric.value,
      metric.numerator,
      metric.denominator,
    ),
    numerator: metric.numerator,
    denominator: metric.denominator,
    target: metric.target,
    status: metric.status,
    helpText: metric.description || undefined,
  }
}

export function formattedTarget(metric: SummaryMetric): string {
  return formatTarget(metric.unit, metric.target)
}

export type MetricsFilter = {
  suite?: string | undefined
  status?: SummaryMetric["status"] | undefined
  q?: string | undefined
}

export function filterMetrics(metrics: SummaryMetric[], filter: MetricsFilter): SummaryMetric[] {
  const q = filter.q?.trim().toLowerCase()
  return metrics.filter((metric) => {
    if (filter.suite && metric.suite !== filter.suite) return false
    if (filter.status && metric.status !== filter.status) return false
    if (q && !`${metric.id} ${metric.label} ${metric.adapter ?? ""}`.toLowerCase().includes(q))
      return false
    return true
  })
}

export type MetricGroup = { suite: string | null; metrics: SummaryMetric[] }

/** Metrics grouped by suite in suite order, cross-suite metrics last, adapters in the fixed order. */
export function groupMetricsBySuite(metrics: SummaryMetric[]): MetricGroup[] {
  const groups = new Map<string | null, SummaryMetric[]>()
  for (const metric of metrics) {
    const list = groups.get(metric.suite) ?? []
    list.push(metric)
    groups.set(metric.suite, list)
  }
  const suites = [...groups.keys()].filter((s): s is string => s !== null).sort(compareSuites)
  const order = (adapter: string | null) =>
    adapter === null ? -1 : orderAdapters([...ADAPTER_IDS, adapter]).indexOf(adapter)
  const sortedGroup = (list: SummaryMetric[]) =>
    [...list].sort((a, b) => a.id.localeCompare(b.id) || order(a.adapter) - order(b.adapter))
  const result: MetricGroup[] = suites.map((suite) => ({
    suite,
    metrics: sortedGroup(groups.get(suite) ?? []),
  }))
  if (groups.has(null)) result.push({ suite: null, metrics: sortedGroup(groups.get(null) ?? []) })
  return result
}

export const SEVERITY_ORDER: Record<FindingV1["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
}

export type FindingGroup = {
  suite: string
  findings: FindingV1[]
  bySeverity: Record<FindingV1["severity"], number>
}

/** Findings by suite in suite order, errors first within a suite. */
export function groupFindings(findings: FindingV1[]): FindingGroup[] {
  const groups = new Map<string, FindingV1[]>()
  for (const finding of findings) {
    const list = groups.get(finding.suite) ?? []
    list.push(finding)
    groups.set(finding.suite, list)
  }
  return [...groups.keys()].sort(compareSuites).map((suite) => {
    const list = [...(groups.get(suite) ?? [])].sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.occurrences - a.occurrences ||
        a.finding_id.localeCompare(b.finding_id),
    )
    const bySeverity: Record<FindingV1["severity"], number> = { error: 0, warning: 0, info: 0 }
    for (const finding of list) bySeverity[finding.severity] += 1
    return { suite, findings: list, bySeverity }
  })
}

export function countBySeverity(findings: FindingV1[]): Record<FindingV1["severity"], number> {
  const counts: Record<FindingV1["severity"], number> = { error: 0, warning: 0, info: 0 }
  for (const finding of findings) counts[finding.severity] += 1
  return counts
}

export type DriftSummary = {
  verdict: CiReportV1["verdict"]
  previous: CiReportV1["previous"]
  bumps: CiReportV1["bumps"]
  /** Suites whose status differs from the previous run's (or had no previous status). */
  changedSuites: CiReportV1["suites"]
  movedMetrics: CiReportV1["metrics"]
  findings: CiReportV1["findings"]
  goldens: CiReportV1["goldens"]
}

export function driftSummary(ci: CiReportV1): DriftSummary {
  return {
    verdict: ci.verdict,
    previous: ci.previous,
    bumps: ci.bumps,
    changedSuites: ci.suites.filter((suite) => suite.previous !== suite.status),
    movedMetrics: ci.metrics,
    findings: ci.findings,
    goldens: ci.goldens,
  }
}

export type FileRow = RunIndexV1["files"][number] & {
  /** The kind this build reads the file as, or null when it does not read it. */
  readAs: string | null
}

/** The run's files with whether this build reads each one's schema, sorted by path. */
export function fileRows(index: RunIndexV1): FileRow[] {
  return [...index.files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => {
      const ref = parseSchemaString(file.schema)
      const readAs =
        ref && isKnownKind(ref.kind) && schemaStringOf(ref.kind) === file.schema ? ref.kind : null
      return { ...file, readAs }
    })
}

export function fileByPath(
  index: RunIndexV1,
  path: string,
): RunIndexV1["files"][number] | undefined {
  return index.files.find((file) => file.path === path)
}

/** The adapters a summary lists, in the fixed order, with their availability. */
export function summaryAdapters(
  summary: SummaryV1,
): { adapter: string; available: boolean; error: string | null }[] {
  const byId = new Map(summary.adapters.map((a) => [a.adapter, a]))
  return orderAdapters(summary.adapters.map((a) => a.adapter)).flatMap((id) => {
    const entry = byId.get(id)
    return entry ? [entry] : []
  })
}

export type AdapterMetricTally = {
  /** The worst of the producer's judgments over the adapter's metrics in the suite. */
  status: "pass" | "fail" | "info" | "not-run"
  counts: Record<SummaryMetric["status"], number>
  total: number
}

/**
 * A matrix cell for a suite whose summary has no per-adapter tallies (every suite but S1): the
 * producer's judgments of the adapter's metrics in that suite, counted. A fail among them is a
 * fail, otherwise a pass among them is a pass, otherwise only info metrics; no metrics is not run.
 * Nothing is re-judged: only the producer's statuses are counted.
 */
export function adapterMetricTally(
  summary: SummaryV1,
  suite: string,
  adapter: string,
): AdapterMetricTally {
  const counts: Record<SummaryMetric["status"], number> = { pass: 0, fail: 0, info: 0, na: 0 }
  let total = 0
  for (const metric of summary.metrics) {
    if (metric.suite !== suite || metric.adapter !== adapter) continue
    counts[metric.status] += 1
    total += 1
  }
  const status =
    counts.fail > 0 ? "fail" : counts.pass > 0 ? "pass" : counts.info > 0 ? "info" : "not-run"
  return { status, counts, total }
}

export function sortedSuites(summary: SummaryV1): SummaryV1["suites"] {
  return [...summary.suites].sort((a, b) => compareSuites(a.id, b.id))
}
