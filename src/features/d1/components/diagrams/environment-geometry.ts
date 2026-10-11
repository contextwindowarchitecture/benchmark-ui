// The environment diagram's layout (ui-plan.md 7.3): a column of tiles per platform, side by side
// as far as the measured width holds them and in bands below that, so a tile keeps a legible size
// on a phone (DESIGN.md 4.2) instead of the picture shrinking away or scrolling.

import type { EnvironmentGroup } from "@/features/d1/model/environment"

import { bandWidth, columnsPerBand, type ColumnSpec } from "./bands"

export const TILE = { w: 176, h: 30, gap: 6 }
export const HEADER = 26
const BAND_GAP = 16
const SPEC: ColumnSpec = { width: TILE.w, gap: 16, minScale: 0.85 }

export type EnvironmentLayout = {
  width: number
  height: number
  /** The top left of each platform's column, in the order of the groups. */
  columns: { x: number; y: number }[]
}

/** The layout in `available` pixels; an unmeasured width (0) puts every platform in one band. */
export function environmentLayout(
  groups: readonly EnvironmentGroup[],
  available: number,
): EnvironmentLayout {
  const perBand = columnsPerBand(groups.length, available, SPEC)
  const columns: EnvironmentLayout["columns"] = []
  let top = 1
  for (let start = 0; start < groups.length; start += perBand) {
    const band = groups.slice(start, start + perBand)
    band.forEach((_, column) => columns.push({ x: column * (TILE.w + SPEC.gap) + 1, y: top }))
    const rows = Math.max(1, ...band.map((group) => group.cells.length))
    top += HEADER + rows * (TILE.h + TILE.gap) + BAND_GAP
  }
  return {
    width: bandWidth(perBand, SPEC),
    height: Math.max(top - BAND_GAP, 1) + 3,
    columns,
  }
}
