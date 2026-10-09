import { cn } from "cn"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
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
import { environmentMatrix, rateOf, type MatrixCell } from "@/features/d1/model/suite"
import { adapterLabel } from "@/lib/adapters"
import { formatCount } from "@/lib/format"

const HATCHED =
  "bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--color-muted)_6px_8px)] text-muted-foreground"

function tone(cell: MatrixCell): string {
  const rates = [rateOf(cell.decision), rateOf(cell.payload), rateOf(cell.trace)].filter(
    (rate): rate is number => rate !== null,
  )
  if (rates.length === 0) return ""
  const min = Math.min(...rates)
  if (min === 1 && cell.faults === 0) return "bg-success/10"
  if (min >= 0.99 && cell.faults === 0) return "bg-warning/15"
  return "bg-failure/10"
}

const fraction = (f: { numerator: number; denominator: number }) =>
  `${formatCount(f.numerator)} / ${formatCount(f.denominator)}`

/**
 * The environment matrix (ui-plan.md 8.4, 10): cells down, adapters across, each with its
 * decision, payload and trace fractions, colored by the lowest rate and hatched when the cell
 * could not be applied. The numerators and denominators are in every cell's accessible name.
 */
export function EnvironmentMatrix({
  cells,
  label,
}: {
  cells: readonly MatrixCell[]
  label: string
}) {
  const { rows, adapters } = environmentMatrix(cells)
  if (rows.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        No cells were run.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <TableRegion label={label}>
        <Table>
          <TableCaption className="sr-only">
            Answers matching the reference per cell and adapter: decision, payload and trace.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Cell</TableHead>
              {adapters.map((adapter) => (
                <TableHead key={adapter} scope="col">
                  <AdapterMark adapter={adapter} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.cell}|${row.platform}`} data-cell={row.cell}>
                <TableCell scope="row" className="align-top">
                  <div className="font-mono text-xs">{row.cell}</div>
                  <div className="max-w-xs text-xs text-muted-foreground">{row.description}</div>
                  <div className="font-mono text-[0.7rem] text-muted-foreground">
                    {row.platform}
                  </div>
                </TableCell>
                {adapters.map((adapter) => {
                  const cell = row.byAdapter.get(adapter)
                  if (!cell) {
                    return (
                      <TableCell key={adapter} className="align-top text-xs text-muted-foreground">
                        —
                      </TableCell>
                    )
                  }
                  const applied = cell.applied > 0
                  const name = applied
                    ? `${adapterLabel(adapter)} ${row.cell}: decision ${fraction(cell.decision)}, payload ${fraction(cell.payload)}, trace ${fraction(cell.trace)}, ${formatCount(cell.faults)} faults, ${formatCount(cell.not_applied)} not applied`
                    : `${adapterLabel(adapter)} ${row.cell}: not applied in ${formatCount(cell.not_applied)} invocations`
                  return (
                    <TableCell
                      key={adapter}
                      className={cn("align-top text-xs", applied ? tone(cell) : HATCHED)}
                      data-applied={applied ? "true" : "false"}
                      aria-label={name}
                      title={name}
                    >
                      {applied ? (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-2 tabular">
                          <dt className="text-muted-foreground">D</dt>
                          <dd>{fraction(cell.decision)}</dd>
                          <dt className="text-muted-foreground">P</dt>
                          <dd>{fraction(cell.payload)}</dd>
                          <dt className="text-muted-foreground">T</dt>
                          <dd>{fraction(cell.trace)}</dd>
                        </dl>
                      ) : (
                        <span>not applied</span>
                      )}
                      {cell.faults > 0 ? (
                        <div className="mt-1 font-medium text-failure">
                          {formatCount(cell.faults)} {cell.faults === 1 ? "fault" : "faults"}
                        </div>
                      ) : null}
                      {applied && cell.not_applied > 0 ? (
                        <div className="mt-1 text-muted-foreground">
                          {formatCount(cell.not_applied)} not applied
                        </div>
                      ) : null}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
      <p className="text-xs text-muted-foreground">
        D decision, P payload, T trace: answers matching the host baseline's, of those compared.
        Green when every fraction is whole, amber from 99%, red below or with a fault; hatched when
        the cell could not be applied to that adapter.
      </p>
    </div>
  )
}
