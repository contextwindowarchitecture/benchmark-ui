import type { UseQueryResult } from "@tanstack/react-query"
import { ExternalLink, PartyPopper } from "lucide-react"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { useRunRows, type RowsState } from "@/data/queries"
import type { FindingV1, RunIndexV1 } from "@/data/schema/generated"
import type { SourceError } from "@/data/source"
import type { ParseResultOf } from "@/data/validate"
import { groupFindings } from "@/features/d1/model/run"
import { compareSuites } from "@/features/d1/model/runs"
import { formatCount } from "@/lib/format"

export type RunFindingsProps = {
  runId: string
  summary: UseQueryResult<ParseResultOf<"summary">, SourceError>
  /** The findings file as the run index lists it; undefined when the run has none. */
  findingsFile: RunIndexV1["files"][number] | undefined
}

/** Findings by suite and severity, from the summary's totals and findings.jsonl (ui-plan.md 8.3). */
export function RunFindings({ runId, summary, findingsFile }: RunFindingsProps) {
  const totals = summary.data?.ok ? summary.data.document.findings : null
  const rows = useRunRows(runId, findingsFile?.path ?? "findings.jsonl", "finding", {
    enabled: findingsFile !== undefined && (totals === null || totals.total > 0),
    expectedRows: findingsFile?.rows,
  })

  if (summary.isPending) return <Skeleton className="h-24 w-full" aria-label="Loading findings" />
  if (totals !== null && totals.total === 0) {
    return (
      <Alert data-state="none">
        <PartyPopper className="text-success" />
        <AlertTitle>No findings in this run</AlertTitle>
        <AlertDescription>
          Every answer passed every oracle. The summary counts zero findings across{" "}
          {formatCount(Object.keys(totals.by_suite).length)} suites.
        </AlertDescription>
      </Alert>
    )
  }
  if (findingsFile === undefined) {
    const state: RegionState<never> = { status: "absent", what: "findings.jsonl" }
    return (
      <DataRegion state={state} label="findings">
        {() => null}
      </DataRegion>
    )
  }

  const region: RegionState<RowsState<"finding">> = rows.isPending
    ? { status: "loading" }
    : rows.isError
      ? rows.error.kind === "not-found"
        ? { status: "not-found", what: "findings.jsonl" }
        : { status: "error", error: rows.error, retry: () => void rows.refetch() }
      : { status: "ok", data: rows.data }

  return (
    <div className="space-y-3">
      {totals ? (
        <p className="text-sm text-muted-foreground">
          {formatCount(totals.total)} {totals.total === 1 ? "finding" : "findings"}:{" "}
          {Object.entries(totals.by_suite)
            .filter((pair): pair is [string, number] => typeof pair[1] === "number" && pair[1] > 0)
            .sort(([a], [b]) => compareSuites(a, b))
            .map(([suite, count]) => `${suite} ${formatCount(count)}`)
            .join(", ")}
        </p>
      ) : null}
      <DataRegion state={region} label="findings" skeleton={<Skeleton className="h-40 w-full" />}>
        {(data) => {
          if (!data.ok) {
            return (
              <Alert data-state="over-budget">
                <AlertTitle>Too many findings to list here</AlertTitle>
                <AlertDescription>
                  {formatCount(data.rows)} rows exceed the {formatCount(data.budget)}-row budget;
                  the findings page (phase UI-P3) will load them through the worker.
                </AlertDescription>
              </Alert>
            )
          }
          return (
            <>
              {data.errors.length > 0 ? (
                <Alert variant="destructive" data-state="row-errors">
                  <AlertTitle>
                    {formatCount(data.errors.length)} {data.errors.length === 1 ? "row" : "rows"} of
                    findings.jsonl could not be read
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="font-mono text-xs">
                      {data.errors.slice(0, 5).map((error) => (
                        <li key={error.line}>
                          line {error.line}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
              {data.unsupported.length > 0 ? (
                <Alert data-state="row-unsupported">
                  <AlertTitle>
                    {formatCount(data.unsupported.length)} rows name a schema this viewer does not
                    read
                  </AlertTitle>
                </Alert>
              ) : null}
              {data.rows.length === 0 ? (
                <p
                  className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                  data-state="empty"
                >
                  findings.jsonl is empty.
                </p>
              ) : (
                <FindingsTable runId={runId} findings={data.rows.map((row) => row.document)} />
              )}
            </>
          )
        }}
      </DataRegion>
    </div>
  )
}

function FindingsTable({ runId, findings }: { runId: string; findings: FindingV1[] }) {
  const groups = groupFindings(findings)
  return (
    <div
      className="overflow-x-auto rounded-lg border"
      role="region"
      aria-label="Findings table"
      tabIndex={0}
    >
      <Table>
        <TableCaption className="sr-only">Findings by suite, errors first.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Severity</TableHead>
            <TableHead scope="col">Suite</TableHead>
            <TableHead scope="col">Adapter</TableHead>
            <TableHead scope="col">Oracle</TableHead>
            <TableHead scope="col">Summary</TableHead>
            <TableHead scope="col" className="text-right">
              Occurrences
            </TableHead>
            <TableHead scope="col">Minimized</TableHead>
            <TableHead scope="col">Upstream</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <GroupRows key={group.suite} runId={runId} group={group} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function GroupRows({
  runId,
  group,
}: {
  runId: string
  group: ReturnType<typeof groupFindings>[number]
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={8} className="font-medium" scope="rowgroup">
          <span className="font-mono">{group.suite}</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {(["error", "warning", "info"] as const)
              .filter((severity) => group.bySeverity[severity] > 0)
              .map((severity) => `${formatCount(group.bySeverity[severity])} ${severity}`)
              .join(" · ")}
          </span>
        </TableCell>
      </TableRow>
      {group.findings.map((finding) => (
        <TableRow
          key={finding.finding_id}
          data-finding={finding.finding_id}
          data-severity={finding.severity}
        >
          <TableCell className="align-top">
            <StatusBadge status={finding.severity} />
          </TableCell>
          <TableCell className="align-top font-mono text-xs">{finding.suite}</TableCell>
          <TableCell className="align-top">
            {finding.adapter ? (
              <AdapterMark adapter={finding.adapter} />
            ) : finding.adapters && finding.adapters.length > 0 ? (
              <span className="flex flex-wrap gap-2">
                {finding.adapters.map((adapter) => (
                  <AdapterMark key={adapter} adapter={adapter} />
                ))}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">all</span>
            )}
          </TableCell>
          <TableCell className="align-top text-xs">
            {finding.oracle}
            {finding.checks.length > 0 ? (
              <div className="font-mono text-muted-foreground">{finding.checks.join(", ")}</div>
            ) : null}
          </TableCell>
          <TableCell className="max-w-md align-top text-sm">
            <Link
              to={`/d1/runs/${runId}/findings/${finding.finding_id}`}
              className="underline-offset-3 hover:underline"
            >
              {finding.summary}
            </Link>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
              {finding.finding_id} · {finding.case_id}
            </div>
          </TableCell>
          <TableCell className="tabular text-right align-top">
            {formatCount(finding.occurrences)}
          </TableCell>
          <TableCell className="align-top text-xs">
            {finding.minimized ? (
              <span>
                {finding.minimized.items_before} → {finding.minimized.items_after} items
                {finding.minimized.reproduces ? "" : " (does not reproduce)"}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="align-top text-xs">
            {finding.upstream ? (
              <a
                href={finding.upstream.url}
                className="inline-flex items-center gap-1 underline underline-offset-3"
                rel="noreferrer"
              >
                {finding.upstream.state} <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
