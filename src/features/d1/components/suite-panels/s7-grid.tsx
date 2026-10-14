// S7's scale grid and fixed windows (ui-plan.md 8.4, 10): both from the rows, which load on request
// (5.4: a summary view never parses a row file by itself). The grid is shape × (candidates,
// tokens), each cell the share of its budget labels on which every adapter agreed, in its color
// and its text, with timeouts and skipped answers marked apart: a timeout is a warning finding
// from the fault oracle, never a failure. A cell the generator cannot build says so.

import { cn } from "cn"
import { Download } from "lucide-react"
import { useMemo, useState } from "react"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { Outcome } from "@/components/dashboard/outcome"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useResultsSource } from "@/data/queries"
import type { RunIndexV1, ScaleRowV1 } from "@/data/schema/generated"
import { useRowPage, useRows } from "@/data/use-rows"
import {
  cellKey,
  scaleGrid,
  windowRows,
  type GridCell,
  type Scale,
} from "@/features/d1/model/scale"
import { orderAdapters } from "@/lib/adapters"
import { formatCount, formatMs } from "@/lib/format"

const ROWS = "suites/S7/results.jsonl"

export function S7Rows({
  runId,
  index,
  scale,
}: {
  runId: string
  index: RunIndexV1
  scale: Scale | undefined
}) {
  const source = useResultsSource()
  const file = index.files.find((entry) => entry.path === ROWS)
  const [opened, setOpened] = useState(false)
  const handle = useRows(runId, ROWS, "scale-row", {
    expectedRows: file?.rows,
    enabled: opened && file !== undefined,
  })
  const total = handle.status === "ready" ? handle.total : 0
  const query = useMemo(() => ({ filter: {}, page: 1, pageSize: Math.max(total, 1) }), [total])
  const { page, error } = useRowPage(handle, query)
  const rows = useMemo(() => (page?.rows ?? []).map((row) => row.document as ScaleRowV1), [page])

  if (!file) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        This run lists no S7 rows, so there is no grid to draw.
      </p>
    )
  }
  const download = (
    <a
      href={source.url(runId, ROWS)}
      download
      className="inline-flex min-h-6 items-center gap-1 text-xs underline underline-offset-3"
    >
      <Download aria-hidden="true" className="size-3.5" /> Download {ROWS}
    </a>
  )
  if (!opened) {
    return (
      <div className="flex flex-wrap items-center gap-3 border border-dashed p-4 text-sm">
        <span>
          The grid and the fixed windows are drawn from the{" "}
          {file.rows === undefined ? "" : `${formatCount(file.rows)} `}rows, loaded on request.
        </span>
        <Button variant="outline" size="sm" onClick={() => setOpened(true)}>
          Draw the grid
        </Button>
        {download}
      </div>
    )
  }
  if (handle.status === "over-budget") {
    return (
      <Alert>
        <Download />
        <AlertTitle>Too many rows to draw here</AlertTitle>
        <AlertDescription>
          {formatCount(handle.rows)} rows exceed the {formatCount(handle.budget)} this viewer
          parses. {download}
        </AlertDescription>
      </Alert>
    )
  }
  if (handle.status === "error" || error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the rows</AlertTitle>
        <AlertDescription>
          {handle.status === "error" ? handle.error.message : error?.message}
        </AlertDescription>
      </Alert>
    )
  }
  if (handle.status !== "ready" || !page) {
    return (
      <div role="status" aria-label="Loading the rows" aria-busy="true">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {handle.errors.length > 0 ? (
        <p className="text-sm text-warning">
          {formatCount(handle.errors.length)} rows did not validate and are left out of the grid.
        </p>
      ) : null}
      <ScaleGridTable rows={rows} scale={scale} />
      <WindowsTable rows={windowRows(rows)} />
    </div>
  )
}

function cellTone(cell: GridCell | undefined): string {
  if (!cell || cell.notConstructible || cell.compared === 0) return "text-muted-foreground"
  if (cell.failed > 0) return "bg-failure/10 font-medium text-failure"
  if (cell.agreed < cell.compared) return "bg-warning/15"
  return "bg-success/10"
}

function cellName(cell: GridCell | undefined, shape: string, size: string): string {
  if (!cell) return `${shape}, ${size}: not run`
  if (cell.notConstructible) return `${shape}, ${size}: not constructible, ${cell.notConstructible}`
  const parts = [
    `${shape}, ${size}: every adapter agreed on ${cell.agreed} of ${cell.compared} budgets`,
  ]
  if (cell.failed > 0) parts.push(`${cell.failed} failed`)
  if (cell.timeouts > 0) parts.push(`${cell.timeouts} answers timed out`)
  if (cell.skipped > 0) parts.push(`${cell.skipped} skipped`)
  return parts.join(", ")
}

