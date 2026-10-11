// The geometry of an arm plot (the UI-D2 plan; DESIGN.md 7): one row per arm, grouped, each a
// value on a shared horizontal scale, as a dot with its interval as a whisker, or as a bar from
// zero; optionally a lighter bar behind it for a second value of the same unit (the share of
// probes whose fact was sent, behind their accuracy), and a reference rule. D3 computes the scale,
// React renders the nodes. A missing or non-finite value is a gap, never a zero.

import { scaleLinear, type ScaleLinear } from "d3-scale"

export type ArmRow = {
  id: string
  group: string
  value: number | null
  low?: number | null
  high?: number | null
  /** A second value drawn as a light bar from zero behind the mark. */
  backdrop?: number | null
}

export type ArmPlotGroup = { id: string; label: string }

export type ArmPlotMargin = { top: number; right: number; bottom: number; left: number }

export type ArmPlotInput = {
  rows: readonly ArmRow[]
  groups: readonly ArmPlotGroup[]
  /** A fixed domain (rates: [0, 1]), or "auto" from zero to the largest value drawn. */
  domain: readonly [number, number] | "auto"
  width: number
  mark: "dot" | "bar"
  reference?: { value: number; label: string } | null
  rowHeight?: number
  groupHeight?: number
}

export type LaidRow = {
  id: string
  y: number
  /** The mark's x; null for a missing value. */
  x: number | null
  low: number | null
  high: number | null
  backdrop: number | null
  /** Where bars start: zero, or the domain's low end when zero is outside it. */
  base: number
}

export type ArmPlotLayout = {
  width: number
  height: number
  margin: ArmPlotMargin
  x: ScaleLinear<number, number>
  ticks: number[]
  groups: { id: string; label: string; y: number }[]
  rows: LaidRow[]
  referenceX: number | null
}

const finite = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

/** Lays the plot out; null when there is no row to draw. */
export function armPlotLayout(input: ArmPlotInput): ArmPlotLayout | null {
  if (input.rows.length === 0) return null
  const rowHeight = input.rowHeight ?? 26
  const groupHeight = input.groupHeight ?? 22
  const width = Math.max(input.width, 240)
  const margin: ArmPlotMargin = {
    top: 4,
    right: 72,
    bottom: 28,
    left: Math.round(Math.min(168, Math.max(128, width * 0.32))),
  }
  const drawn = input.rows.flatMap((row) =>
    [row.value, row.low, row.high, row.backdrop].filter(finite),
  )
  if (input.reference && finite(input.reference.value)) drawn.push(input.reference.value)
  let domain: [number, number]
  if (input.domain === "auto") {
    const low = Math.min(0, ...drawn)
    const high = Math.max(0, ...drawn)
    domain = high === low ? [low, low + 1] : [low, high]
  } else {
    domain = [input.domain[0], input.domain[1]]
  }
  const x = scaleLinear()
    .domain(domain)
    .range([margin.left, width - margin.right])
  if (input.domain === "auto") x.nice()
  const [d0, d1] = x.domain() as [number, number]
  const clamp = (value: number) => x(Math.min(Math.max(value, d0), d1))
  const base = clamp(0)

  const groups: ArmPlotLayout["groups"] = []
  const rows: LaidRow[] = []
  let y = margin.top
  for (const group of input.groups) {
    const members = input.rows.filter((row) => row.group === group.id)
    if (members.length === 0) continue
    groups.push({ id: group.id, label: group.label, y: y + groupHeight - 6 })
    y += groupHeight
    for (const row of members) {
      rows.push({
        id: row.id,
        y: y + rowHeight / 2,
        x: finite(row.value) ? clamp(row.value) : null,
        low: finite(row.low) ? clamp(row.low) : null,
        high: finite(row.high) ? clamp(row.high) : null,
        backdrop: finite(row.backdrop) ? clamp(row.backdrop) : null,
        base,
      })
      y += rowHeight
    }
  }
  const innerWidth = width - margin.left - margin.right
  return {
    width,
    height: y + margin.bottom,
    margin,
    x,
    ticks: x.ticks(Math.max(2, Math.min(6, Math.floor(innerWidth / 70)))),
    groups,
    rows,
    referenceX:
      input.reference && finite(input.reference.value) ? clamp(input.reference.value) : null,
  }
}
