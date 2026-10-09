import type { UseQueryResult } from "@tanstack/react-query"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DataRegion } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { SuiteSummaryV1, SummaryV1 } from "@/data/schema/generated"
import type { SourceError } from "@/data/source"
import type { ParseResultOf } from "@/data/validate"
import { adapterMetricTally, sortedSuites, summaryAdapters } from "@/features/d1/model/run"
import { formatCount } from "@/lib/format"

export type RunMatrixProps = {
  runId: string
  summary: UseQueryResult<ParseResultOf<"summary">, SourceError>
}

/** The suite × adapter matrix (ui-plan.md 8.3): status cells with tallies, each opening the suite. */
export function RunMatrix({ runId, summary }: RunMatrixProps) {
  const region = regionOfDocument(summary, `${runId}/summary.json`, "the summary")
  return (
    <DataRegion state={region} label="the summary" skeleton={<Skeleton className="h-64 w-full" />}>
      {(document) => <MatrixTable sources={[{ runId, summary: document }]} />}
    </DataRegion>
  )
}

/** One run's rows of the matrix: all its suites, or the ones named; the run labeled when asked. */
export type MatrixSource = {
  runId: string
  summary: SummaryV1
  suites?: SuiteEntry[]
  /** Name the run under each suite, for a matrix that mixes runs (the overview's composite). */
  labelRun?: boolean
}

/**
 * The matrix over one or more runs: the adapters across come from the first source, and each row
 * reads its cells from its own run's suite summary.
 */
export function MatrixTable({
  sources,
  label = "Suite by adapter matrix",
}: {
  sources: MatrixSource[]
  label?: string
}) {
  const first = sources[0]
  const rows = sources.flatMap((source) =>
    (source.suites ?? sortedSuites(source.summary)).map((suite) => ({ source, suite })),
  )
  if (!first || rows.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        This run has no suites.
      </p>
    )
  }
  const adapters = summaryAdapters(first.summary)
  return (
    <TableRegion label={label}>
      <Table>
        <TableCaption className="sr-only">
          Suite status per adapter; each cell links to the suite page.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Suite</TableHead>
            <TableHead scope="col">Status</TableHead>
            {adapters.map((adapter) => (
              <TableHead key={adapter.adapter} scope="col">
                <span className="inline-flex items-center gap-2">
                  <AdapterMark adapter={adapter.adapter} />
                  {!adapter.available ? <StatusBadge status="unavailable" iconOnly /> : null}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ source, suite }) => (
            <MatrixRow
              key={`${source.runId}:${suite.id}`}
              runId={source.runId}
              suite={suite}
              summary={source.summary}
              adapters={adapters.map((a) => a.adapter)}
              labelRun={source.labelRun ?? false}
            />
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}

type SuiteEntry = SummaryV1["suites"][number]

function MatrixRow({
  runId,
  suite,
  summary,
  adapters,
  labelRun,
}: {
  runId: string
  suite: SuiteEntry
  summary: SummaryV1
  adapters: string[]
  labelRun: boolean
}) {
  const detail = useRunDocument(runId, suite.summary, "suite-summary")
  const to = `/d1/runs/${runId}/suites/${suite.id}`
  const perAdapter = detail.data?.ok
    ? new Map(detail.data.document.adapters.map((a) => [a.adapter, a]))
    : null
  const hasTallies = perAdapter !== null && perAdapter.size > 0
  return (
    <TableRow data-suite={suite.id}>
      <TableCell scope="row" className="align-top">
        <Link to={to} className="font-medium underline-offset-3 hover:underline">
          <span className="font-mono">{suite.id}</span> · {suite.title}
        </Link>
        {labelRun ? (
          <div className="font-mono text-xs text-muted-foreground" data-run-label>
            from run {runId}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="align-top">
        <StatusBadge status={suite.status} />
      </TableCell>
      {adapters.map((adapter) => {
        if (detail.isPending) {
          return (
            <TableCell key={adapter} className="align-top">
              <Skeleton className="h-5 w-16" aria-label="loading" />
            </TableCell>
          )
        }
        const entry = hasTallies ? perAdapter.get(adapter) : undefined
        return (
          <TableCell key={adapter} className="align-top">
            {entry ? (
              <Cell runId={runId} suite={suite.id} entry={entry} />
            ) : (
              <MetricsCell runId={runId} suite={suite.id} adapter={adapter} summary={summary} />
            )}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

/** A cell for a suite without per-adapter tallies: the adapter's metric judgments, counted. */
function MetricsCell({
  runId,
  suite,
  adapter,
  summary,
}: {
  runId: string
  suite: string
  adapter: string
  summary: SummaryV1
}) {
  const tally = adapterMetricTally(summary, suite, adapter)
  if (tally.total === 0) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title="This suite judges no metric per adapter"
      >
        cross-adapter only
      </span>
    )
  }
  const parts = (["fail", "pass", "info", "na"] as const)
    .filter((status) => tally.counts[status] > 0)
    .map(
      (status) =>
        `${formatCount(tally.counts[status])} ${status === "na" ? "not measured" : status}`,
    )
  return (
    <Link
      to={`/d1/runs/${runId}/suites/${suite}?adapter=${adapter}`}
      className="flex flex-col gap-1 rounded-sm underline-offset-3 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      aria-label={`${suite} ${adapter}: ${tally.total} metrics, ${parts.join(", ")}`}
    >
      <StatusBadge status={tally.status} />
      <span className="tabular text-xs text-muted-foreground">{parts.join(" · ")}</span>
    </Link>
  )
}

function Cell({
  runId,
  suite,
  entry,
}: {
  runId: string
  suite: string
  entry: SuiteSummaryV1["adapters"][number]
}) {
  const tallies: string[] = []
  if (entry.cases)
    tallies.push(`${formatCount(entry.cases.passed)} / ${formatCount(entry.cases.total)} cases`)
  if (entry.rejections)
    tallies.push(
      `${formatCount(entry.rejections.rejected)} / ${formatCount(entry.rejections.total)} rejections`,
    )
  const outcomes = Object.entries(entry.outcomes)
    .filter((pair): pair is [string, number] => typeof pair[1] === "number" && pair[1] > 0)
    .map(([outcome, count]) => `${formatCount(count)} ${outcome}`)
  const label = [entry.status, ...tallies, ...outcomes].join(", ")
  return (
    <Link
      to={`/d1/runs/${runId}/suites/${suite}?adapter=${entry.adapter}`}
      className="flex flex-col gap-1 rounded-sm underline-offset-3 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      aria-label={`${suite} ${entry.adapter}: ${label}`}
    >
      <StatusBadge status={entry.status} />
      {tallies.length > 0 ? (
        <span className="tabular text-xs text-muted-foreground">{tallies.join(" · ")}</span>
      ) : null}
      {outcomes.length > 0 ? (
        <span className="tabular text-xs text-muted-foreground">{outcomes.join(" · ")}</span>
      ) : null}
      {entry.error ? <span className="text-xs text-destructive">{entry.error}</span> : null}
    </Link>
  )
}
