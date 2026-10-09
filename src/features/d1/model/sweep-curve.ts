// The compact view of a budget sweep (ui-plan.md 9.1): one number per frame and one row per item,
// not the item lists. The harness may write `curve[]` beside an adapter's frames (its ask 2); when
// it does, that is the exact source and is preferred; otherwise the counts are derived from the
// frames, which are themselves exact. Free of the DOM, so the worker and the tests share it.

import type { RunIndexV1, SweepV1 } from "@/data/schema/generated"

export type AdapterBlock = NonNullable<SweepV1["adapters"][string]>
export type Frame = AdapterBlock["frames"][number]
export type Outcome = Frame["outcome"]

export type CurvePoint = {
  /** The budget the frame was assembled at. */
  budget: number
  outcome: Outcome
  refusalReason: string | null
  /** Tokens charged, null when nothing was assembled. */
  charged: number | null
  included: number
  compressed: number
  omitted: number
  /** One token more or less gives a different frame; false frames are coarser steps. */
  exactStep: boolean
}

export type CurveSource = "harness" | "derived"

/** The curve of one adapter's block: the harness's `curve[]` when present, else from the frames. */
export function curvePoints(block: AdapterBlock): { points: CurvePoint[]; source: CurveSource } {
  if (block.curve && block.curve.length === block.frames.length) {
    return {
      source: "harness",
      points: block.curve.map((row) => ({
        budget: row.budget_input,
        outcome: row.outcome,
        refusalReason: row.refusal_reason,
        charged: row.charged_tokens,
        included: row.included,
        compressed: row.compressed,
        omitted: row.omitted,
        exactStep: row.exact_step,
      })),
    }
  }
  return { source: "derived", points: block.frames.map(pointOfFrame) }
}

export function pointOfFrame(frame: Frame): CurvePoint {
  return {
    budget: frame.budget_input,
    outcome: frame.outcome,
    refusalReason: frame.refusal_reason,
    charged: frame.charged_tokens,
    included: frame.included.length,
    compressed: frame.included.filter((item) => item.variant_id !== null).length,
    omitted: frame.omitted.length,
    exactStep: frame.exact_step,
  }
}

export type SweepSummary = {
  runId: string
  cell: SweepV1["cell"]
  snapshot: string
  full: number
  protected: number
  floor: number | null
  threshold: number | null
  stepPercent: number
  agree: boolean
  sheddingFrom: string
  mispredicted: SweepV1["mispredicted"]
  auditFailed: SweepV1["audit_failed"]
  shedding: SweepV1["shedding"]
  timelines: string[]
  /** Per adapter, in the file's order. */
  curves: { adapter: string; source: CurveSource; points: CurvePoint[] }[]
}

/** Everything the curve and the item strip need from a sweep file, without the item lists. */
export function summarizeSweep(sweep: SweepV1): SweepSummary {
  return {
    runId: sweep.run_id,
    cell: sweep.cell,
    snapshot: sweep.snapshot,
    full: sweep.full,
    protected: sweep.protected,
    floor: sweep.floor,
    threshold: sweep.threshold,
    stepPercent: sweep.step_percent,
    agree: sweep.agree,
    sheddingFrom: sweep.shedding_from,
    mispredicted: sweep.mispredicted,
    auditFailed: sweep.audit_failed,
    shedding: sweep.shedding,
    timelines: sweep.timelines,
    curves: Object.entries(sweep.adapters).flatMap(([adapter, block]) =>
      block ? [{ adapter, ...curvePoints(block) }] : [],
    ),
  }
}

const SWEEP_PATH = /^suites\/S7\/sweeps\/([0-9a-f]{64})\.json$/

/** The sweep files a run index lists, in path order. */
export function sweepFiles(index: RunIndexV1): RunIndexV1["files"] {
  return index.files
    .filter((file) => file.kind === "sweep" && SWEEP_PATH.test(file.path))
    .sort((a, b) => a.path.localeCompare(b.path))
}

/** The digest a sweep file's path carries, or null when the path is not a sweep's. */
export function sweepDigestOf(path: string): string | null {
  return SWEEP_PATH.exec(path)?.[1] ?? null
}

export function sweepPath(digest: string): string {
  return `suites/S7/sweeps/${digest}.json`
}

/** The timeline files a run index lists, in path order. */
export function timelineFiles(index: RunIndexV1): RunIndexV1["files"] {
  return index.files
    .filter((file) => file.kind === "timeline")
    .sort((a, b) => a.path.localeCompare(b.path))
}

/** The first of a sweep's timelines the run index lists, else the run's first timeline file. */
export function walkTimelinePath(
  index: RunIndexV1,
  sweep: Pick<SweepSummary, "timelines"> | undefined,
): string | undefined {
  const listed = new Set(index.files.map((file) => file.path))
  const fromSweep = sweep?.timelines.find((path) => listed.has(path))
  return fromSweep ?? timelineFiles(index)[0]?.path
}
