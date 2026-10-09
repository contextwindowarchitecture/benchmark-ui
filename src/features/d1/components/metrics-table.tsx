import { Fragment } from "react"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
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
import { formattedTarget, metricDefinition, type MetricGroup } from "@/features/d1/model/run"
import { formatCount } from "@/lib/format"

export type MetricsTableProps = {
  groups: MetricGroup[]
  /** Suite titles for the group headings, by suite id. */
  titles: ReadonlyMap<string, string>
  /** Whether to head each group; a single-suite table needs no heading. */
  grouped?: boolean
  caption: string
  label: string
}

/** Metrics as a table (DESIGN.md 4.4): the producer's value, fraction, target and judgment. */
export function MetricsTable({
  groups,
  titles,
  grouped = true,
  caption,
  label,
}: MetricsTableProps) {
  return (
    <TableRegion label={label}>
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Metric</TableHead>
            <TableHead scope="col">Adapter</TableHead>
            <TableHead scope="col" className="text-right">
              Value
            </TableHead>
            <TableHead scope="col" className="text-right">
              Target
            </TableHead>
            <TableHead scope="col">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const title = group.suite ? titles.get(group.suite) : null
            return (
              <Fragment key={group.suite ?? "cross"}>
                {grouped ? (
                  <TableRow className="border-t-2 hover:bg-transparent">
                    <TableCell colSpan={5} className="font-medium" scope="rowgroup">
                      {group.suite ? (
                        <>
                          <span className="font-mono">{group.suite}</span>
                          {title ? ` · ${title}` : ""}
                        </>
                      ) : (
                        "Across suites"
                      )}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {formatCount(group.metrics.length)}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : null}
                {group.metrics.map((metric, i) => {
                  const definition = metricDefinition(metric)
                  // An id can repeat per adapter (S2's clock-shift cells), so the position joins the key.
                  return (
                    <TableRow
                      key={`${metric.id}:${metric.adapter ?? ""}:${i}`}
                      data-metric={metric.id}
                    >
                      <TableCell className="align-top">
                        <div className="font-medium">{definition.label}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {definition.id}
                        </div>
                        {definition.helpText ? (
                          <div className="mt-0.5 max-w-prose text-xs text-muted-foreground">
                            {definition.helpText}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        {metric.adapter ? (
                          <AdapterMark adapter={metric.adapter} />
                        ) : (
                          <span className="text-xs text-muted-foreground">all</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular text-right align-top">
                        {definition.value === null ? (
                          <span className="text-muted-foreground">{definition.formattedValue}</span>
                        ) : (
                          definition.formattedValue
                        )}
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
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
