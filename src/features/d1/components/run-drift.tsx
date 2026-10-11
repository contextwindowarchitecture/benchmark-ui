import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { kindIn, type DocumentIn } from "@/data/kinds"
import { useResultsDomain, useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import { driftSummary } from "@/features/d1/model/run"
import { useDomainPages } from "@/lib/domains"
import { formatCount, formatMetricValue, formatUtc } from "@/lib/format"

/** Either domain's drift report: every producer writes it in the same frame. */
type CiReportV1 = DocumentIn<"ci-report">

export type RunDriftProps = { runId: string; listed: boolean }

/** The drift summary from ci.json when the run has one (ui-plan.md 8.3). */
export function RunDrift({ runId, listed }: RunDriftProps) {
  const ci = useRunDocument(runId, "ci.json", kindIn(useResultsDomain(), "ci-report"), {
    enabled: listed,
  })
  if (!listed) {
    const state: RegionState<never> = { status: "absent", what: "A drift report (ci.json)" }
    return (
      <DataRegion state={state} label="the drift report">
        {() => null}
      </DataRegion>
    )
  }
  const region = regionOfDocument(ci, `${runId}/ci.json`, "the drift report")
  return (
    <DataRegion
      state={region}
      label="the drift report"
      skeleton={<Skeleton className="h-40 w-full" />}
    >
      {(document) => <DriftReport runId={runId} ci={document} />}
    </DataRegion>
  )
}

/** The harness's own report, as the run page and the compare page both render it. */
export function DriftReport({ runId, ci }: { runId: string; ci: CiReportV1 }) {
  const pages = useDomainPages()
  const drift = driftSummary(ci)
  const previous = drift.previous
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={drift.verdict} />
        <span>
          {ci.profile} profile, against{" "}
          {previous ? (
            <>
              <Link
                to={`${pages.base}/runs/${previous.run_id}`}
                className="font-mono underline underline-offset-3"
              >
                {previous.run_id}
              </Link>
              {previous.status ? (
                <>
                  {" "}
                  (<StatusBadge status={previous.status} />
                  {previous.started_at ? `, ${formatUtc(previous.started_at)}` : ""})
                </>
              ) : null}
            </>
          ) : (
            "no previous run: this is the baseline"
          )}
        </span>
        {previous && pages.compare ? (
          <Link
            to={`${pages.base}/compare?from=${previous.run_id}&to=${runId}`}
            className="underline underline-offset-3"
          >
            Compare
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bumps</CardTitle>
          </CardHeader>
          <CardContent>
            {drift.bumps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing it was made from changed.</p>
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
                    {drift.bumps.map((bump, i) => (
                      <TableRow key={i}>
                        <TableCell>{bump.what}</TableCell>
                        <TableCell className="font-mono text-xs">{String(bump.from)}</TableCell>
                        <TableCell className="font-mono text-xs">{String(bump.to)}</TableCell>
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
            <CardTitle>Suites that changed status</CardTitle>
          </CardHeader>
          <CardContent>
            {drift.changedSuites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every suite kept its status.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {drift.changedSuites.map((suite) => (
                  <li key={suite.id} className="flex items-center gap-2">
                    <span className="font-mono">{suite.id}</span>
                    {suite.previous ? (
                      <StatusBadge status={suite.previous} />
                    ) : (
                      <span className="text-muted-foreground">(new)</span>
                    )}
                    <span aria-hidden="true">→</span>
                    <StatusBadge status={suite.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metrics that moved</CardTitle>
          </CardHeader>
          <CardContent>
            {drift.movedMetrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No metric moved.</p>
            ) : (
              <TableRegion label="Metrics that moved table" className="rounded-none border-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Previous</TableHead>
                      <TableHead className="text-right">Now</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drift.movedMetrics.map((metric) => (
                      <TableRow key={metricKey(metric)}>
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
                            {armTierOf(metric)}
                          </div>
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatMetricValue(metric.unit, metric.previous)}
                          {metric.previous_status ? (
                            <div>
                              <StatusBadge status={metric.previous_status} />
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatMetricValue(metric.unit, metric.value)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={metric.status} />
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
            <CardTitle>Findings and goldens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {formatCount(drift.findings.new.length)} new,{" "}
              {formatCount(drift.findings.resolved.length)} resolved,{" "}
              {formatCount(drift.findings.persisting)} persisting.
            </p>
            {drift.findings.new.length > 0 ? (
              <FindingList title="New" findings={drift.findings.new} runId={runId} />
            ) : null}
            {drift.findings.resolved.length > 0 ? (
              <FindingList title="Resolved" findings={drift.findings.resolved} />
            ) : null}
            {drift.goldens ? (
              <p>
                Goldens {drift.goldens.adopted ? "adopted" : "not adopted"}:{" "}
                {Object.entries(drift.goldens.drift)
                  .filter((pair): pair is [string, number] => typeof pair[1] === "number")
                  .map(([kind, count]) => `${formatCount(count)} ${kind}`)
                  .join(", ") || "no drift classes"}
                {drift.goldens.removed > 0 ? `, ${formatCount(drift.goldens.removed)} removed` : ""}
                .
              </p>
            ) : (
              <p className="text-muted-foreground">
                No golden drift ({pages.goldenSuite} was not in this run).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type MovedMetric = CiReportV1["metrics"][number]

/** A moved metric's identity: its id with the adapter, and the arm, family and tier Domain 2 adds. */
function metricKey(metric: MovedMetric): string {
  const extra = "arm" in metric ? [metric.arm, metric.family, metric.tier] : []
  return [metric.id, metric.adapter ?? "", ...extra.map((part) => part ?? "")].join(":")
}

function armTierOf(metric: MovedMetric): string {
  if (!("arm" in metric)) return ""
  const parts = [metric.arm, metric.family, metric.tier].filter(
    (part): part is string => typeof part === "string" && part !== "",
  )
  return parts.length > 0 ? ` · ${parts.join(" · ")}` : ""
}

function FindingList({
  title,
  findings,
  runId,
}: {
  title: string
  findings: CiReportV1["findings"]["new"]
  runId?: string
}) {
  const pages = useDomainPages()
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-1 space-y-1">
        {findings.map((finding) => (
          <li key={finding.finding_id} className="flex flex-wrap items-start gap-2">
            <StatusBadge status={finding.severity} />
            <span className="font-mono text-xs">{finding.suite}</span>
            {finding.adapter ? <AdapterMark adapter={finding.adapter} /> : null}
            {runId && pages.findingPages ? (
              <Link
                to={`${pages.base}/runs/${runId}/findings/${finding.finding_id}`}
                className="underline-offset-3 hover:underline"
              >
                {finding.summary}
              </Link>
            ) : (
              <span className="text-muted-foreground">{finding.summary}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
