// Compare (ui-plan.md 8.10): two runs side by side. The harness's own report when `to` was
// compared with `from` by the harness; otherwise the same sections computed here from the two
// summaries and the runs index, with a banner that says so and no golden drift, which needs rows.

import { ArrowLeftRight, Calculator } from "lucide-react"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { Digest } from "@/components/dashboard/digest"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunsIndexV1, SummaryV1 } from "@/data/schema/generated"
import { computeComparison, harnessCompared, type Comparison } from "@/features/d1/model/compare"
import { fileByPath } from "@/features/d1/model/run"
import { isFinished, runById } from "@/features/d1/model/runs"
import { compareParams } from "@/features/d1/model/url"
import { formatCount, formatMetricValue, formatUtc } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { DriftReport } from "./run-drift"

export function ComparePage() {
  const runsIndex = useRunsIndex()
  const [params, setParams] = useUrlState(compareParams)
  const index = runsIndex.data?.ok ? runsIndex.data.document : undefined
  const from = params.from
  const to = params.to
  return (
    <DashboardPage
      title="Compare"
      description="Two runs: what was made from what, which suites changed status, which metrics moved, which findings appeared or went away. From the harness's own report where it compared the pair, computed here otherwise."
      width="wide"
      filters={
        index ? (
          <Pickers index={index} from={from} to={to} onChange={(patch) => setParams(patch)} />
        ) : null
      }
    >
      <DataRegion
        state={regionOfDocument(runsIndex, "d1/index.json", "the runs index")}
        label="the runs index"
        skeleton={<Skeleton className="h-64 w-full" />}
      >
        {(doc) =>
          !from || !to ? (
            <p
              className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
              data-state="empty"
            >
              Pick two runs above, or come from a run page's drift section, which compares a run
              with the previous one of its profile.
            </p>
          ) : from === to ? (
            <p
              className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
              data-state="empty"
            >
              Pick two different runs: <span className="font-mono">{from}</span> is both sides.
            </p>
          ) : (
            <Comparison index={doc} from={from} to={to} />
          )
        }
      </DataRegion>
    </DashboardPage>
  )
}

