// Domain 5's metric tables (the UI-D5 plan): its per-arm metrics with no tier, arms down and
// metric ids across, and its paired differences, each the harness's value and interval.

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
import { ArmLabel } from "@/features/d2/components/arm-label"
import { GroupedArmTable } from "@/features/d2/components/grouped-arm-table"
import { MetricValue } from "@/features/d2/components/metric-value"
import { metricText } from "@/features/d2/model/metric-text"
import type { ArmMetricTable as Layout, D5Metric, Pair } from "@/features/d5/model/metrics"
import { useArmVocabulary } from "@/features/shared/vocabulary"
import { formatCount } from "@/lib/format"

/** A suite's per-arm metrics with no tier: arms down, grouped; one column per metric. */
export function ArmMetricTable({ table, label }: { table: Layout; label: string }) {
  const vocabulary = useArmVocabulary()
  return (
    <div className="space-y-2">
      <GroupedArmTable
        label={label}
        caption={`${label}: each arm's value of each metric, with its fraction and interval where the harness computed one.`}
        arms={table.arms.map((arm) => ({ id: arm, group: vocabulary.groupOf(arm) }))}
        columns={table.ids.map((entry) => ({ key: entry.id, label: entry.label }))}
        cell={(arm, id) => {
          const metric = table.cell(arm, id)
          return metric
            ? { node: <MetricValue metric={metric} />, text: metricText(metric, vocabulary.points) }
            : null
        }}
      />
      <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-[auto_1fr]">
        {table.ids.map((entry) => (
          <div key={entry.id} className="contents">
            <dt className="font-mono">{entry.id}</dt>
            <dd>{entry.description || entry.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** A suite's paired differences: each arm less its reference on the same probes. */
export function PairedMetricsTable({
  entries,
  label,
}: {
  entries: readonly { metric: D5Metric; pair: Pair }[]
  label: string
}) {
  const { points } = useArmVocabulary()
  return (
    <TableRegion label={label}>
      <Table>
        <TableCaption className="sr-only">
          {label}: each arm less its reference arm on the same probes, in percentage points, with
          the harness's interval.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Metric</TableHead>
            <TableHead scope="col">Arm</TableHead>
            <TableHead scope="col">Less</TableHead>
            <TableHead scope="col" className="text-right">
              Difference
            </TableHead>
            <TableHead scope="col">Over</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(({ metric, pair }) => (
            <TableRow key={`${metric.id}:${metric.arm}`} data-pair={metric.arm}>
              <TableCell className="align-top">
                <div>{metric.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{metric.id}</div>
              </TableCell>
              <TableCell className="align-top">
                <ArmLabel arm={pair.arm} />
              </TableCell>
              <TableCell className="align-top">
                <ArmLabel arm={pair.reference} />
              </TableCell>
              <TableCell
                className="tabular text-right align-top"
                aria-label={`${pair.arm} less ${pair.reference}: ${metricText(metric, points)}`}
              >
                <MetricValue metric={metric} />
              </TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {metric.denominator !== null
                  ? formatCount(metric.denominator)
                  : metric.description || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
