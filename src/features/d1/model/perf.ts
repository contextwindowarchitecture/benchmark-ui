// Pure selectors over S7's performance summary (ui-plan.md 8.7): each fit's points, the scaling
// panels, and the cells table. The fits are the harness's: their exponents, standard errors and r²
// are carried, never recomputed. A fit's points are the cells its series names (the summary's
// typed `series`): per shape, candidates at fixed tokens, tokens at fixed candidates, and both at
// fixed tokens per candidate. The line a plot draws has the harness's slope through the points'
// log mean, which is where a least-squares line in log space passes.

import type { PerfSummaryV1 } from "@/data/schema/generated"
import { orderAdapters } from "@/lib/adapters"

export type PerfCell = PerfSummaryV1["cells"][number]
export type PerfFit = PerfSummaryV1["fits"][number]
export type FitSeries = PerfFit["series"]
export type FitMethod = PerfFit["method"]

export const FIT_SERIES: readonly FitSeries[] = ["candidates", "tokens", "diagonal"]
export const FIT_METHODS: readonly FitMethod[] = ["inprocess", "net", "e2e"]

export type FitPoint = { x: number; y: number; cell: PerfCell }

/** The (candidates, tokens) sizes a series runs through, in order. */
export function seriesSizes(
  series: PerfSummaryV1["series"],
  which: FitSeries,
): { candidates: number; tokens: number }[] {
  return series.candidates.map((n) => {
    switch (which) {
      case "candidates":
        return { candidates: n, tokens: series.fixed_tokens }
      case "tokens":
        return { candidates: series.fixed_candidates, tokens: series.tokens_per_candidate * n }
      case "diagonal":
        return { candidates: n, tokens: series.tokens_per_candidate * n }
    }
  })
}

/** A measured cell's p50 by a method, or null where the method has none (an in-process error). */
export function cellTime(cell: PerfCell, method: FitMethod): number | null {
  if (cell.status !== "measured") return null
  switch (method) {
    case "e2e":
      return cell.e2e?.p50_ms ?? null
    case "net":
      return cell.net_p50_ms
    case "inprocess":
      return cell.inprocess && !cell.inprocess.error ? (cell.inprocess.p50_ms ?? null) : null
  }
}

/** The points a fit is over: its series' cells for its adapter, shape and label, positive times. */
export function fitPoints(perf: PerfSummaryV1, fit: PerfFit): FitPoint[] {
  const sizes = seriesSizes(perf.series, fit.series)
  return sizes.flatMap((size) => {
    const cell = perf.cells.find(
      (c) =>
        c.adapter === fit.adapter &&
        c.cell.shape === fit.shape &&
        c.label === fit.label &&
        c.cell.candidates === size.candidates &&
        c.cell.candidate_tokens === size.tokens,
    )
    if (!cell) return []
    const y = cellTime(cell, fit.method)
    if (y === null || !(y > 0)) return []
    const x = fit.variable === "tokens" ? size.tokens : size.candidates
    return [{ x, y, cell }]
  })
}

/** The fitted line's ends: the harness's slope through the points' log mean, over their x span. */
export function fitLine(
  points: readonly Pick<FitPoint, "x" | "y">[],
  exponent: number | null,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const usable = points.filter((p) => p.x > 0 && p.y > 0)
  if (exponent === null || !Number.isFinite(exponent) || usable.length < 2) return null
  const lx = usable.map((p) => Math.log(p.x))
  const ly = usable.map((p) => Math.log(p.y))
  const mx = lx.reduce((a, b) => a + b, 0) / lx.length
  const my = ly.reduce((a, b) => a + b, 0) / ly.length
  const x0 = Math.min(...usable.map((p) => p.x))
  const x1 = Math.max(...usable.map((p) => p.x))
  if (x0 === x1) return null
  const at = (x: number) => Math.exp(my + exponent * (Math.log(x) - mx))
  return { x0, y0: at(x0), x1, y1: at(x1) }
}

export type PanelSeries = { adapter: string; fit: PerfFit; points: FitPoint[] }
export type ScalingPanel = { shape: string; series: PanelSeries[] }

/** One panel per shape for a label, series and method, every adapter's fit in it. */
export function scalingPanels(
  perf: PerfSummaryV1,
  choice: { label: string; series: FitSeries; method: FitMethod },
): ScalingPanel[] {
  const fits = perf.fits.filter(
    (fit) =>
      fit.label === choice.label && fit.series === choice.series && fit.method === choice.method,
  )
  const shapes = [...new Set(fits.map((fit) => fit.shape))]
  return shapes.map((shape) => {
    const mine = fits.filter((fit) => fit.shape === shape)
    const adapters = orderAdapters(mine.map((fit) => fit.adapter))
    return {
      shape,
      series: adapters.flatMap((adapter) => {
        const fit = mine.find((entry) => entry.adapter === adapter)
        return fit ? [{ adapter, fit, points: fitPoints(perf, fit) }] : []
      }),
    }
  })
}

/** The fits' budget labels, in the order the summary first names them. */
export function fitLabels(perf: PerfSummaryV1): string[] {
  return [...new Set(perf.fits.map((fit) => fit.label))]
}

export type CellFilter = {
  adapter?: string | undefined
  shape?: string | undefined
  status?: string | undefined
}

export function filterCells(cells: readonly PerfCell[], filter: CellFilter): PerfCell[] {
  return cells.filter(
    (cell) =>
      (!filter.adapter || cell.adapter === filter.adapter) &&
      (!filter.shape || cell.cell.shape === filter.shape) &&
      (!filter.status || cell.status === filter.status),
  )
}
