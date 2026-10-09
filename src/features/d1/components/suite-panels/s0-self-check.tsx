import { Link } from "react-router"

import { PageSection } from "@/components/dashboard/dashboard-page"
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
import { mutationKillsByCheck, mutationOperators } from "@/features/d1/model/suite"
import { formatCount, formatRate } from "@/lib/format"

import { metricsNamed, type SuitePanelProps } from "./types"

const PRIMITIVES = [
  "s0.digest",
  "s0.digest_reference",
  "s0.payload_hash",
  "s0.input_tokens",
  "s0.render",
  "s0.audit_expected",
  "s0.auditor.kill_rate",
]

/** S0 (ui-plan.md 8.4): the primitives as cards, the mutation table, the survivors. */
export function S0SelfCheck({ runId, suite, summary }: SuitePanelProps) {
  const mutation = summary.mutation
  const operators = mutation ? mutationOperators(mutation) : []
  return (
    <PageSection
      title="Oracle self-check"
      id="panel"
      description="Whether the harness reproduces the spec's own primitives, and how many mutants of the expected outputs the auditor killed."
    >
      <MetricCards metrics={metricsNamed(summary, PRIMITIVES)} />
      {mutation ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>
                Mutation operators · {formatCount(mutation.killed)} of{" "}
                {formatCount(mutation.mutants)} mutants killed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TableRegion label="Mutation operators table" className="rounded-none border-0">
                <Table>
                  <TableCaption className="sr-only">
                    Mutants, kills and survivors per operator, survivors first.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operator</TableHead>
                      <TableHead className="text-right">Mutants</TableHead>
                      <TableHead className="text-right">Killed</TableHead>
                      <TableHead className="text-right">Survivors</TableHead>
                      <TableHead>Kill rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operators.map((row) => (
                      <TableRow key={row.operator} data-operator={row.operator}>
                        <TableCell className="font-mono text-xs">{row.operator}</TableCell>
                        <TableCell className="tabular text-right">
                          {formatCount(row.mutants)}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatCount(row.killed)}
                        </TableCell>
                        <TableCell
                          className={
                            row.survivors > 0
                              ? "tabular text-right font-medium text-warning"
                              : "tabular text-right"
                          }
                        >
                          {formatCount(row.survivors)}
                        </TableCell>
                        <TableCell className="min-w-40">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted"
                              aria-hidden="true"
                            >
                              <div
                                className="h-full bg-success"
                                style={{ width: `${Math.round((row.killRate ?? 0) * 100)}%` }}
                              />
                            </div>
                            <span className="tabular text-xs">
                              {formatRate(row.killRate, row.killed, row.mutants)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableRegion>
            </CardContent>
          </Card>
          <div className="grid gap-4">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Survivors · {formatCount(mutation.survivors.length)}</CardTitle>
              </CardHeader>
              <CardContent>
                {mutation.survivors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Every mutant was killed.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {mutation.survivors.map((s, i) => (
                      <li key={i} className="font-mono break-all">
                        {s.case_id} · {s.operator} · {s.position}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs">
                  <Link
                    to={`/d1/runs/${runId}/suites/${suite}?verdict=survived`}
                    className="underline underline-offset-3"
                  >
                    The surviving mutants' rows
                  </Link>
                </p>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Kills by check</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs">
                  {mutationKillsByCheck(mutation).map((check) => (
                    <div key={check.check} className="contents">
                      <dt className="font-mono">{check.check}</dt>
                      <dd className="text-muted-foreground">{check.label}</dd>
                      <dd className="tabular text-right">{formatCount(check.kills)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This run's S0 summary has no mutation block.
        </p>
      )}
    </PageSection>
  )
}
