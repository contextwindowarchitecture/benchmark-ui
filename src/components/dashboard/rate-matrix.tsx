import { cn } from "cn"
import type { ReactNode } from "react"

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCount, formatPercent } from "@/lib/format"

import { TableRegion } from "./table-region"

export type Fraction = { exercised: number; passed: number }

export type MatrixColumn = { id: string; label: ReactNode; name: string }

export type MatrixRow = {
  id: string
  label: ReactNode
  /** The row's accessible name, joined with the column's in every cell. */
  name: string
  cells: ReadonlyMap<string, Fraction | undefined>
}

function tone(rate: number | null, exercised: boolean): string {
  if (!exercised) return "text-muted-foreground"
  if (rate === 1) return "bg-success/10"
  if (rate !== null && rate >= 0.9) return "bg-warning/15"
  return "bg-failure/10 font-medium text-failure"
}

/**
 * A rate matrix (DESIGN.md 7): the rate in the cell's color, the count in its text, the numerator
 * and denominator in its accessible name, and an exercised cell at zero told apart from an
 * unexercised one. It is a table, so it is its own table alternative.
 */
export function RateMatrix({
  columns,
  rows,
  rowHeader,
  caption,
  label,
  className,
}: {
  columns: MatrixColumn[]
  rows: MatrixRow[]
  rowHeader: string
  caption: string
  label: string
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <TableRegion label={label}>
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{rowHeader}</TableHead>
              {columns.map((column) => (
                <TableHead key={column.id} scope="col" className="text-right">
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-row={row.id}>
                <TableCell scope="row" className="align-top">
                  {row.label}
                </TableCell>
                {columns.map((column) => {
                  const cell = row.cells.get(column.id)
                  const exercised = cell !== undefined && cell.exercised > 0
                  const rate = exercised ? cell.passed / cell.exercised : null
                  const name = exercised
                    ? `${row.name}, ${column.name}: ${formatCount(cell.passed)} of ${formatCount(cell.exercised)} passed, ${formatPercent(rate ?? 0)}`
                    : `${row.name}, ${column.name}: not exercised`
                  return (
                    <TableCell
                      key={column.id}
                      className={cn("tabular text-right align-top text-xs", tone(rate, exercised))}
                      data-exercised={exercised ? "true" : "false"}
                      aria-label={name}
                      title={name}
                    >
                      {exercised ? (
                        <>
                          {formatCount(cell.passed)}
                          <span className="font-light"> / {formatCount(cell.exercised)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
    </div>
  )
}

/** The legend every rate matrix shares. */
export function RateMatrixLegend() {
  return (
    <p className="text-xs text-muted-foreground">
      Passed of exercised. Green when every exercised row passed, amber from 90%, red below; a dash
      is a cell nothing exercised, which is not a zero.
    </p>
  )
}
