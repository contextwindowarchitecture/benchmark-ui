import { describe, expect, it } from "vitest"

import { navGroupOf } from "./navigation"

describe("navGroupOf", () => {
  it("names the sidebar group a page belongs to, for the page's kicker", () => {
    expect(navGroupOf("/")?.label).toBe("Benchmark")
    expect(navGroupOf("/d1/runs")?.label).toBe("Domain 1 · Assembly")
    expect(navGroupOf("/d2/runs/20261012T052348Z-4b0ea5d/suites/S1")?.label).toBe(
      "Domain 2 · Long-horizon stability",
    )
    expect(navGroupOf("/nowhere")).toBeUndefined()
  })
})
