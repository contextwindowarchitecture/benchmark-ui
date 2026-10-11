// The model diagram's layout (ui-plan.md 7.3): a column of slots per plane, the four side by side
// where the measured width holds them and two and two, or one under another, below that, so the
// slots keep a legible size on a phone (DESIGN.md 4.2) instead of the picture scrolling. A plane's
// subtitle too long for it takes two lines, and the planes beside it make room for the second.

import { bandWidth, columnsPerBand, type ColumnSpec } from "./bands"

export const COLUMN = 180
/** Where the slots start under a one-line subtitle; each further line adds `SUBTITLE.line`. */
const HEADER = 52
export const SUBTITLE = { x: 12, y: 40, line: 13 }
export const SLOT = 40
export const SLOT_GAP = 8
const BAND_GAP = 12
// The four planes were drawn down to 560 of their 758 px; a 1280 px laptop's frame holds 547.
const SPEC: ColumnSpec = { width: COLUMN, gap: 12, minScale: 0.7 }
// The subtitle is 11 px Geist, which runs 5.0 to 5.6 px a character on the planes' words; at the
// widest rate a line the width of the plane less its margins holds this many characters.
const SUBTITLE_CHARS = Math.floor((COLUMN - SUBTITLE.x - 8) / 5.6)

/** A plane's subtitle as lines: one when it fits, else two broken where they come out most even. */
export function subtitleLines(text: string): string[] {
  if (text.length <= SUBTITLE_CHARS) return [text]
  const words = text.split(" ")
  const longest = (lines: readonly string[]) => Math.max(...lines.map((line) => line.length))
  let best = [text]
  for (let split = 1; split < words.length; split += 1) {
    const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")]
    if (best.length === 1 || longest(lines) < longest(best)) best = lines
  }
  return best
}

/** A plane as the layout sees it: how many slots it holds and how many lines its subtitle takes. */
export type ModelPlane = { slots: number; lines: number }

export type ModelLayout = {
  width: number
  height: number
  /** Whether the planes take more than one band. */
  banded: boolean
  /**
   * Each plane's column, in the order of the planes: its top left, its height, and where its
   * slots start, the same for every plane in a band so their slots line up.
   */
  columns: { x: number; y: number; height: number; header: number }[]
}

/** The layout of the planes in `available` pixels (0: unmeasured). */
export function modelLayout(planes: readonly ModelPlane[], available: number): ModelLayout {
  const perBand = columnsPerBand(planes.length, available, SPEC)
  const columns: ModelLayout["columns"] = []
  let top = 0
  for (let start = 0; start < planes.length; start += perBand) {
    const band = planes.slice(start, start + perBand)
    const lines = Math.max(1, ...band.map((plane) => plane.lines))
    const header = HEADER + (lines - 1) * SUBTITLE.line
    const height = header + Math.max(1, ...band.map((plane) => plane.slots)) * (SLOT + SLOT_GAP) + 8
    band.forEach((_, column) =>
      columns.push({ x: column * (COLUMN + SPEC.gap) + 1, y: top + 1, height: height - 2, header }),
    )
    top += height + BAND_GAP
  }
  return {
    width: bandWidth(perBand, SPEC),
    height: Math.max(top - BAND_GAP, 1),
    banded: perBand < planes.length,
    columns,
  }
}
