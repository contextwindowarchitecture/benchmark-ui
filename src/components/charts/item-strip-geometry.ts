// The item strip's geometry (ui-plan.md 9.2; DESIGN.md 7): one row per item, grouped by tier in
// shedding order, on the shedding curve's budget axis (full on the left, shrinking to the right).
// Each row's segments are the frames' own states, merged where consecutive frames agree: a frame's
// state holds from its budget to the next frame's, as the curve steps. D3 computes the scale,
// React renders the nodes.

import { scaleLinear, type ScaleLinear } from "d3-scale"

import {
  ITEM_STATE,
  stateAt,
  type AdapterFrames,
  type ItemState,
  type SweepItem,
} from "@/features/d1/model/sweep-frames"

import type { Margin } from "./shedding-geometry"

export const STRIP_MARGIN: Margin = { top: 8, right: 16, bottom: 32, left: 112 }
export const STRIP_ROW = 10
export const STRIP_GAP = 3
export const STRIP_GROUP = 20

/** Tiers in the order the strip groups them: the first to go at the top, protected at the bottom. */
export const TIER_ORDER = ["droppable", "compressible", "protected"] as const

export type StripSegment = {
  x0: number
  x1: number
  state: Exclude<ItemState, typeof ITEM_STATE.absent | typeof ITEM_STATE.omitted>
  /** The variant the segment's first frame used, for a compressed stretch. */
  variant: string | null
  /** The frame range, inclusive, the segment covers. */
  from: number
  to: number
}

export type StripRow = {
  item: SweepItem
  /** The item's index in the frames' state rows. */
  index: number
  y: number
  segments: StripSegment[]
}

export type StripGroup = { tier: string; y: number; rows: StripRow[] }

export type StripLayout = {
  width: number
  height: number
  margin: Margin
  x: ScaleLinear<number, number>
  groups: StripGroup[]
  xTicks: number[]
}

export type StripInput = {
  items: readonly SweepItem[]
  frames: AdapterFrames
  full: number
  width: number
  margin?: Margin
}

function tierRank(tier: string | null): number {
  const rank = TIER_ORDER.indexOf((tier ?? "") as (typeof TIER_ORDER)[number])
  return rank === -1 ? TIER_ORDER.length : rank
}

/** Lays the strip out; null when the adapter has no frames or the sweep no items. */
export function stripLayout(input: StripInput): StripLayout | null {
  const margin = input.margin ?? STRIP_MARGIN
  const { budgets } = input.frames
  if (budgets.length === 0 || input.items.length === 0) return null
  const finite = budgets.filter(Number.isFinite)
  if (finite.length === 0) return null
  const minBudget = Math.min(...finite)
  const maxBudget = Math.max(input.full, ...finite)
  const innerWidth = Math.max(input.width - margin.left - margin.right, 1)
  const domain: [number, number] =
    maxBudget === minBudget ? [maxBudget + 1, Math.max(minBudget - 1, 0)] : [maxBudget, minBudget]
  const x = scaleLinear()
    .domain(domain)
    .range([margin.left, margin.left + innerWidth])
  const count = input.items.length
  // Frames in descending budget, so each frame's span runs to the next one's budget.
  const order = budgets
    .map((budget, frame) => ({ budget, frame }))
    .sort((a, b) => b.budget - a.budget)

  const segmentsOf = (index: number): StripSegment[] => {
    const out: StripSegment[] = []
    order.forEach(({ budget, frame }, k) => {
      const state = stateAt(input.frames, count, frame, index)
      if (state !== ITEM_STATE.whole && state !== ITEM_STATE.variant) return
      const next = order[k + 1]?.budget ?? budget
      const variant =
        state === ITEM_STATE.variant
          ? (input.frames.variants[frame]?.find(([item]) => item === index)?.[1] ?? null)
          : null
      const last = out.at(-1)
      if (last && last.state === state && last.to === order[k - 1]?.frame) {
        last.x1 = x(next)
        last.to = frame
        return
      }
      out.push({ x0: x(budget), x1: x(next), state, variant, from: frame, to: frame })
    })
    return out
  }

  const ranked = input.items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => tierRank(a.item.tier) - tierRank(b.item.tier) || a.index - b.index)
  const groups: StripGroup[] = []
  let y = margin.top
  for (const { item, index } of ranked) {
    const tier = item.tier ?? "unknown tier"
    let group = groups.at(-1)
    if (!group || group.tier !== tier) {
      group = { tier, y, rows: [] }
      groups.push(group)
      y += STRIP_GROUP
    }
    group.rows.push({ item, index, y, segments: segmentsOf(index) })
    y += STRIP_ROW + STRIP_GAP
  }
  return {
    width: input.width,
    height: y + margin.bottom,
    margin,
    x,
    groups,
    xTicks: x.ticks(Math.max(2, Math.min(8, Math.floor(innerWidth / 80)))),
  }
}

/** The plane a slot id belongs to: its prefix (`evidence.knowledge` → `evidence`). */
export function planeOfSlot(slot: string | null): string | null {
  if (!slot) return null
  return slot.includes(".") ? (slot.split(".")[0] ?? null) : null
}
