// The sweeps of a run (ui-plan.md 8.8), from S7's typed summary: each cell, its frames, whether the
// adapters agree frame for frame, the threshold the sweep found against the harness's computed
// one, and the viewer link. No sweep file is opened: the list stays cheap however large they are.

import { Link } from "react-router"

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
import type { SweepRow } from "@/features/d1/model/scale"
import { formatCount } from "@/lib/format"

export function SweepsTable({
  runId,
  rows,
  shapes,
}: {
  runId: string
  rows: readonly SweepRow[]
  /** The shapes' descriptions, from the summary. */
  shapes?: Record<string, string | undefined>
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">This run made no sweeps.</p>
  }
  return (
    <TableRegion label="Sweeps table">
      <Table>
        <TableCaption className="sr-only">
          One row per sweep: the cell, the frames per adapter, whether every adapter&apos;s frames
          agree, the refusal threshold found against the one the harness computed, frames not as
          predicted, audit checks failed, and the timelines written.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Shape</TableHead>
            <TableHead className="text-right">Candidates</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead>Components</TableHead>
            <TableHead className="text-right">Frames</TableHead>
            <TableHead className="text-right">Exact steps</TableHead>
            <TableHead>Adapters</TableHead>
            <TableHead className="text-right">Threshold</TableHead>
            <TableHead>Checks</TableHead>
            <TableHead className="text-right">Timelines</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { cell } = row.sweep
            const matches = row.sweep.threshold === row.sweep.computed
            return (
              <TableRow key={row.sweep.path} data-sweep={row.digest ?? row.sweep.path}>
                <TableCell className="min-w-48">
                  {row.listed && row.digest ? (
                    <Link
                      to={`/d1/runs/${runId}/sweeps/${row.digest}`}
                      className="font-medium underline underline-offset-3"
                    >
                      {cell.shape}
                    </Link>
                  ) : (
                    <span className="font-medium">{cell.shape}</span>
                  )}
                  {shapes?.[cell.shape] ? (
                    <span className="block max-w-sm text-xs text-muted-foreground">
                      {shapes[cell.shape]}
                    </span>
                  ) : null}
                  {!row.listed ? (
                    <span className="block text-xs text-warning">
                      Not in the run&apos;s file list: {row.sweep.path}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">{formatCount(cell.candidates)}</TableCell>
                <TableCell className="text-right">{formatCount(cell.candidate_tokens)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {cell.tokenizer}
                  <br />
                  {cell.renderer}
                </TableCell>
                <TableCell className="text-right">
                  {row.uniformFrames !== null ? (
                    formatCount(row.uniformFrames)
                  ) : (
                    <ul className="space-y-0.5">
                      {row.frames.map((entry) => (
                        <li key={entry.adapter} className="flex justify-end gap-1.5">
                          <AdapterMark adapter={entry.adapter} symbolOnly />
                          {formatCount(entry.frames)}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCount(row.sweep.exact_steps)}</TableCell>
                <TableCell>
                  {row.sweep.agree ? (
                    <StatusBadge status="pass" label={`${row.frames.length} agree`} />
                  ) : (
                    <StatusBadge status="warning" label="disagree" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {row.sweep.threshold === null ? "—" : formatCount(row.sweep.threshold)}
                  <span
                    className={
                      matches ? "block text-xs text-muted-foreground" : "block text-xs text-warning"
                    }
                  >
                    {matches ? "as computed" : `computed ${formatCount(row.sweep.computed)}`}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {row.mispredicted === 0 && row.auditFailed.length === 0 ? (
                    <span className="text-muted-foreground">as predicted, audit clean</span>
                  ) : (
                    <span className="text-warning">
                      {row.mispredicted > 0
                        ? `${formatCount(row.mispredicted)} frames not as predicted`
                        : null}
                      {row.mispredicted > 0 && row.auditFailed.length > 0 ? "; " : null}
                      {row.auditFailed.length > 0
                        ? `audit failed ${row.auditFailed.join(", ")}`
                        : null}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCount(row.sweep.timelines)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