function Pickers({
  index,
  from,
  to,
  onChange,
}: {
  index: RunsIndexV1
  from: string | undefined
  to: string | undefined
  onChange: (patch: { from?: string | undefined; to?: string | undefined }) => void
}) {
  const runs = index.runs.filter(isFinished)
  const picker = (label: string, value: string | undefined, key: "from" | "to") => (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Select value={value ?? ""} onValueChange={(next) => onChange({ [key]: next })}>
        <SelectTrigger size="sm" aria-label={label} className="w-72 font-mono text-xs">
          <SelectValue placeholder="pick a run" />
        </SelectTrigger>
        <SelectContent>
          {runs.map((run) => (
            <SelectItem key={run.run_id} value={run.run_id} className="font-mono text-xs">
              {run.run_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Runs to compare">
      {picker("From", from, "from")}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Swap the runs"
        onClick={() => onChange({ from: to, to: from })}
        disabled={!from && !to}
      >
        <ArrowLeftRight aria-hidden="true" />
      </Button>
      {picker("To", to, "to")}
    </div>
  )
}

function Comparison({ index, from, to }: { index: RunsIndexV1; from: string; to: string }) {
  const toIndex = useRunDocument(to, "index.json", "run-index")
  const fromIndex = useRunDocument(from, "index.json", "run-index")
  const toFiles = toIndex.data?.ok ? toIndex.data.document : undefined
  const ciListed = toFiles ? fileByPath(toFiles, "ci.json") !== undefined : false
  const ci = useRunDocument(to, "ci.json", "ci-report", { enabled: ciListed })
  const report = ci.data?.ok ? ci.data.document : undefined
  const harness = harnessCompared(report, from)
  const computed = toFiles !== undefined && (!ciListed || (!ci.isPending && !harness))
  const toSummary = useRunDocument(to, "summary.json", "summary", { enabled: computed })
  const fromSummary = useRunDocument(from, "summary.json", "summary", {
    enabled: computed && fromIndex.data?.ok === true,
  })
  const fromEntry = runById(index, from)
  const toEntry = runById(index, to)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3 text-sm" data-pair>
        <RunChip index={index} runId={from} />
        <span aria-hidden="true">→</span>
        <RunChip index={index} runId={to} />
      </div>
      <DataRegion
        state={regionOfDocument(toIndex, `${to}/index.json`, `Run ${to}`)}
        label="the run"
        skeleton={<Skeleton className="h-64 w-full" />}
      >
        {() =>
          ciListed && ci.isPending ? (
            <Skeleton className="h-64 w-full" aria-label="Loading the drift report" />
          ) : harness && report ? (
            <div className="grid gap-4" data-source="harness">
              <Alert>
                <AlertTitle>The harness's own report</AlertTitle>
                <AlertDescription>
                  <span className="font-mono">{to}</span>'s ci.json compares it with{" "}
                  <span className="font-mono">{from}</span>, the previous run of its{" "}
                  {report.profile} profile. Nothing below was computed by this viewer.
                </AlertDescription>
              </Alert>
              <DriftReport runId={to} ci={report} />
            </div>
          ) : (
            <DataRegion
              state={regionOfDocument(fromIndex, `${from}/index.json`, `Run ${from}`)}
              label="the run"
              skeleton={<Skeleton className="h-64 w-full" />}
            >
              {() => (
                <DataRegion
                  state={regionOfDocument(toSummary, `${to}/summary.json`, "the summary")}
                  label="the summary"
                  skeleton={<Skeleton className="h-64 w-full" />}
                >
                  {(toDoc) => (
                    <DataRegion
                      state={regionOfDocument(fromSummary, `${from}/summary.json`, "the summary")}
                      label="the summary"
                      skeleton={<Skeleton className="h-64 w-full" />}
                    >
                      {(fromDoc) => (
                        <Computed
                          from={from}
                          to={to}
                          comparison={computeComparison(
                            { runId: from, summary: fromDoc, entry: fromEntry },
                            { runId: to, summary: toDoc, entry: toEntry },
                          )}
                          harnessPrevious={report?.previous?.run_id ?? null}
                        />
                      )}
                    </DataRegion>
                  )}
                </DataRegion>
              )}
            </DataRegion>
          )
        }
      </DataRegion>
    </div>
  )
}

function RunChip({ index, runId }: { index: RunsIndexV1; runId: string }) {
  const run = runById(index, runId)
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-run={runId}>
      <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
        {runId}
      </Link>
      {run ? (
        <>
          <StatusBadge status={run.status} />
          {run.ci_profile ? <span className="text-muted-foreground">{run.ci_profile}</span> : null}
          <span className="text-muted-foreground">{formatUtc(run.started_at)}</span>
        </>
      ) : (
        <span className="text-muted-foreground">not in the index</span>
      )}
    </span>
  )
}

function Computed({
  from,
  to,
  comparison,
  harnessPrevious,
}: {
  from: string
  to: string
  comparison: Comparison
  harnessPrevious: string | null
}) {
  return (
    <div className="grid gap-4" data-source="computed">
      <Alert data-state="computed">
        <Calculator />
        <AlertTitle>Computed by this viewer, not by the harness</AlertTitle>
        <AlertDescription>
          The harness compares a run only with the previous run of its profile
          {harnessPrevious ? (
            <>
              ; its report on <span className="font-mono">{to}</span> compares it with{" "}
              <Link
                to={`/d1/compare?from=${harnessPrevious}&to=${to}`}
                className="font-mono underline underline-offset-3"
              >
                {harnessPrevious}
              </Link>
            </>
          ) : (
            <>
              , and <span className="font-mono">{to}</span> has no report
            </>
          )}
          . The sections below line up the two summaries and the index's commits; golden drift needs
          the rows and is not computed.
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Status</span>
        <StatusBadge status={comparison.status.from} />
        <span aria-hidden="true">→</span>
        <StatusBadge status={comparison.status.to} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bumps</CardTitle>
          </CardHeader>
          <CardContent>
            {comparison.bumps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The index records the same commits for both runs, or none.
              </p>
            ) : (
              <TableRegion label="Bumps table" className="rounded-none border-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>What</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.bumps.map((bump) => (
                      <TableRow key={bump.what} data-bump={bump.what}>
                        <TableCell>
                          {bump.what === "contract" ? (
                            "contract"
                          ) : (
                            <AdapterMark adapter={bump.what} />
                          )}
                        </TableCell>
                        <TableCell>
                          {bump.from ? (
                            <Digest value={bump.from} label={`${bump.what} commit before`} />
                          ) : (
                            <span className="text-muted-foreground">none</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {bump.to ? (
                            <Digest value={bump.to} label={`${bump.what} commit after`} />
                          ) : (
                            <span className="text-muted-foreground">none</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableRegion>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Suites</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm" data-suites>
              {comparison.suites.map((suite) => (
                <li
                  key={suite.id}
                  className="flex flex-wrap items-center gap-2"
                  data-suite={suite.id}
                  data-changed={suite.changed}
                >
                  <span className="font-mono">{suite.id}</span>
                  <span className="text-muted-foreground">{suite.title}</span>
                  {suite.from ? (
                    <StatusBadge status={suite.from} />
                  ) : (
                    <span className="text-xs text-muted-foreground">not in the from run</span>
                  )}
                  <span aria-hidden="true">→</span>
                  {suite.to ? (
                    <StatusBadge status={suite.to} />
                  ) : (
                    <span className="text-xs text-muted-foreground">not in the to run</span>
                  )}
                  {suite.changed ? <StatusBadge status="changed" iconOnly /> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Metrics that moved</CardTitle>
          </CardHeader>
          <CardContent>
            {comparison.metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No metric moved.</p>
            ) : (
              <TableRegion label="Metrics that moved table" className="rounded-none border-0">
                <Table>
                  <TableCaption className="sr-only">
                    Metrics whose value or status differs between the runs, or that only one
                    carries.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">From</TableHead>
                      <TableHead className="text-right">To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.metrics.map((metric) => (
                      <TableRow
                        key={`${metric.id}:${metric.adapter ?? ""}`}
                        data-metric={metric.id}
                      >
                        <TableCell>
                          <div>{metric.label}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {metric.id}
                            {metric.adapter ? (
                              <>
                                {" · "}
                                <AdapterMark adapter={metric.adapter} />
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                        <MetricSideCell side={metric.from} unit={metric.unit} />
                        <MetricSideCell side={metric.to} unit={metric.unit} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableRegion>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {formatCount(comparison.totals.from)} in{" "}
              <Link
                to={`/d1/runs/${from}/findings`}
                className="font-mono underline underline-offset-3"
              >
                {from}
              </Link>
              , {formatCount(comparison.totals.to)} in{" "}
              <Link
                to={`/d1/runs/${to}/findings`}
                className="font-mono underline underline-offset-3"
              >
                {to}
              </Link>
              . Which findings appeared or went away needs each run's findings file; the counts per
              suite are the summaries'.
            </p>
            {comparison.findings.length === 0 ? (
              <p className="text-muted-foreground">Neither run counts a finding in any suite.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-6 gap-y-1" data-findings>
                {comparison.findings.map((change) => (
                  <li key={change.suite} className="tabular">
                    <span className="font-mono">{change.suite}</span> {formatCount(change.from)} →{" "}
                    {formatCount(change.to)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricSideCell({
  side,
  unit,
}: {
  side: Comparison["metrics"][number]["from"]
  unit: SummaryV1["metrics"][number]["unit"]
}) {
  if (!side) {
    return (
      <TableCell className="text-right text-xs text-muted-foreground">not in this run</TableCell>
    )
  }
  return (
    <TableCell className="tabular text-right">
      {formatMetricValue(unit, side.value)}
      <div>
        <StatusBadge status={side.status} />
      </div>
    </TableCell>
  )
}
