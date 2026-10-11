// Pure selectors over S7's typed `scale` block and its rows (ui-plan.md 8.4's S7 row, 8.8): the
// sweeps list, the threshold searches by cell, and the scale grid. Nothing here judges anything:
// the harness's statuses and verdicts are carried, and counts are counted.

import type { RunIndexV1, SuiteSummaryV1 } from "@/data/schema/generated"
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