export function ScaleGridTable({
  rows,
  scale,
}: {
  rows: readonly ScaleRowV1[]
  scale: Scale | undefined
}) {
  const grid = useMemo(() => scaleGrid(rows, scale), [rows, scale])
  if (grid.shapes.length === 0) {
    return <p className="text-sm text-muted-foreground">The rows hold no grid cells.</p>
  }
  const sizeLabel = (size: { candidates: number; tokens: number }) =>
    `${formatCount(size.candidates)} × ${formatCount(size.tokens)}`
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">The grid</h3>
      <p className="text-sm text-muted-foreground">
        Each shape at each size (candidates × candidate tokens)
        {grid.components ? `, ${grid.components.tokenizer} and ${grid.components.renderer}` : ""}:
        the budgets on which every adapter gave the same answer, of those answered by more than one.
        {grid.componentRows > 0
          ? ` ${formatCount(grid.componentRows)} rows at other tokenizers and renderers are in the rows table.`
          : ""}
      </p>
      <TableRegion label="Scale grid">
        <Table>
          <TableCaption className="sr-only">
            Shapes down, sizes across; each cell the budgets every adapter agreed on, with timeouts
            and skipped answers, or why the cell cannot be built.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Shape</TableHead>
              {grid.sizes.map((size) => (
                <TableHead key={sizeLabel(size)} scope="col" className="text-right text-xs">
                  {formatCount(size.candidates)}
                  <span className="block text-muted-foreground">× {formatCount(size.tokens)}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grid.shapes.map((shape) => (
              <TableRow key={shape} data-shape={shape}>
                <TableCell scope="row" className="text-sm font-medium">
                  {shape}
                </TableCell>
                {grid.sizes.map((size) => {
                  const cell = grid.cells.get(
                    cellKey({ shape, candidates: size.candidates, candidate_tokens: size.tokens }),
                  )
                  const name = cellName(cell, shape, sizeLabel(size))
                  return (
                    <TableCell
                      key={sizeLabel(size)}
                      className={cn("tabular text-right text-xs", cellTone(cell))}
                      aria-label={name}
                      title={name}
                    >
                      {!cell ? (
                        "—"
                      ) : cell.notConstructible ? (
                        <span className="italic">n/c</span>
                      ) : (
                        <>
                          {formatCount(cell.agreed)}/{formatCount(cell.compared)}
                          {cell.timeouts > 0 ? (
                            <span className="block text-warning">
                              ⏱ {formatCount(cell.timeouts)}
                            </span>
                          ) : null}
                          {cell.skipped > 0 ? (
                            <span className="block text-muted-foreground">
                              skip {formatCount(cell.skipped)}
                            </span>
                          ) : null}
                        </>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
      <p className="text-xs text-muted-foreground">
        Green when every adapter agreed at every budget, amber when they differed at some, red when
        a row failed. ⏱ counts answers that hit the timeout and skip the answers not asked for after
        one: performance warnings, not failures. n/c: the generator cannot build the cell.
      </p>
    </div>
  )
}

function WindowsTable({ rows }: { rows: readonly ScaleRowV1[] }) {
  if (rows.length === 0) return null
  const adapters = orderAdapters([
    ...new Set(rows.flatMap((row) => row.answers.map((a) => a.adapter))),
  ])
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Fixed windows</h3>
      <p className="text-sm text-muted-foreground">
        One cell at fixed budgets, the viability document&apos;s case of a large context into a
        model&apos;s window among them: each adapter&apos;s outcome and wall time. Wall times are
        taken while the grid runs concurrently; the performance page has the measurements.
      </p>
      <TableRegion label="Fixed windows table">
        <Table>
          <TableCaption className="sr-only">
            One row per window: the cell, the budget, each adapter&apos;s outcome and wall time, and
            whether they agree.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Window</TableHead>
              <TableHead scope="col">Cell</TableHead>
              {adapters.map((adapter) => (
                <TableHead key={adapter} scope="col" className="text-right">
                  <AdapterMark adapter={adapter} />
                </TableHead>
              ))}
              <TableHead scope="col">Agree</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.case_id} data-window={row.label}>
                <TableCell className="tabular">
                  {formatCount(Number(row.label.slice("window:".length)))}
                </TableCell>
                <TableCell className="text-xs">
                  {row.cell.shape}, {formatCount(row.cell.candidates)} ×{" "}
                  {formatCount(row.cell.candidate_tokens)}
                </TableCell>
                {adapters.map((adapter) => {
                  const answer = row.answers.find((a) => a.adapter === adapter)
                  const skipped = row.skipped.find((s) => s.adapter === adapter)
                  return (
                    <TableCell key={adapter} className="text-right text-xs">
                      {answer ? (
                        <>
                          <Outcome value={answer.outcome} />
                          <span className="tabular block">{formatMs(answer.wall_ms)}</span>
                        </>
                      ) : skipped ? (
                        <span className="text-muted-foreground" title={skipped.reason}>
                          skipped
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )
                })}
                <TableCell>
                  {row.answers.length < 2 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : row.agree ? (
                    <StatusBadge status="pass" label="agree" />
                  ) : (
                    <StatusBadge status="warning" label="differ" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
    </div>
  )
}
