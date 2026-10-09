// The shedding curve's geometry (ui-plan.md 9.2; DESIGN.md 7): D3 computes scales and the stepped
// path, React renders the nodes. Budget runs along x from `full` down, so time runs left to right
// as the budget shrinks; charged tokens along y. Step interpolation, never a line between frames.

import { scaleLinear, type ScaleLinear } from "d3-scale"
import { curveStepAfter, line } from "d3-shape"

import type { CurvePoint, SweepSummary } from "@/features/d1/model/sweep-curve"

export type CurveSeries = { adapter: string; points: readonly CurvePoint[] }

export type Margin = { top: number; right: number; bottom: number; left: number }

export const CURVE_MARGIN: Margin = { top: 12, right: 16, bottom: 36, left: 56 }

export type SeriesPath = {
  adapter: string
  /** The stepped path over the frames that assembled; null when none did. */
  d: string | null
  /** A lone assembled frame, drawn as a point. */
  point: { x: number; y: number } | null
  /** Frames the harness marks as coarser steps, as x positions. */
  coarse: number[]
}

export type CurveLayout = {
  width: number
  height: number
  margin: Margin
  x: ScaleLinear<number, number>
  y: ScaleLinear<number, number>
  series: SeriesPath[]
  /** Horizontal rules, in pixels, at the protected size and at the floor when the cell has one. */
  protectedY: number | null
  floorY: number | null
  /** The vertical rule at the refusal threshold, in pixels, when the sweep found one. */
  thresholdX: number | null
  /** The budgets past the threshold, where assembly refuses, as a pixel span. */
  refused: { x0: number; x1: number; reason: string | null } | null
  xTicks: number[]
  yTicks: number[]
}

export type CurveInput = {
  series: readonly CurveSeries[]
  full: number
  protected: number
  floor: number | null
  threshold: number | null
  width: number
  height: number
  margin?: Margin
}

/** Lays the curve out; null when no series has a frame. */
export function curveLayout(input: CurveInput): CurveLayout | null {
  const margin = input.margin ?? CURVE_MARGIN
  const points = input.series.flatMap((s) => s.points)
  if (points.length === 0) return null
  const budgets = points.map((p) => p.budget).filter(Number.isFinite)
  const charged = points
    .map((p) => p.charged)
    .filter((c): c is number => c !== null && Number.isFinite(c))
  if (budgets.length === 0) return null
  const minBudget = Math.min(...budgets)
  const maxBudget = Math.max(input.full, ...budgets)
  const innerWidth = Math.max(input.width - margin.left - margin.right, 1)
  const innerHeight = Math.max(input.height - margin.top - margin.bottom, 1)
  // One budget only: give the axis a span, so the point and the rules can be placed.
  const xDomain: [number, number] =
    maxBudget === minBudget ? [maxBudget + 1, Math.max(minBudget - 1, 0)] : [maxBudget, minBudget]
  const x = scaleLinear()
    .domain(xDomain)
    .range([margin.left, margin.left + innerWidth])
  const yMax = Math.max(input.full, input.protected, ...charged, 1)
  const y = scaleLinear()
    .domain([0, yMax])
    .range([margin.top + innerHeight, margin.top])
    .nice()
  const path = line<CurvePoint>()
    .defined((p) => p.charged !== null && Number.isFinite(p.charged))
    .x((p) => x(p.budget))
    .y((p) => y(p.charged ?? 0))
    .curve(curveStepAfter)
  const series: SeriesPath[] = input.series.map((s) => {
    const ordered = [...s.points].sort((a, b) => b.budget - a.budget)
    const assembled = ordered.filter((p) => p.charged !== null)
    const single = assembled.length === 1 ? assembled[0] : undefined
    return {
      adapter: s.adapter,
      d: assembled.length >= 2 ? (path(ordered) ?? null) : null,
      point: single ? { x: x(single.budget), y: y(single.charged ?? 0) } : null,
      coarse: ordered.filter((p) => !p.exactStep).map((p) => x(p.budget)),
    }
  })
  const thresholdX =
    input.threshold !== null && input.threshold <= xDomain[0] && input.threshold >= xDomain[1]
      ? x(input.threshold)
      : null
  const firstRefused = points.find((p) => p.outcome === "refused")
  const refused =
    thresholdX !== null && input.threshold !== null && minBudget < input.threshold
      ? { x0: thresholdX, x1: x(minBudget), reason: firstRefused?.refusalReason ?? null }
      : null
  return {
    width: input.width,
    height: input.height,
    margin,
    x,
    y,
    series,
    protectedY: input.protected <= yMax ? y(input.protected) : null,
    floorY: input.floor !== null && input.floor <= yMax ? y(input.floor) : null,
    thresholdX,
    refused,
    xTicks: x.ticks(Math.max(2, Math.min(8, Math.floor(innerWidth / 80)))),
    yTicks: y.ticks(5),
  }
}

/** The series the chart shows: one when the adapters agree, every adapter overlaid otherwise. */
export function shownSeries(summary: SweepSummary): CurveSeries[] {
  if (summary.agree) {
    const from =
      summary.curves.find((curve) => curve.adapter === summary.sheddingFrom) ?? summary.curves[0]
    return from ? [{ adapter: from.adapter, points: from.points }] : []
  }
  return summary.curves.map((curve) => ({ adapter: curve.adapter, points: curve.points }))
}
