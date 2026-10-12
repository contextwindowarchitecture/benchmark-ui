// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { PerfSummaryV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import {
  cellTime,
  filterCells,
  fitLabels,
  fitLine,
  fitPoints,
  scalingPanels,
  seriesSizes,
  uniformPeakMemory,
} from "./perf"

async function perf(): Promise<PerfSummaryV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, "perf/summary.json"), "utf8")),
    "perf-summary",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

/** The least-squares slope in log space, as the harness fits it. */
function slope(points: { x: number; y: number }[]): number {
  const lx = points.map((p) => Math.log(p.x))
  const ly = points.map((p) => Math.log(p.y))
  const mx = lx.reduce((a, b) => a + b, 0) / lx.length
  const my = ly.reduce((a, b) => a + b, 0) / ly.length
  let num = 0
  let den = 0
  lx.forEach((x, i) => {
    num += (x - mx) * (ly[i]! - my)
    den += (x - mx) ** 2
  })
  return num / den
}

describe("the performance summary", () => {
  it("says when every adapter and cell records the same peak memory", async () => {
    const summary = await perf()
    // The S7 run's Linux host recorded one peak for every adapter and cell, not the adapters' own.
    expect(uniformPeakMemory(summary)).toBe(1_130_352_640)
    const startup = summary.startup.map((entry, i) => ({
      ...entry,
      rss_peak_bytes: 20_000_000 + i,
    }))
    expect(uniformPeakMemory({ ...summary, startup })).toBeNull()
    expect(uniformPeakMemory({ ...summary, startup: [], cells: [] })).toBeNull()
    const one = summary.startup.filter((entry) => entry.adapter === "python")
    const cells = summary.cells.filter((cell) => cell.adapter === "python")
    expect(uniformPeakMemory({ ...summary, startup: one, cells })).toBeNull()
  })

  it("names each series' sizes from the typed series parameters", async () => {
    const { series } = await perf()
    expect(seriesSizes(series, "candidates")).toEqual([
      { candidates: 50, tokens: 50_000 },
      { candidates: 100, tokens: 50_000 },
      { candidates: 200, tokens: 50_000 },
      { candidates: 400, tokens: 50_000 },
    ])
    expect(seriesSizes(series, "tokens").map((size) => size.tokens)).toEqual([
      12_500, 25_000, 50_000, 100_000,
    ])
    expect(seriesSizes(series, "diagonal")[3]).toEqual({ candidates: 400, tokens: 100_000 })
  })

  it("finds the points each fit used: their slope is the harness's exponent", async () => {
    const document = await perf()
    const complete = document.fits.filter(
      (fit) => fit.exponent !== null && fitPoints(document, fit).length === fit.points,
    )
    expect(complete.length).toBeGreaterThan(0)
    for (const fit of complete) {
      expect(slope(fitPoints(document, fit))).toBeCloseTo(fit.exponent!, 3)
    }
  })

  it("draws the line with the harness's slope through the points' log mean", () => {
    const points = [
      { x: 10, y: 1 },
      { x: 100, y: 100 },
    ]
    const line = fitLine(points, 2)!
    expect(line.x0).toBe(10)
    expect(line.x1).toBe(100)
    expect(line.y0).toBeCloseTo(1, 9)
    expect(line.y1).toBeCloseTo(100, 9)
    expect(fitLine(points, null)).toBeNull()
    expect(fitLine(points.slice(0, 1), 2)).toBeNull()
    expect(
      fitLine(
        [
          { x: 10, y: 1 },
          { x: 10, y: 2 },
        ],
        1,
      ),
    ).toBeNull()
    expect(
      fitLine(
        [
          { x: -1, y: 1 },
          { x: 10, y: 2 },
        ],
        1,
      ),
    ).toBeNull()
  })

  it("lays out one panel per shape and filters the cells", async () => {
    const document = await perf()
    expect(fitLabels(document)[0]).toBe("ratio:1.0")
    const panels = scalingPanels(document, {
      label: "ratio:1.0",
      series: "diagonal",
      method: "inprocess",
    })
    expect(panels.length).toBeGreaterThan(0)
    expect(panels[0]!.series.map((s) => s.adapter)).toEqual(
      [...panels[0]!.series.map((s) => s.adapter)].sort(
        (a, b) =>
          ["python", "typescript", "go", "rust"].indexOf(a) -
          ["python", "typescript", "go", "rust"].indexOf(b),
      ),
    )
    expect(filterCells(document.cells, { adapter: "go" }).every((c) => c.adapter === "go")).toBe(
      true,
    )
    expect(filterCells(document.cells, { status: "skipped" })).toEqual([])
    const cell = document.cells[0]!
    expect(cellTime(cell, "e2e")).toBe(cell.e2e?.p50_ms)
    expect(cellTime({ ...cell, status: "timeout" }, "e2e")).toBeNull()
    expect(
      cellTime({ ...cell, inprocess: { samples: 0, error: "timeout" } }, "inprocess"),
    ).toBeNull()
  })
})
