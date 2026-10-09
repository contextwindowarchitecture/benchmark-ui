// @vitest-environment node
import { describe, expect, it } from "vitest"

import type { CurvePoint } from "@/features/d1/model/sweep-curve"

import { curveLayout } from "./shedding-geometry"

const point = (budget: number, charged: number | null, exact = true): CurvePoint => ({
  budget,
  outcome: charged === null ? "refused" : "assembled",
  refusalReason: charged === null ? "protected_over_budget" : null,
  charged,
  included: charged === null ? 0 : 3,
  compressed: 0,
  omitted: charged === null ? 3 : 0,
  exactStep: exact,
})

const base = { full: 100, protected: 20, floor: null, threshold: 20, width: 400, height: 200 }

describe("the shedding curve's geometry", () => {
  it("runs the budget from full down along x and steps between frames", () => {
    const layout = curveLayout({
      ...base,
      series: [{ adapter: "python", points: [point(100, 100), point(60, 58), point(10, null)] }],
    })!
    expect(layout).not.toBeNull()
    expect(layout.x(100)).toBeLessThan(layout.x(10))
    expect(layout.y(0)).toBeGreaterThan(layout.y(100))
    const d = layout.series[0]!.d!
    // Two assembled frames: a step path, flat to the second frame's budget, then a vertical riser.
    const coords = d
      .split(/[ML]/)
      .filter(Boolean)
      .map((pair) => pair.split(",").map(Number))
    expect(coords).toHaveLength(3)
    expect(coords[0]![1]).toBe(coords[1]![1])
    expect(coords[1]![0]).toBe(coords[2]![0])
    // d3 writes three decimals.
    expect(coords[1]![0]).toBeCloseTo(layout.x(60), 2)
    expect(coords[2]![1]).toBeCloseTo(layout.y(58), 2)
    expect(layout.series[0]!.point).toBeNull()
    expect(layout.thresholdX).toBe(layout.x(20))
    expect(layout.refused).toEqual({
      x0: layout.x(20),
      x1: layout.x(10),
      reason: "protected_over_budget",
    })
    expect(layout.protectedY).toBe(layout.y(20))
    expect(layout.floorY).toBeNull()
  })

  it("draws a lone assembled frame as a point and no line", () => {
    const layout = curveLayout({
      ...base,
      series: [{ adapter: "go", points: [point(100, 100), point(10, null)] }],
    })!
    expect(layout.series[0]!.d).toBeNull()
    expect(layout.series[0]!.point).toEqual({ x: layout.x(100), y: layout.y(100) })
  })

  it("handles one budget, all refused, a floor, and coarse steps", () => {
    const one = curveLayout({ ...base, series: [{ adapter: "rust", points: [point(50, 50)] }] })!
    expect(one.x.domain()[0]).toBeGreaterThan(one.x.domain()[1]!)
    expect(one.series[0]!.point).not.toBeNull()
    const refused = curveLayout({
      ...base,
      series: [{ adapter: "rust", points: [point(15, null), point(10, null)] }],
    })!
    expect(refused.series[0]!.d).toBeNull()
    expect(refused.series[0]!.point).toBeNull()
    const floor = curveLayout({
      ...base,
      floor: 40,
      series: [{ adapter: "rust", points: [point(100, 100, false), point(50, 50)] }],
    })!
    expect(floor.floorY).toBe(floor.y(40))
    expect(floor.series[0]!.coarse).toEqual([floor.x(100)])
  })

  it("is null without frames and keeps a threshold outside the budgets off the chart", () => {
    expect(curveLayout({ ...base, series: [] })).toBeNull()
    expect(curveLayout({ ...base, series: [{ adapter: "go", points: [] }] })).toBeNull()
    const above = curveLayout({
      ...base,
      threshold: 500,
      series: [{ adapter: "go", points: [point(100, 100), point(50, 50)] }],
    })!
    expect(above.thresholdX).toBeNull()
    expect(above.refused).toBeNull()
  })
})
