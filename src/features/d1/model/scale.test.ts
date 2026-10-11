// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { RunIndexV1, SuiteSummaryV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { sweepRows, thresholdCells, type Scale } from "./scale"

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
