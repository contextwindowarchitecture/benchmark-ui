// Pure selectors for the suite page (ui-plan.md 8.4): the suite's place in the run, the header's
// pieces, and each suite-specific panel's rows from the typed blocks of the suite summary. The
// blocks the schema leaves open (metamorphic, generated, summarizer, labeled's details) are not
// read here; section 14 asks the harness to type them.

import type { IndexedRow } from "@/data/row-store"
import type { ContractV1, RunIndexV1, SuiteSummaryV1, SummaryV1 } from "@/data/schema/generated"
import { orderAdapters } from "@/lib/adapters"

import type { SummaryMetric } from "./run"
import { runDurationMs } from "./runs"

const SUITE_ID = /^S[0-9]+$/

export function isSuiteId(value: string): boolean {
  return SUITE_ID.test(value)
}

export type SuiteEntry = SummaryV1["suites"][number]

/** The suite's entry in the run summary; undefined when the run did not include it. */
export function suiteEntry(summary: SummaryV1, suite: string): SuiteEntry | undefined {
  return summary.suites.find((entry) => entry.id === suite)
}

/** Whether the run included the suite, from the run's own index. */
export function runHasSuite(index: RunIndexV1, suite: string): boolean {
  return index.suites.includes(suite)
}

export function suiteSummaryPath(suite: string): string {
  return `suites/${suite}/summary.json`
}

/** A suite's file as the run index lists it, with its row count; undefined when it is not there. */
export function suiteFile(
  index: RunIndexV1,
  suite: string,
  name: "results.jsonl" | "findings.jsonl",
): RunIndexV1["files"][number] | undefined {
  const path = `suites/${suite}/${name}`
  return index.files.find((file) => file.path === path)
}

export function suiteDurationMs(
  summary: Pick<SuiteSummaryV1, "started_at" | "finished_at">,
): number | null {
  return runDurationMs(summary)
}

export function suiteFindingsCount(summary: SummaryV1, suite: string): number {
  return summary.findings.by_suite[suite] ?? 0
}

/** The address of one answer in the explorer (ui-plan.md 8.9). */
export function answerPath(runId: string, suite: string, caseId: string): string {
  return `/d1/runs/${runId}/answers/${suite}/${encodeURIComponent(caseId)}`
}

export type RequirementChip = {
  id: string
  keyword: string | null
  summary: string | null
  text: string | null
  scope: string | null
}

export function requirementNumber(id: string): number {
  const n = Number(id.replace(/^R-/, ""))
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}

/** The suite's requirements in id order, with the contract's own words when it has loaded. */
export function requirementChips(
  ids: readonly string[],
  contract: ContractV1 | undefined,
): RequirementChip[] {
  const byId = new Map(contract?.requirements.map((r) => [r.id, r]) ?? [])
  return [...ids]
    .sort((a, b) => requirementNumber(a) - requirementNumber(b) || a.localeCompare(b))
    .map((id) => {
      const requirement = byId.get(id)
      return {
        id,
        keyword: requirement?.keyword ?? null,
        summary: requirement?.summary ?? null,
        text: requirement?.text ?? null,
        scope: requirement?.scope ?? null,
      }
    })
}

export type AdapterTally = SuiteSummaryV1["adapters"][number]

/** The per-adapter tallies a suite summary has (S1), in the fixed order. */
export function adapterTallies(summary: SuiteSummaryV1): AdapterTally[] {
  const byId = new Map(summary.adapters.map((a) => [a.adapter, a]))
  return orderAdapters(summary.adapters.map((a) => a.adapter)).flatMap((id) => {
    const entry = byId.get(id)
    return entry ? [entry] : []
  })
}

/** The adapters the run marks unavailable, for a partial suite's explanation. */
export function unavailableAdapters(
  summary: SummaryV1,
): { adapter: string; error: string | null }[] {
  return orderAdapters(summary.adapters.filter((a) => !a.available).map((a) => a.adapter)).map(
    (adapter) => {
      const entry = summary.adapters.find((a) => a.adapter === adapter)
      return { adapter, error: entry?.error ?? null }
    },
  )
}

export function rateOf(fraction: { numerator: number; denominator: number }): number | null {
  return fraction.denominator === 0 ? null : fraction.numerator / fraction.denominator
}

// S0 -------------------------------------------------------------------------------------------

export type Mutation = NonNullable<SuiteSummaryV1["mutation"]>

export type MutationOperatorRow = {
  operator: string
  mutants: number
  killed: number
  survivors: number
  killRate: number | null
}

