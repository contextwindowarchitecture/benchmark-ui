import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { PageSection } from "@/components/dashboard/dashboard-page"
import { Outcome } from "@/components/dashboard/outcome"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { MAIN_THREAD_ROW_BUDGET } from "@/data/budgets"
import type { IndexedRow } from "@/data/row-store"
import { useRowPage, useRows } from "@/data/use-rows"
import {
  answerPath,
  committedDiffers,
  conformanceCases,
  suiteFile,
} from "@/features/d1/model/suite"
import { orderAdapters } from "@/lib/adapters"
import { formatCount, formatRate } from "@/lib/format"

import type { SuitePanelProps } from "./types"

/** S1 (ui-plan.md 8.4): the cases and rejections with each adapter's outcome, and the agreement. */
export function S1Conformance({ runId, suite, summary, index }: SuitePanelProps) {
  const results = suiteFile(index, suite, "results.jsonl")
  const differential = summary.differential
  return (
    <PageSection
      title="Cases and rejections"
      id="panel"
      description="Each conformance case and rejection with every adapter's outcome, and how far the adapters agree with each other."
    >
      {differential ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Differential agreement · {formatCount(differential.agreeing)} of{" "}
              {formatCount(differential.cases)} cases
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
              {differential.pairs.map((pair) => (
                <div key={`${pair.a}-${pair.b}`} className="contents">
                  <dt className="flex items-center gap-1">
                    <AdapterMark adapter={pair.a} />{" "}
                    <span className="text-muted-foreground">×</span>{" "}
                    <AdapterMark adapter={pair.b} />
                  </dt>
                  <dd className="tabular text-right">
                    {formatRate(
                      pair.total === 0 ? null : pair.agree / pair.total,
                      pair.agree,
                      pair.total,
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="text-sm">
              {differential.disagreements.length === 0 ? (
                <p className="text-muted-foreground">No case on which the adapters disagree.</p>
              ) : (
                <ul className="space-y-1">
                  {differential.disagreements.map((d) => (
                    <li key={d.case_id} className="font-mono text-xs">
                      {d.case_id}: differs at {d.first_stage}, groups{" "}
                      {d.groups.map((g) => `[${g.join(", ")}]`).join(" ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
      {results ? (
        <CaseTable runId={runId} suite={suite} file={results} summary={summary} />
      ) : (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This run has no S1 results file.
        </p>
      )}
    </PageSection>
  )
}

function CaseTable({
  runId,
  suite,
  file,
  summary,
}: Pick<SuitePanelProps, "runId" | "suite" | "summary"> & {
  file: NonNullable<ReturnType<typeof suiteFile>>
}) {
  const small = (file.rows ?? 0) <= MAIN_THREAD_ROW_BUDGET
  const handle = useRows(runId, file.path, "result-row", {
    expectedRows: file.rows,
    enabled: small,
  })
  const { page, pending } = useRowPage(handle, {
    filter: {},
    page: 1,
    pageSize: Math.max(1, file.rows ?? 1),
  })
  if (!small) {
    return (
      <Alert>
        <AlertTitle>The case table needs every row</AlertTitle>
        <AlertDescription>
          {formatCount(file.rows ?? 0)} rows are above the main-thread budget; the rows table below
          loads them through the worker, filterable by adapter and case.
        </AlertDescription>
      </Alert>
    )
  }
  if (handle.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the cases</AlertTitle>
        <AlertDescription>{handle.error.message}</AlertDescription>
      </Alert>
    )
  }
  if (handle.status === "over-budget") return null
  if (!page || pending) return <Skeleton className="h-64 w-full" aria-label="Loading the cases" />
  const cases = conformanceCases(page.rows as IndexedRow<"result-row">[])
  const adapters = orderAdapters([...new Set(cases.flatMap((c) => [...c.answers.keys()]))])
  const differs = committedDiffers(summary)
  return (
    <TableRegion label="Conformance cases table">
      <Table>
        <TableCaption className="sr-only">
          Each case and rejection with every adapter's outcome and verdict.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Case</TableHead>
            <TableHead scope="col">Kind</TableHead>
            <TableHead scope="col">Expected</TableHead>
            {adapters.map((adapter) => (
              <TableHead key={adapter} scope="col">
                <AdapterMark adapter={adapter} />
              </TableHead>
            ))}
            <TableHead scope="col">Committed report</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((entry) => {
            const differ = differs.get(entry.caseId) ?? []
            return (
              <TableRow key={`${entry.kind}:${entry.caseId}`} data-case={entry.caseId}>
                <TableCell className="align-top">
                  <Link
                    to={answerPath(runId, suite, entry.caseId)}
                    className="font-mono text-xs break-all underline-offset-3 hover:underline"
                  >
                    {entry.caseId}
                  </Link>
                  <div className="text-xs text-muted-foreground">{entry.corpus}</div>
                </TableCell>
                <TableCell className="align-top text-xs">{entry.kind}</TableCell>
                <TableCell className="align-top">
                  {entry.expected ? (
                    <Outcome value={entry.expected} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                {adapters.map((adapter) => {
                  const answer = entry.answers.get(adapter)
                  if (!answer) {
                    return (
                      <TableCell key={adapter} className="align-top text-xs text-muted-foreground">
                        no answer
                      </TableCell>
                    )
                  }
                  return (
                    <TableCell key={adapter} className="align-top" data-verdict={answer.verdict}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Outcome value={answer.outcome} />
                        <StatusBadge status={answer.verdict} iconOnly />
                      </div>
                      {answer.auditFailed.length > 0 || answer.failedChecks.length > 0 ? (
                        <div className="text-xs text-failure">
                          {[...answer.auditFailed, ...answer.failedChecks].join(", ")}
                        </div>
                      ) : null}
                    </TableCell>
                  )
                })}
                <TableCell className="align-top text-xs">
                  {differ.length === 0 ? (
                    <span className="text-muted-foreground">matches</span>
                  ) : (
                    <ul className="space-y-0.5 text-failure">
                      {differ.map((d, i) => (
                        <li key={i}>
                          {d.adapter}: committed {d.committed ?? "nothing"}, observed{" "}
                          {d.observed ?? "nothing"}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
