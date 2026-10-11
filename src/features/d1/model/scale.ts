// Pure selectors over S7's typed `scale` block and its rows (ui-plan.md 8.4's S7 row, 8.8): the
// sweeps list, the threshold searches by cell, and the scale grid. Nothing here judges anything:
// the harness's statuses and verdicts are carried, and counts are counted.

import type { RunIndexV1, ScaleRowV1, SuiteSummaryV1 } from "@/data/schema/generated"
import { orderAdapters } from "@/lib/adapters"

import { sweepDigestOf } from "./sweep-curve"

export type Scale = NonNullable<SuiteSummaryV1["scale"]>
export type ScaleSweep = Scale["sweeps"][number]
export type ScaleThreshold = Scale["thresholds"][number]
export type ScaleCell = ScaleSweep["cell"]

export type SweepRow = {
  sweep: ScaleSweep
  digest: string | null
  /** Every adapter's frame count, in the adapters' order. */
  frames: { adapter: string; frames: number }[]
  /** The one frame count when every adapter has the same, else null. */
  uniformFrames: number | null
  /** Frames whose outcome differs from the rules', over every adapter. */
  mispredicted: number
  /** Audit checks any adapter's frame failed. */
  auditFailed: string[]
  /** The run's index lists the sweep file, so the viewer can open it. */
  listed: boolean
}

/** The sweeps the summary names, each with what the run's index says of its file. */
export function sweepRows(scale: Scale, index: RunIndexV1): SweepRow[] {
  const listed = new Set(index.files.map((file) => file.path))
  return scale.sweeps.map((sweep) => {
    const adapters = orderAdapters(Object.keys(sweep.frames))
    const frames = adapters.map((adapter) => ({ adapter, frames: sweep.frames[adapter] ?? 0 }))
    const counts = new Set(frames.map((entry) => entry.frames))
    return {
      sweep,
      digest: sweepDigestOf(sweep.path),
      frames,
      uniformFrames: counts.size === 1 ? (frames[0]?.frames ?? null) : null,
      mispredicted: Object.values(sweep.mispredicted).reduce<number>((sum, n) => sum + (n ?? 0), 0),
      auditFailed: [
        ...new Set(Object.values(sweep.audit_failed).flatMap((checks) => checks ?? [])),
      ].sort(),
      listed: listed.has(sweep.path),
    }
  })
}

/** A key for a cell by its shape and size, for grouping. */
export function cellKey(
  cell: Pick<ScaleCell, "shape" | "candidates" | "candidate_tokens">,
): string {
  return `${cell.shape}|${cell.candidates}|${cell.candidate_tokens}`
}

export type ThresholdCell = {
  cell: ScaleThreshold["cell"]
  /** Each adapter's search, in the adapters' order. */
  searches: ScaleThreshold[]
}

/** The threshold searches grouped by cell, in the summary's order, adapters in theirs. */
export function thresholdCells(scale: Scale): ThresholdCell[] {
  const groups = new Map<string, ThresholdCell>()
  for (const search of scale.thresholds) {
    const key = `${cellKey(search.cell)}|${search.cell.tokenizer}|${search.cell.renderer}`
    const group = groups.get(key) ?? { cell: search.cell, searches: [] }
    group.searches.push(search)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    const order = orderAdapters(group.searches.map((search) => search.adapter))
    group.searches.sort((a, b) => order.indexOf(a.adapter) - order.indexOf(b.adapter))
  }
  return [...groups.values()]
}

/** One shape at one size of the grid, over its budget labels. */
export type GridCell = {
  shape: string
  candidates: number
  tokens: number
  /** Rows at this cell: one per budget label. */
  rows: number
  /** Rows at least two adapters answered, and those whose answers agree. */
  compared: number
  agreed: number
  /** Rows the harness judged failed. */
  failed: number
  /** Answers that timed out, and answers skipped after a timeout. */
  timeouts: number
  skipped: number
  /** Why the generator cannot build the cell, when it cannot. */
  notConstructible: string | null
}

export type ScaleGrid = {
  shapes: string[]
  sizes: { candidates: number; tokens: number }[]
  cells: Map<string, GridCell>
  /** The tokenizer and renderer of the grid; rows at other components are counted apart. */
  components: { tokenizer: string; renderer: string } | null
  componentRows: number
}

const isGridLabel = (label: string) => label.startsWith("ratio:") || label === "threshold-1"

/**
 * The scale grid (ui-plan.md 8.4, 10): shape × (candidates, tokens) at the grid's tokenizer and
 * renderer (those of most of its rows), each cell's budget labels counted. Fixed-window rows are
 * the window table's; rows at the other components are counted, not drawn.
 */
export function scaleGrid(rows: readonly ScaleRowV1[], scale: Scale | undefined): ScaleGrid {
  const gridRows = rows.filter((row) => isGridLabel(row.label))
  const tally = new Map<string, number>()
  for (const row of gridRows) {
    const key = `${row.cell.tokenizer}|${row.cell.renderer}`
    tally.set(key, (tally.get(key) ?? 0) + 1)
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const components = top
    ? { tokenizer: top.split("|")[0] ?? "", renderer: top.split("|")[1] ?? "" }
    : null
  const inGrid = gridRows.filter(
    (row) =>
      components !== null &&
      row.cell.tokenizer === components.tokenizer &&
      row.cell.renderer === components.renderer,
  )
  const cells = new Map<string, GridCell>()
  const cellOf = (shape: string, candidates: number, tokens: number): GridCell => {
    const key = cellKey({ shape, candidates, candidate_tokens: tokens })
    let cell = cells.get(key)
    if (!cell) {
      cell = {
        shape,
        candidates,
        tokens,
        rows: 0,
        compared: 0,
        agreed: 0,
        failed: 0,
        timeouts: 0,
        skipped: 0,
        notConstructible: null,
      }
      cells.set(key, cell)
    }
    return cell
  }
  for (const row of inGrid) {
    const cell = cellOf(row.cell.shape, row.cell.candidates, row.cell.candidate_tokens)
    cell.rows++
    if (row.not_constructible) cell.notConstructible = row.not_constructible
    if (row.answers.length >= 2) {
      cell.compared++
      if (row.agree) cell.agreed++
    }
    if (row.verdict === "failed") cell.failed++
    cell.timeouts += row.answers.filter((answer) => answer.outcome === "timeout").length
    cell.skipped += row.skipped.length
  }
  for (const entry of scale?.not_constructible ?? []) {
    const cell = cellOf(entry.shape, entry.candidates, entry.candidate_tokens)
    cell.notConstructible ??= entry.why
  }
  const known = Object.keys(scale?.shapes ?? {})
  const present = new Set([...cells.values()].map((cell) => cell.shape))
  const shapes = [
    ...known.filter((shape) => present.has(shape)),
    ...[...present].filter((shape) => !known.includes(shape)).sort(),
  ]
  const sizes = [
    ...new Map(
      [...cells.values()].map((cell) => [
        `${cell.candidates}|${cell.tokens}`,
        { candidates: cell.candidates, tokens: cell.tokens },
      ]),
    ).values(),
  ].sort((a, b) => a.candidates - b.candidates || a.tokens - b.tokens)
  return {
    shapes,
    sizes,
    cells,
    components,
    componentRows: gridRows.length - inGrid.length,
  }
}

/** The fixed-window rows (`window:<tokens>`), smallest window first. */
export function windowRows(rows: readonly ScaleRowV1[]): ScaleRowV1[] {
  const size = (label: string) => Number(label.slice("window:".length))
  return rows
    .filter((row) => row.label.startsWith("window:"))
    .sort((a, b) => size(a.label) - size(b.label))
}
