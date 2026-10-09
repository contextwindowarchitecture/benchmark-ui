import { TriangleAlert } from "lucide-react"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MIN_FIT_POINTS } from "@/data/budgets"
import type { PerfSummaryV1 } from "@/data/schema/generated"
import {
  EXPONENT_METHOD,
  EXPONENT_SERIES,
  medianExponents,
  NO_PRESSURE_LABEL,
  PRESSURE_LABEL,
} from "@/features/d1/model/overview"
import { formatCount, formatExponent } from "@/lib/format"

/**
 * The write-up's table of pressure exponents (ui-plan.md 8.1, item 2): the median in-process
 * exponent per adapter over shapes, with and without budget pressure, from the perf summary's
 * fits. An unreliable summary shows the banner and no numbers (5.6).
 */
export function ExponentsTable({ perf, runId }: { perf: PerfSummaryV1; runId: string }) {
  if (!perf.reliable || perf.host_suspended_seconds > 0) {
    return (
      <Alert data-state="unreliable">
        <TriangleAlert className="text-warning" />
        <AlertTitle>The harness marks this run's timings unreliable</AlertTitle>
        <AlertDescription>
          {perf.host_suspended_seconds > 0
            ? `The host was suspended for ${perf.host_suspended_seconds} s during the run. `
            : ""}
          No exponent is shown; the{" "}
          <Link to={`/d1/runs/${runId}/perf`} className="underline underline-offset-3">
            performance page
          </Link>{" "}
          carries the banner over every chart.
        </AlertDescription>
      </Alert>
    )
  }
  const rows = medianExponents(perf)
  if (rows.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        The perf summary has no fits.
      </p>
    )
  }
  const shapes = Math.max(
    ...rows.map((row) => Math.max(row.shapes.noPressure, row.shapes.pressure)),
  )
  const fewPoints = rows.some(
    (row) => row.fewestPoints !== null && row.fewestPoints < MIN_FIT_POINTS,
  )
  return (
    <div className="space-y-2">
      <TableRegion label="Pressure exponents table">
        <Table>
          <TableCaption className="sr-only">
            Median in-process scaling exponent per adapter, over shapes, without and with budget
            pressure.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Adapter</TableHead>
              <TableHead scope="col" className="text-right">
                No budget pressure
              </TableHead>
              <TableHead scope="col" className="text-right">
                Budget at 10% of the candidates' tokens
              </TableHead>
              <TableHead scope="col" className="text-right">
                Shapes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.adapter} data-adapter={row.adapter}>
                <TableCell scope="row">
                  <AdapterMark adapter={row.adapter} />
                </TableCell>
                <TableCell className="tabular text-right">
                  {row.noPressure === null ? "—" : formatExponent(row.noPressure)}
                </TableCell>
                <TableCell className="tabular text-right">
                  {row.pressure === null ? "—" : formatExponent(row.pressure)}
                </TableCell>
                <TableCell className="tabular text-right text-muted-foreground">
                  {formatCount(row.shapes.noPressure)} / {formatCount(row.shapes.pressure)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
      <p className="text-xs text-muted-foreground">
        Each exponent is the median over {formatCount(shapes)} {shapes === 1 ? "shape" : "shapes"}{" "}
        of the harness's {EXPONENT_METHOD} fits on the {EXPONENT_SERIES} series at labels{" "}
        {NO_PRESSURE_LABEL} and {PRESSURE_LABEL}; the median is this view's, each fit's exponent,
        standard error and r² are the harness's and sit on the{" "}
        <Link to={`/d1/runs/${runId}/perf`} className="underline underline-offset-3">
          performance page
        </Link>
        . Time grows linearly with the payload without pressure and nearly quadratically under it.
        {fewPoints ? ` Some fits use fewer than ${MIN_FIT_POINTS} points.` : ""} From run{" "}
        <span className="font-mono">{runId}</span>.
      </p>
    </div>
  )
}
