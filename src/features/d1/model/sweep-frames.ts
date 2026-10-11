// Which items each frame of a sweep kept (ui-plan.md 9.1, 9.2): the item strip's data. A frame's
// `included[]` and `omitted[]` are exact, so each item's state at each frame is read off them, not
// inferred from the shedding list's first budgets. Compact enough to cross from the worker in one
// message: one byte per item per frame, and the variant ids only where a frame used one. Free of
// the DOM, so the worker and the tests share it.

import type { SweepV1 } from "@/data/schema/generated"

import type { AdapterBlock, Frame } from "./sweep-curve"

/** An item's state in one frame. */
export const ITEM_STATE = {
  /** The frame names it in neither list: a refusal, or an item the frame never saw. */
  absent: 0,
  /** Included at its full size. */
  whole: 1,
  /** Included as a variant (compressed). */
  variant: 2,
  /** Omitted over budget. */
  omitted: 3,
} as const

export type ItemState = (typeof ITEM_STATE)[keyof typeof ITEM_STATE]

export type SweepItem = {
  id: string
  slot: string | null
  tier: string | null
  /** The largest budget at which the item was compressed, then omitted (the shedding list's). */
  firstCompressedAt: number | null
  firstOmittedAt: number | null
}

export type AdapterFrames = {
  adapter: string
  /** Each frame's budget, in the file's order (descending). */
  budgets: number[]
  /** Frames × items, row-major: `states[frame * items + item]`. */
  states: Uint8Array
  /** Per frame, the items included as a variant and the variant's id. */
  variants: [item: number, variant: string][][]
  /** Per frame: the outcome or refusal code differs from the one the rules predict. */
  mispredicted: boolean[]
  /** Per frame: the audit checks the answer failed. */
  auditFailed: string[][]
}

export type SweepFrames = {
  /** Every item, in shedding order, then any item a frame names that the shedding list does not. */
  items: SweepItem[]
  adapters: AdapterFrames[]
}

function mispredictedFrame(frame: Frame): boolean {
  const [outcome, reason] = frame.predicted
  return outcome !== frame.outcome || reason !== frame.refusal_reason
}

/** The item states of every adapter's frames. */
export function sweepFrames(sweep: SweepV1): SweepFrames {
  const items: SweepItem[] = sweep.shedding.map((entry) => ({
    id: entry.item_id,
    slot: entry.slot,
    tier: entry.tier,
    firstCompressedAt: entry.first_compressed_at,
    firstOmittedAt: entry.first_omitted_at,
  }))
  const position = new Map(items.map((item, i) => [item.id, i]))
  const blocks = Object.entries(sweep.adapters).filter(
    (entry): entry is [string, AdapterBlock] => entry[1] !== undefined,
  )
  // Items a frame names that the shedding list does not (a disagreeing adapter's, say) still get a row.
  for (const [, block] of blocks) {
    for (const frame of block.frames) {
      for (const row of frame.included) {
        if (row.item_id !== null && !position.has(row.item_id)) {
          position.set(row.item_id, items.length)
          items.push({
            id: row.item_id,
            slot: row.slot,
            tier: null,
            firstCompressedAt: null,
            firstOmittedAt: null,
          })
        }
      }
      for (const id of frame.omitted) {
        if (id !== null && !position.has(id)) {
          position.set(id, items.length)
          items.push({ id, slot: null, tier: null, firstCompressedAt: null, firstOmittedAt: null })
        }
      }
    }
  }
  const width = items.length
  const adapters = blocks.map(([adapter, block]): AdapterFrames => {
    const states = new Uint8Array(block.frames.length * width)
    const variants: [number, string][][] = []
    block.frames.forEach((frame, f) => {
      const base = f * width
      const used: [number, string][] = []
      for (const row of frame.included) {
        const i = row.item_id === null ? undefined : position.get(row.item_id)
        if (i === undefined) continue
        if (row.variant_id) {
          states[base + i] = ITEM_STATE.variant
          used.push([i, row.variant_id])
        } else {
          states[base + i] = ITEM_STATE.whole
        }
      }
      for (const id of frame.omitted) {
        const i = id === null ? undefined : position.get(id)
        if (i !== undefined) states[base + i] = ITEM_STATE.omitted
      }
      variants.push(used)
    })
    return {
      adapter,
      budgets: block.frames.map((frame) => frame.budget_input),
      states,
      variants,
      mispredicted: block.frames.map(mispredictedFrame),
      auditFailed: block.frames.map((frame) => frame.audit_failed),
    }
  })
  return { items, adapters }
}

/** An item's state at a frame; absent outside the frames. */
export function stateAt(
  frames: AdapterFrames,
  items: number,
  frame: number,
  item: number,
): ItemState {
  if (frame < 0 || frame >= frames.budgets.length || item < 0 || item >= items) {
    return ITEM_STATE.absent
  }
  return (frames.states[frame * items + item] ?? ITEM_STATE.absent) as ItemState
}

/** How many items a frame holds in each state. */
export function frameCounts(
  frames: AdapterFrames,
  items: number,
  frame: number,
): Record<"whole" | "variant" | "omitted", number> {
  const counts = { whole: 0, variant: 0, omitted: 0 }
  for (let i = 0; i < items; i++) {
    const state = stateAt(frames, items, frame, i)
    if (state === ITEM_STATE.whole) counts.whole++
    else if (state === ITEM_STATE.variant) counts.variant++
    else if (state === ITEM_STATE.omitted) counts.omitted++
  }
  return counts
}

/** The timeline files a sweep names for one adapter (`timelines/<digest>/<adapter>.json`). */
export function adapterTimelines(paths: readonly string[], adapter: string): string[] {
  return paths.filter((path) => path.endsWith(`/${adapter}.json`))
}

export type PlacedTimeline = { path: string; frame: number }

/** Each timeline at the frame whose budget its counters name; a budget no frame has is dropped. */
export function placeTimelines(
  budgets: readonly number[],
  timelines: readonly { path: string; budget: number }[],
): PlacedTimeline[] {
  const frameOf = new Map(budgets.map((budget, frame) => [budget, frame]))
  return timelines
    .flatMap((timeline) => {
      const frame = frameOf.get(timeline.budget)
      return frame === undefined ? [] : [{ path: timeline.path, frame }]
    })
    .sort((a, b) => a.frame - b.frame)
}

/** The timeline at a frame, else the nearest frame's (the earlier one on a tie), else none. */
export function nearestTimeline(
  placed: readonly PlacedTimeline[],
  frame: number,
): (PlacedTimeline & { exact: boolean }) | null {
  let best: PlacedTimeline | null = null
  for (const timeline of placed) {
    if (!best || Math.abs(timeline.frame - frame) < Math.abs(best.frame - frame)) best = timeline
  }
  return best ? { ...best, exact: best.frame === frame } : null
}