/** The operators with their kill rates, survivors first so a gap in the auditor is on top. */
export function mutationOperators(mutation: Mutation): MutationOperatorRow[] {
  return mutation.operators
    .map((operator) => ({
      operator: operator.operator,
      mutants: operator.mutants,
      killed: operator.killed,
      survivors: operator.mutants - operator.killed,
      killRate: operator.mutants === 0 ? null : operator.killed / operator.mutants,
    }))
    .sort(
      (a, b) =>
        b.survivors - a.survivors || b.mutants - a.mutants || a.operator.localeCompare(b.operator),
    )
}

export function mutationKillsByCheck(mutation: Mutation): Mutation["by_check"] {
  return [...mutation.by_check].sort((a, b) => b.kills - a.kills || a.check.localeCompare(b.check))
}

// S1 -------------------------------------------------------------------------------------------

export type ConformanceAnswer = {
  outcome: string
  verdict: string
  auditFailed: string[]
  failedChecks: string[]
  wallMs: number
  line: number
}

export type ConformanceCase = {
  caseId: string
  kind: "case" | "rejection"
  corpus: string
  expected: string | null
  answers: Map<string, ConformanceAnswer>
}

/**
 * The 65 cases and 25 rejections as rows with one answer per adapter (ui-plan.md 8.4), from the
 * first repetition of each; cases first, then rejections, each in id order.
 */
