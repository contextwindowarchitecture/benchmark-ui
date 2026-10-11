// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { RunIndexV1, ScaleRowV1, SuiteSummaryV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { cellKey, scaleGrid, sweepRows, thresholdCells, windowRows, type Scale } from "./scale"

async function load(): Promise<{ scale: Scale; index: RunIndexV1 }> {
  const read = async (path: string) =>
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, path), "utf8")) as unknown
  const summary = parseDocumentAs(await read("suites/S7/summary.json"), "suite-summary")
  const index = parseDocumentAs(await read("index.json"), "run-index")
  if (!summary.ok || !index.ok) throw new Error("fixture")
  const scale = (summary.document as SuiteSummaryV1).scale
  if (!scale) throw new Error("no scale")
  return { scale, index: index.document }
}

describe("S7's sweeps and thresholds", () => {
  it("lists each sweep with its frames, checks and whether the index lists its file", async () => {
    const { scale, index } = await load()
    const rows = sweepRows(scale, index)
    expect(rows).toHaveLength(8)
    expect(rows.filter((row) => row.listed)).toHaveLength(2)
    const first = rows[0]!
    expect(first.digest).toBe("522f0d8db536e74b86f742604424817c482ca4e5f277c6a247f471f2a4db80ea")
    expect(first.uniformFrames).toBe(268)
    expect(first.frames.map((entry) => entry.adapter)).toEqual([
      "python",
      "typescript",
      "go",
      "rust",
    ])
    expect(first.mispredicted).toBe(0)
    expect(first.auditFailed).toEqual([])
  })

  it("says when the adapters' frame counts differ, and gathers their failures", async () => {
    const { scale, index } = await load()
    const sweep = scale.sweeps[0]!
    const [row] = sweepRows(
      {
        ...scale,
        sweeps: [
          {
            ...sweep,
            frames: { ...sweep.frames, go: 270 },
            mispredicted: { python: 1, go: 2 },
            audit_failed: { python: ["A3"], go: ["A1", "A3"] },
          },
        ],
      },
      index,
    )
    expect(row!.uniformFrames).toBeNull()
    expect(row!.mispredicted).toBe(3)
    expect(row!.auditFailed).toEqual(["A1", "A3"])
  })

  it("groups the threshold searches by cell, adapters in their order", async () => {
    const { scale } = await load()
    const cells = thresholdCells(scale)
    expect(cells).toHaveLength(16)
    expect(cells.every((cell) => cell.searches.length === 4)).toBe(true)
    expect(cells[0]!.searches.map((search) => search.adapter)).toEqual([
      "python",
      "typescript",
      "go",
      "rust",
    ])
  })
})

async function rows(): Promise<ScaleRowV1[]> {
  const text = await readFile(
    join(FIXTURES_DIR, FIXTURE_RUNS.s7, "suites/S7/results.jsonl"),
    "utf8",
  )
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as ScaleRowV1)
}

describe("S7's grid", () => {
  it("counts each cell's budgets, agreement, timeouts and skips, and the unbuildable cells", async () => {
    const { scale } = await load()
    const all = await rows()
    const grid = scaleGrid(all, scale)
    expect(grid.components).toEqual({
      tokenizer: "fixture-whitespace/v1",
      renderer: "fixture-xml/v1",
    })
    expect(grid.shapes[0]).toBe("droppable-heavy")
    const cell = grid.cells.get(
      cellKey({ shape: "droppable-heavy", candidates: 10, candidate_tokens: 10_000 }),
    )
    expect(cell).toMatchObject({
      rows: 6,
      compared: 6,
      agreed: 6,
      failed: 0,
      timeouts: 0,
      skipped: 0,
    })
    const unbuildable = grid.cells.get(
      cellKey({ shape: "compressible-v0", candidates: 5000, candidate_tokens: 10_000 }),
    )
    expect(unbuildable?.notConstructible).toMatch(/cannot share 10000 tokens/)
    expect(grid.sizes[0]).toEqual({ candidates: 10, tokens: 10_000 })
    // A timeout, a skip, a disagreement and a failure in one row, and a row at other components.
    const [first] = all
    const changed: ScaleRowV1 = {
      ...first!,
      agree: false,
      verdict: "failed",
      answers: [{ ...first!.answers[0]!, outcome: "timeout" }, ...first!.answers.slice(1)],
      skipped: [{ adapter: "go", reason: "at least the work of a cell that timed out" }],
    }
    const other: ScaleRowV1 = {
      ...first!,
      cell: { ...first!.cell, tokenizer: "cl100k" },
    }
    const second = scaleGrid([changed, ...all.slice(1), other], scale)
    expect(
      second.cells.get(
        cellKey({ shape: "droppable-heavy", candidates: 10, candidate_tokens: 10_000 }),
      ),
    ).toMatchObject({ rows: 6, compared: 6, agreed: 5, failed: 1, timeouts: 1, skipped: 1 })
    expect(second.componentRows).toBe(1)
    expect(scaleGrid([], undefined)).toMatchObject({ shapes: [], sizes: [], components: null })
  })

  it("takes the fixed-window rows, smallest window first", async () => {
    const [first] = await rows()
    const at = (label: string): ScaleRowV1 => ({ ...first!, label, case_id: label })
    expect(
      windowRows([at("window:1000000"), at("ratio:1.0"), at("window:8192")]).map(
        (row) => row.label,
      ),
    ).toEqual(["window:8192", "window:1000000"])
  })
})
