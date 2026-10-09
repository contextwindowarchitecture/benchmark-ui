// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { RunIndexV1, SweepV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import {
  curvePoints,
  summarizeSweep,
  sweepDigestOf,
  sweepFiles,
  sweepPath,
  timelineFiles,
  walkTimelinePath,
} from "./sweep-curve"

const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"

async function sweep(): Promise<SweepV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, sweepPath(SWEEP)), "utf8")),
    "sweep",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

async function runIndex(): Promise<RunIndexV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, "index.json"), "utf8")),
    "run-index",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("the sweep curve", () => {
  it("derives one point per frame from the frames when the file has no curve", async () => {
    const summary = summarizeSweep(await sweep())
    expect(summary.full).toBe(2104)
    expect(summary.protected).toBe(58)
    expect(summary.threshold).toBe(58)
    expect(summary.agree).toBe(true)
    expect(summary.sheddingFrom).toBe("python")
    expect(summary.shedding).toHaveLength(42)
    expect(summary.curves.map((curve) => curve.adapter)).toEqual([
      "python",
      "typescript",
      "go",
      "rust",
    ])
    const python = summary.curves[0]!
    expect(python.source).toBe("derived")
    expect(python.points).toHaveLength(16)
    expect(python.points[0]).toEqual({
      budget: 2104,
      outcome: "assembled",
      refusalReason: null,
      charged: 2104,
      included: 42,
      compressed: 0,
      omitted: 0,
      exactStep: expect.any(Boolean),
    })
    const last = python.points[15]!
    expect(last.budget).toBe(46)
    expect(last.outcome).toBe("refused")
    expect(last.charged).toBeNull()
    expect(python.points.filter((point) => point.exactStep)).toHaveLength(9)
  })

  it("prefers the harness's curve when the file carries one of the frames' length", async () => {
    const document = await sweep()
    const block = document.adapters["python"]!
    const curve = block.frames.map((frame) => ({
      budget_input: frame.budget_input,
      outcome: frame.outcome,
      refusal_reason: frame.refusal_reason,
      charged_tokens: frame.charged_tokens,
      included: 7,
      compressed: 3,
      omitted: 1,
      exact_step: frame.exact_step,
    }))
    const preferred = curvePoints({ ...block, curve })
    expect(preferred.source).toBe("harness")
    expect(preferred.points[0]).toMatchObject({ included: 7, compressed: 3, omitted: 1 })
    // A curve of another length is not the frames' curve: the frames win.
    expect(curvePoints({ ...block, curve: curve.slice(1) }).source).toBe("derived")
  })

  it("counts compressed items as included items with a variant", async () => {
    const document = await sweep()
    const block = document.adapters["python"]!
    const frame = block.frames[0]!
    const withVariant = {
      ...block,
      frames: [
        {
          ...frame,
          included: frame.included.map((item, i) => (i < 2 ? { ...item, variant_id: "v1" } : item)),
        },
      ],
    }
    expect(curvePoints(withVariant).points[0]!.compressed).toBe(2)
  })

  it("lists a run's sweep and timeline files and picks the walk's timeline", async () => {
    const index = await runIndex()
    const sweeps = sweepFiles(index)
    expect(sweeps).toHaveLength(2)
    expect(sweepDigestOf(sweeps[0]!.path)).toBe(SWEEP)
    expect(sweepDigestOf("summary.json")).toBeNull()
    expect(timelineFiles(index)).toHaveLength(40)
    const summary = summarizeSweep(await sweep())
    expect(walkTimelinePath(index, summary)).toBe(summary.timelines[0])
    expect(walkTimelinePath(index, undefined)).toBe(timelineFiles(index)[0]!.path)
    expect(walkTimelinePath({ ...index, files: [] }, summary)).toBeUndefined()
  })
})
