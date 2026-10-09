import { Link } from "react-router"

import { PageSection } from "@/components/dashboard/dashboard-page"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
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
import { formattedTarget, metricDefinition } from "@/features/d1/model/run"
import { relationMetrics } from "@/features/d1/model/suite"

import { OpenBlockNote } from "./open-block-note"
import { metricsNamed, type SuitePanelProps } from "./types"

/** S4 (ui-plan.md 8.4): MR1 to MR14 as a table from the harness's metrics, and the triage list. */
export function S4Relations({ runId, suite, summary }: SuitePanelProps) {
  const relations = relationMetrics(summary.metrics)
  return (
    <PageSection
      title="Metamorphic relations"
      id="panel"
      description="Each relation's instances that held, as the harness judged them; the rows carry every instance."
    >
      <MetricCards
        metrics={metricsNamed(summary, [
          "s4.variant_agreement",
          "s4.triage",
          "s4.findings_minimized",
        ])}
      />
      {relations.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This run's S4 summary judges no relation metric.
        </p>
      ) : (
        <TableRegion label="Relations table">
          <Table>
            <TableCaption className="sr-only">Instances holding per relation.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Relation</TableHead>
                <TableHead scope="col" className="text-right">
                  Instances holding
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Target
                </TableHead>
                <TableHead scope="col">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relations.map((metric) => {
                const definition = metricDefinition(metric)
                return (
                  <TableRow key={metric.id} data-metric={metric.id}>
                    <TableCell className="align-top">
                      <div>{definition.label}</div>
                      <div className="font-mono text-xs text-muted-foreground">{metric.id}</div>
                    </TableCell>
                    <TableCell className="tabular text-right align-top">
                      {definition.formattedValue}
                    </TableCell>
                    <TableCell className="tabular text-right align-top text-muted-foreground">
                      {formattedTarget(metric)}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={metric.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableRegion>
      )}
      <p className="text-sm">
        <Link
          to={`/d1/runs/${runId}/suites/${suite}?verdict=triage`}
          className="underline underline-offset-3"
        >
          Instances triaged for a person (MR13)
        </Link>{" "}
        are the rows with the triage verdict.
      </p>
      <OpenBlockNote
        what="The per-adapter tally by relation kind"
        ask="Section 14 asks the harness to type the summary's metamorphic block (relations, instances, by_kind)."
      />
    </PageSection>
  )
}
