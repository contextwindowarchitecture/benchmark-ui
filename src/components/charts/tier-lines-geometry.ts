// The geometry of small multiples over corpus size (the UI-D2 plan; DESIGN.md 7): one panel per
// arm, the corpus's size as a multiple of the budget along a log scale, a rate from zero to one
// up; the arm's line in its panel and a reference arm's, faint, in every other, so each arm is
// read against the same baseline. Points are joined linearly in size order; a missing point is a
// gap. D3 computes scales and paths, React renders the nodes.

import { scaleLinear, scaleLog, type ScaleLinear, type ScaleLogarithmic } from "d3-scale"
import { line } from "d3-shape"

export type TierPoint = { tier: string; size: number; value: number | null }

export type TierSeries = { id: string; points: readonly TierPoint[] }

export type PanelLayout = {
  id: string
  /** The series' own path; null when fewer than two of its points have values. */
  path: string | null
  points: { tier: string; x: number; y: number }[]
  /** The reference series' path, drawn faint; null in the reference's own panel. */
  reference: string | null
}

export type TierLinesLayout = {
  panelWidth: number
  panelHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  x: ScaleLogarithmic<number, number> | ScaleLinear<number, number>
  y: ScaleLinear<number, number>
  /** The sizes on the axis, ascending, with their tier names. */
  ticks: { tier: string; x: number }[]
  yTicks: number[]
  panels: PanelLayout[]
}

const finite = (value: number | null): value is number => value !== null && Number.isFinite(value)

/** Lays the panels out; null when no series has a point. */
export function tierLinesLayout(input: {
  series: readonly TierSeries[]
  reference?: string | null
  panelWidth: number
  panelHeight: number
}): TierLinesLayout | null {
  const sizes = input.series.flatMap((s) => s.points.map((p) => p.size)).filter((s) => s > 0)
  if (input.series.length === 0 || sizes.length === 0) return null
  const margin = { top: 8, right: 10, bottom: 24, left: 34 }
  const lo = Math.min(...sizes)
  const hi = Math.max(...sizes)
  const range = [margin.left, Math.max(input.panelWidth - margin.right, margin.left + 1)]
  // One size only: a linear span around it, so the point can be placed.
  const x =
    lo === hi
      ? scaleLinear()
          .domain([lo * 0.5, hi * 1.5])
          .range(range)
      : scaleLog().base(2).domain([lo, hi]).range(range)
  const y = scaleLinear()
    .domain([0, 1])
    .range([input.panelHeight - margin.bottom, margin.top])
  const path = (points: readonly TierPoint[]) => {
    const ordered = [...points].filter((p) => p.size > 0).sort((a, b) => a.size - b.size)
    if (ordered.filter((p) => finite(p.value)).length < 2) return null
    return (
      line<TierPoint>()
        .defined((p) => finite(p.value))
        .x((p) => x(p.size))
        .y((p) => y(Math.min(Math.max(p.value ?? 0, 0), 1)))(ordered) ?? null
    )
  }
  const reference = input.series.find((s) => s.id === input.reference)
  const referencePath = reference ? path(reference.points) : null
  const tiers = new Map<number, string>()
  for (const s of input.series) for (const p of s.points) if (p.size > 0) tiers.set(p.size, p.tier)
  return {
    panelWidth: input.panelWidth,
    panelHeight: input.panelHeight,
    margin,
    x,
    y,
    ticks: [...tiers].sort((a, b) => a[0] - b[0]).map(([size, tier]) => ({ tier, x: x(size) })),
    yTicks: [0, 0.5, 1],
    panels: input.series.map((s) => ({
      id: s.id,
      path: path(s.points),
      points: s.points
        .filter((p) => p.size > 0 && finite(p.value))
        .map((p) => ({ tier: p.tier, x: x(p.size), y: y(Math.min(Math.max(p.value ?? 0, 0), 1)) })),
      reference: s.id === input.reference ? null : referencePath,
    })),
  }
}
