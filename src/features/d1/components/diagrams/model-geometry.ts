// The model diagram's layout (ui-plan.md 7.3): a column of slots per plane, the four side by side
// where the measured width holds them and two and two, or one under another, below that, so the
// slots keep a legible size on a phone (DESIGN.md 4.2) instead of the picture scrolling.

import { bandWidth, columnsPerBand, type ColumnSpec } from "./bands"

export const COLUMN = 180
export const HEADER = 52
export const SLOT = 40
export const SLOT_GAP = 8
const BAND_GAP = 12
// The four planes were drawn down to 560 of their 758 px; a 1280 px laptop's frame holds 547.
const SPEC: ColumnSpec = { width: COLUMN, gap: 12, minScale: 0.7 }

export type ModelLayout = {
  width: number
  height: number
  /** Whether the planes take more than one band. */
  banded: boolean
  /** Each plane's column, in the order of the groups: its top left and its height. */
  columns: { x: number; y: number; height: number }[]
}

/** The layout of planes holding `slots` slots each in `available` pixels (0: unmeasured). */
export function modelLayout(slots: readonly number[], available: number): ModelLayout {
  const perBand = columnsPerBand(slots.length, available, SPEC)
  const columns: ModelLayout["columns"] = []
  let top = 0
  for (let start = 0; start < slots.length; start += perBand) {
    const band = slots.slice(start, start + perBand)
    const height = HEADER + Math.max(1, ...band) * (SLOT + SLOT_GAP) + 8
    band.forEach((_, column) =>
      columns.push({ x: column * (COLUMN + SPEC.gap) + 1, y: top + 1, height: height - 2 }),
    )
    top += height + BAND_GAP
  }
  return {
    width: bandWidth(perBand, SPEC),
    height: Math.max(top - BAND_GAP, 1),
    banded: perBand < slots.length,
    columns,
  }
}
