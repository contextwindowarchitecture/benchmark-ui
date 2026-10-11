import { Fragment } from "react"

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
import { ARM_GROUPS } from "@/content/d2/vocabulary"
import { metricText } from "@/features/d2/model/metric-text"
import { tierLabel, type ArmTierTable as Layout } from "@/features/d2/model/metrics"

import { ArmLabel } from "./arm-label"
import { MetricValue } from "./metric-value"

/**
 * One metric by arm and tier (the write-up's tables): arms down, grouped as upper bounds,
 * conventional baselines and CWA arms; tiers across. Every cell is the producer's value with its
 * fraction and interval; a dash is an arm the metric was not measured for at that tier.
 */
export function ArmTierTable({
  table,
  label,
  caption,
}: {
  table: Layout
  label?: string
  caption?: string
}) {
  const groups = ARM_GROUPS.map((group) => ({
    ...group,
    arms: table.arms.filter((arm) => arm.group === group.id),
  })).filter((group) => group.arms.length > 0)
  const columns = table.tiers.length + 1
  return (
    <TableRegion label={label ?? `${table.label} by arm and tier`}>
      <Table data-metric={table.id}>
        <TableCaption className="sr-only">
          {caption ?? `${table.label} (${table.id}) for each arm at each tier.`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Arm</TableHead>
            {table.tiers.map((tier) => (
              <TableHead key={tier} scope="col" className="text-right">
                {tierLabel(tier)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <Fragment key={group.id}>
              <TableRow className="border-t-2 hover:bg-transparent">
                <TableCell
                  colSpan={columns}
                  scope="rowgroup"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {group.label}
                </TableCell>
              </TableRow>
              {group.arms.map((arm) => (
                <TableRow key={arm.id} data-arm={arm.id}>
                  <TableCell scope="row" className="align-top">
                    <ArmLabel arm={arm.id} />
                  </TableCell>
                  {table.tiers.map((tier) => {
                    const metric = table.cell(arm.id, tier)
                    const name = `${arm.id}, ${tierLabel(tier)}: ${metric ? metricText(metric) : "not measured"}`
                    return (
                      <TableCell
                        key={tier}
                        className="tabular text-right align-top"
                        aria-label={name}
                        title={name}
                      >
                        {metric ? (
                          <MetricValue metric={metric} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