export function conformanceCases(rows: readonly IndexedRow<"result-row">[]): ConformanceCase[] {
  const cases = new Map<string, ConformanceCase>()
  for (const { line, document: row } of rows) {
    const key = `${row.case_kind}:${row.case_id}`
    let entry = cases.get(key)
    if (!entry) {
      entry = {
        caseId: row.case_id,
        kind: row.case_kind,
        corpus: row.corpus,
        expected: row.expected_outcome,
        answers: new Map(),
      }
      cases.set(key, entry)
    }
    const existing = entry.answers.get(row.adapter)
    if (existing && existing.line <= line) continue
    entry.answers.set(row.adapter, {
      outcome: row.outcome,
      verdict: row.verdict,
      auditFailed: row.audit?.failed ?? [],
      failedChecks: row.checks.filter((check) => check.status === "fail").map((check) => check.id),
      wallMs: row.wall_ms,
      line,
    })
  }
  const kindOrder = { case: 0, rejection: 1 }
  return [...cases.values()].sort(
    (a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.caseId.localeCompare(b.caseId),
  )
}

export type CommittedDiffer = NonNullable<AdapterTally["committed_report"]>["differs"][number] & {
  adapter: string
}

/** Where an adapter's committed report differs from what this run observed, by case id. */
export function committedDiffers(summary: SuiteSummaryV1): Map<string, CommittedDiffer[]> {
  const result = new Map<string, CommittedDiffer[]>()
  for (const adapter of adapterTallies(summary)) {
    for (const differ of adapter.committed_report?.differs ?? []) {
      const list = result.get(differ.id) ?? []
      list.push({ ...differ, adapter: adapter.adapter })
      result.set(differ.id, list)
    }
  }
  return result
}

// S2 and S10 -------------------------------------------------------------------------------------

export type MatrixCell = NonNullable<SuiteSummaryV1["cells"]>[number]

export type MatrixRow = {
  cell: string
  platform: string
  description: string
  byAdapter: Map<string, MatrixCell>
}

/** The cells in the order the plan reads them: the host baseline, then each kind of change. */
const CELL_GROUPS = [
  "baseline",
  "tz:",
  "locale:",
  "threads:",
  "env:",
  "home:",
  "cwd:",
  "burst:",
  "linux:",
  "platform:",
  "toolchain:",
  "sandbox:",
  "linux-isolated:",
]

export function cellGroup(cell: string): number {
  const index = CELL_GROUPS.findIndex((prefix) =>
    prefix.endsWith(":") ? cell.startsWith(prefix) : cell === prefix,
  )
  return index === -1 ? CELL_GROUPS.length : index
}

/** Cells down, adapters across (ui-plan.md 8.4); a cell with nothing applied is hatched by the view. */
export function environmentMatrix(cells: readonly MatrixCell[]): {
  rows: MatrixRow[]
  adapters: string[]
} {
  const rows = new Map<string, MatrixRow>()
  const adapters = new Set<string>()
  for (const cell of cells) {
    adapters.add(cell.adapter)
    const key = `${cell.cell}|${cell.platform}`
    let row = rows.get(key)
    if (!row) {
      row = {
        cell: cell.cell,
        platform: cell.platform,
        description: cell.description,
        byAdapter: new Map(),
      }
      rows.set(key, row)
    }
    row.byAdapter.set(cell.adapter, cell)
  }
  return {
    rows: [...rows.values()].sort(
      (a, b) =>
        cellGroup(a.cell) - cellGroup(b.cell) ||
        a.cell.localeCompare(b.cell) ||
        a.platform.localeCompare(b.platform),
    ),
    adapters: orderAdapters([...adapters]),
  }
}

// S4 -------------------------------------------------------------------------------------------

const RELATION_METRIC = /^s4\.mr(\d+)$/

/** The relation metrics MR1 to MR14 in relation order, each the harness's own judgment. */
export function relationMetrics(metrics: readonly SummaryMetric[]): SummaryMetric[] {
  const number = (id: string) => Number(RELATION_METRIC.exec(id)?.[1] ?? Number.MAX_SAFE_INTEGER)
  return metrics
    .filter((metric) => RELATION_METRIC.test(metric.id) && metric.adapter === null)
    .sort((a, b) => number(a.id) - number(b.id))
}

// S6, S8, S9 --------------------------------------------------------------------------------------

export type LabeledCorpusRow = NonNullable<SuiteSummaryV1["labeled"]>["by_corpus"][number] & {
  rate: number | null
}

/** The labeled corpora table, corpus by corpus with the adapters in the fixed order. */
export function labeledCorpora(
  labeled: NonNullable<SuiteSummaryV1["labeled"]>,
): LabeledCorpusRow[] {
  const order = (adapter: string) => orderAdapters([...new Set([adapter])]).indexOf(adapter)
  const adapters = orderAdapters([...new Set(labeled.by_corpus.map((row) => row.adapter))])
  return labeled.by_corpus
    .map((row) => ({ ...row, rate: row.snapshots === 0 ? null : row.passed / row.snapshots }))
    .sort(
      (a, b) =>
        a.corpus.localeCompare(b.corpus) ||
        adapters.indexOf(a.adapter) - adapters.indexOf(b.adapter) ||
        order(a.adapter) - order(b.adapter),
    )
}

// S10 ------------------------------------------------------------------------------------------

export type PurityAdapter = NonNullable<SuiteSummaryV1["purity"]>["adapters"][number]

export type PurityEvent = { event: string; count: number }

export type PurityAdapterRow = {
  adapter: string
  invocations: number
  traced: number
  emptyTraces: number
  network: PurityEvent[]
  localSockets: PurityEvent[]
  reads: PurityEvent[]
  writes: PurityEvent[]
  /** Cache writes the read-only root refused (EROFS): harmless, and labeled so. */
  harmlessCacheWrites: PurityEvent[]
  cacheWrites: PurityEvent[]
  childProcesses: PurityEvent[]
}

export function isHarmlessCacheWrite(event: string): boolean {
  return event.includes("(EROFS)")
}

export function purityRows(purity: NonNullable<SuiteSummaryV1["purity"]>): PurityAdapterRow[] {
  const byId = new Map(purity.adapters.map((a) => [a.adapter, a]))
  return orderAdapters(purity.adapters.map((a) => a.adapter)).flatMap((id) => {
    const a = byId.get(id)
    if (!a) return []
    return [
      {
        adapter: a.adapter,
        invocations: a.invocations,
        traced: a.traced_invocations,
        emptyTraces: a.empty_traces,
        network: a.network,
        localSockets: a.local_sockets,
        reads: a.reads,
        writes: a.writes,
        harmlessCacheWrites: a.cache_writes.filter((w) => isHarmlessCacheWrite(w.event)),
        cacheWrites: a.cache_writes.filter((w) => !isHarmlessCacheWrite(w.event)),
        childProcesses: a.child_processes,
      },
    ]
  })
}

export function eventTotal(events: readonly PurityEvent[]): number {
  return events.reduce((sum, event) => sum + event.count, 0)
}

// S12 ------------------------------------------------------------------------------------------

export type Goldens = NonNullable<SuiteSummaryV1["goldens"]>

export const DRIFT_KINDS = ["match", "spec_change", "regression", "new"] as const

export type GoldenDriftRow = {
  adapter: string
  counts: Record<(typeof DRIFT_KINDS)[number], number>
  total: number
}

/** Drift counts per adapter in the fixed order; never a percentage alone (ui-plan.md 10). */
export function goldenDriftRows(goldens: Goldens): GoldenDriftRow[] {
  const rows = new Map<string, GoldenDriftRow>()
  for (const entry of goldens.drift) {
    let row = rows.get(entry.adapter)
    if (!row) {
      row = {
        adapter: entry.adapter,
        counts: { match: 0, spec_change: 0, regression: 0, new: 0 },
        total: 0,
      }
      rows.set(entry.adapter, row)
    }
    row.counts[entry.drift] += entry.count
    row.total += entry.count
  }
  return orderAdapters([...rows.keys()]).flatMap((id) => {
    const row = rows.get(id)
    return row ? [row] : []
  })
}
