// A share per arm as an arm plot (UI-D2c): the producer's tally, k of n, for each arm at a budget
// and the upper bounds at no budget, with the table of every tally beside it; and a typed metric
// per arm the same way.

import { ArmPlot } from "@/components/charts/arm-plot"
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
import { tierLabel } from "@/features/d2/model/metrics"
import type { ArmRowWithMetrics } from "@/features/d2/model/overview"
import type { ShareRow } from "@/features/d2/model/questions"
import { formatCount, formatPercent, formatRate } from "@/lib/format"

import { ArmLabel } from "../arm-label"
import { useArmVocabulary } from "@/features/shared/vocabulary"

import { percentTick } from "../evidence/arm-groups"
import { ShareCell } from "../grouped-arm-table"
import { MetricValue } from "../metric-value"

export function ShareTable({
  rows,
  label,
  header,
}: {
  rows: readonly ShareRow[]
  label: string
  header: string
}) {
  return (
    <TableRegion label={label}>
      <Table>
        <TableCaption className="sr-only">{label}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Arm</TableHead>
            <TableHead scope="col">Tier</TableHead>
            <TableHead scope="col" className="text-right">
              {header}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} data-arm={row.id}>
              <TableCell>
                <ArmLabel arm={row.id} showPayload />
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">{tierLabel(row.tier)}</TableCell>
              <TableCell
                className="tabular text-right"
                aria-label={`${row.id}: ${formatRate(row.value, row.tally.k, row.tally.n)}`}
              >
                <ShareCell
                  percent={row.value === null ? null : formatPercent(row.value)}
                  fraction={`${formatCount(row.tally.k)} / ${formatCount(row.tally.n)}`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}

/**
 * The shares as an arm plot: a dot on a rate's full scale (how many met the measure), or a bar
 * from zero on a scale fitted to the values (how many fell into a kind of error).
 */
export function SharePlot({
  rows,
  title,
  summary,
  legend,
  header,
  mark = "dot",
  reference,
}: {
  rows: readonly ShareRow[]
  title: string
  summary: string
  legend: string
  header: string
  mark?: "dot" | "bar"
  reference?: { value: number; label: string } | null
}) {
  const { groups } = useArmVocabulary()
  if (rows.length === 0) {
    return (
      <p className="border border-dashed p-4 text-sm text-muted-foreground" data-state="empty">
        No arm has a tally for this in the run read.
      </p>
    )
  }
  return (
    <ArmPlot
      title={title}
      summary={summary}
      rows={rows}
      groups={groups}
      domain={mark === "dot" ? [0, 1] : "auto"}
      mark={mark}
      format={(value) => formatPercent(value)}
      formatTick={percentTick}
      reference={reference ?? null}
      legend={{ mark: legend }}
      table={<ShareTable rows={rows} label={title} header={header} />}
    />
  )
}

/** One typed metric per arm as an arm plot, the producer's value and interval in the table. */
export function MetricPlot({
  rows,
  title,
  summary,
  legend,
  header,
  mark,
  domain,
  format,
  formatTick,
}: {
  rows: readonly ArmRowWithMetrics[]
  title: string
  summary: string
  legend: string
  header: string
  mark: "dot" | "bar"
  domain: readonly [number, number] | "auto"
  format: (value: number) => string
  formatTick?: (value: number) => string
}) {
  const vocabulary = useArmVocabulary()
  const { groups } = vocabulary
  if (rows.length === 0) {
    return (
      <p className="border border-dashed p-4 text-sm text-muted-foreground" data-state="empty">
        No arm has this metric in the run read.
      </p>
    )
  }
  const withInterval = rows.find((row) => row.metric.interval)?.metric
  const interval = withInterval ? vocabulary.intervalWords(withInterval) : null
  return (
    <ArmPlot
      title={title}
      summary={summary}
      rows={rows}
      groups={groups}
      domain={domain}
      mark={mark}
      format={format}
      formatTick={formatTick ?? format}
      legend={{ mark: legend, interval: interval ?? undefined }}
      table={
        <TableRegion label={title}>
          <Table>
            <TableCaption className="sr-only">{title}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Arm</TableHead>
                <TableHead scope="col">Tier</TableHead>
                <TableHead scope="col" className="text-right">
                  {header}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} data-arm={row.id}>
                  <TableCell>
                    <ArmLabel arm={row.id} showPayload />
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{tierLabel(row.tier)}</TableCell>
                  <TableCell className="tabular text-right">
                    <MetricValue metric={row.metric} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      }
    />
  )
}
