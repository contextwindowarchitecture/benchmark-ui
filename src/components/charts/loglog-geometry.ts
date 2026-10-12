// Log-log geometry for the scaling plots (ui-plan.md 8.7, 10; DESIGN.md 7): small multiples that
// share one x and one y domain, so a steeper line is steeper across panels too. D3 computes the
// scales; React renders. Only positive, finite values are placed; the rest are left out and the
// caller says how many points each fit has.

import { scaleLog, type ScaleLogarithmic } from "d3-scale"

import type { Margin } from "./shedding-geometry"

export const LOGLOG_MARGIN: Margin = { top: 10, right: 12, bottom: 30, left: 60 }

export type LogDomains = { x: [number, number]; y: [number, number] }

const positive = (v: number) => Number.isFinite(v) && v > 0

/** The domains every panel shares, padded a little in log space; null without a placeable value. */
export function sharedDomains(xs: readonly number[], ys: readonly number[]): LogDomains | null {
  const px = xs.filter(positive)
  const py = ys.filter(positive)
  if (px.length === 0 || py.length === 0) return null
  const pad = (lo: number, hi: number): [number, number] =>
    lo === hi ? [lo / 2, hi * 2] : [lo / 1.25, hi * 1.25]
  return {
    x: pad(Math.min(...px), Math.max(...px)),
    y: pad(Math.min(...py), Math.max(...py)),
  }
}

export type LogLayout = {
  width: number
  height: number
  margin: Margin
  x: ScaleLogarithmic<number, number>
  y: ScaleLogarithmic<number, number>
  xTicks: number[]
  yTicks: number[]
}

export function logLayout(
  domains: LogDomains,
  width: number,
  height: number,
  margin: Margin = LOGLOG_MARGIN,
): LogLayout {
  const x = scaleLog()
    .domain(domains.x)
    .range([margin.left, Math.max(width - margin.right, margin.left + 1)])
  const y = scaleLog()
    .domain(domains.y)
    .range([Math.max(height - margin.bottom, margin.top + 1), margin.top])
  return {
    width,
    height,
    margin,
    x,
    y,
    xTicks: decades(domains.x),
    yTicks: decades(domains.y),
  }
}

/** Ticks at 1, 2 and 5 of each decade inside a domain, thinned to at most six. */
export function decades([lo, hi]: [number, number]): number[] {
  const out: number[] = []
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e
      if (v >= lo && v <= hi) out.push(v)
    }
  }
  if (out.length <= 6) return out
  const decadesOnly = out.filter((v) => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9)
  return decadesOnly.length >= 2 ? decadesOnly : out.filter((_, i) => i % 2 === 0)
}
