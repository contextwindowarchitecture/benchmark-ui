// @vitest-environment node
import { describe, expect, it } from "vitest"

import { decades, logLayout, sharedDomains } from "./loglog-geometry"

describe("the log-log geometry", () => {
  it("shares padded domains over the positive values and is null without one", () => {
    expect(sharedDomains([50, 400, -1, Number.NaN], [10, 1000])).toEqual({
      x: [40, 500],
      y: [8, 1250],
    })
    expect(sharedDomains([5], [5])).toEqual({ x: [2.5, 10], y: [2.5, 10] })
    expect(sharedDomains([], [1])).toBeNull()
    expect(sharedDomains([0], [1])).toBeNull()
  })

  it("ticks at 1, 2 and 5 of each decade, thinned to the decades when crowded", () => {
    expect(decades([40, 500])).toEqual([50, 100, 200, 500])
    expect(decades([1, 100_000])).toEqual([1, 10, 100, 1_000, 10_000, 100_000])
  })

  it("maps the domains onto the panel inside its margin", () => {
    const layout = logLayout({ x: [10, 1000], y: [1, 100] }, 300, 200)
    expect(layout.x(10)).toBe(layout.margin.left)
    expect(layout.x(1000)).toBe(300 - layout.margin.right)
    expect(layout.y(100)).toBe(layout.margin.top)
  })
})
