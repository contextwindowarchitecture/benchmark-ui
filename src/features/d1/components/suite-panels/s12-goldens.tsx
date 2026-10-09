import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { PageSection } from "@/components/dashboard/dashboard-page"
import { Digest } from "@/components/dashboard/digest"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MetricCards } from "@/features/d1/components/metric-card"
import { DRIFT_KINDS, goldenDriftRows } from "@/features/d1/model/suite"
import { formatCount, formatUtc, isoUtc } from "@/lib/format"

import { crossMetrics, type SuitePanelProps } from "./types"

/** S12 (ui-plan.md 8.4): golden drift per adapter, the goldens' provenance, the candidates. */
export function S12Goldens({ summary }: SuitePanelProps) {
  const goldens = summary.goldens
  const rows = goldens ? goldenDriftRows(goldens) : []
  return (
    <PageSection
      title="Regression and consensus goldens"
      id="panel"
      description="How each adapter's answers compare with the adopted goldens, counted by kind of drift, never as a percentage alone."
    >
      <MetricCards metrics={crossMetrics(summary)} />
      {!goldens ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This run's summary has no goldens block.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <TableRegion label="Golden drift table" className="self-start">
            <Table>
              <TableCaption className="sr-only">Drift counts per adapter.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Adapter</TableHead>
                  {DRIFT_KINDS.map((kind) => (
                    <TableHead key={kind} scope="col" className="text-right">
                      <StatusBadge status={kind} />
                    </TableHead>
                  ))}
                  <TableHead scope="col" className="text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.adapter} data-adapter={row.adapter}>
                    <TableCell>
                      <AdapterMark adapter={row.adapter} />
                    </TableCell>
                    {DRIFT_KINDS.map((kind) => (
                      <TableCell
                        key={kind}
                        className={
                          kind === "regression" && row.counts[kind] > 0
                            ? "tabular text-right font-medium text-failure"
                            : "tabular text-right"
                        }
                      >
                        {formatCount(row.counts[kind])}
                      </TableCell>
                    ))}
                    <TableCell className="tabular text-right">{formatCount(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRegion>
          <div className="grid gap-4">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>The adopted goldens</CardTitle>
              </CardHeader>
              <CardContent>
                {goldens.adopted ? (
                  <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                    <dt className="text-muted-foreground">From run</dt>
                    <dd>
                      <Link
                        to={`/d1/runs/${goldens.adopted.from_run}`}
                        className="font-mono text-xs underline underline-offset-3"
                      >
                        {goldens.adopted.from_run}
                      </Link>
                    </dd>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="text-xs">
                      <time dateTime={isoUtc(goldens.adopted.created_at)}>
                        {formatUtc(goldens.adopted.created_at)}
                      </time>
                    </dd>
                    <dt className="text-muted-foreground">Contract</dt>
                    <dd>
                      <Digest
                        value={goldens.adopted.contract_commit}
                        label="goldens' contract commit"
                      />
                    </dd>
                    <dt className="text-muted-foreground">Entries</dt>
                    <dd className="tabular text-xs">{formatCount(goldens.adopted.entries)}</dd>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No goldens were adopted; this run's candidates would be the first.
                  </p>
                )}
                {goldens.note ? (
                  <p className="mt-2 text-xs text-muted-foreground">{goldens.note}</p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>
                  This run's candidates · {formatCount(goldens.candidate_count)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {goldens.no_consensus.length === 0
                    ? "Every snapshot reached consensus."
                    : `${formatCount(goldens.no_consensus.length)} snapshots reached no consensus.`}
                  {goldens.removed.length > 0
                    ? ` ${formatCount(goldens.removed.length)} goldens were removed.`
                    : ""}
                </p>
                {goldens.no_consensus.length > 0 ? (
                  <ul className="space-y-0.5 font-mono text-xs">
                    {goldens.no_consensus.slice(0, 10).map((entry) => (
                      <li key={entry.case_id}>
                        {entry.case_id}: {entry.reason}
                      </li>
                    ))}
                    {goldens.no_consensus.length > 10 ? (
                      <li className="text-muted-foreground">
                        and {formatCount(goldens.no_consensus.length - 10)} more
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageSection>
  )
}
