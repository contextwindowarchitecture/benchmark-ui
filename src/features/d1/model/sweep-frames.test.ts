// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { SweepV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { pointOfFrame, sweepPath } from "./sweep-curve"
import {
  adapterTimelines,
  frameCounts,
  ITEM_STATE,
  nearestTimeline,
  placeTimelines,
  stateAt,
  sweepFrames,
} from "./sweep-frames"

const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"

async function sweep(): Promise<SweepV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, sweepPath(SWEEP)), "utf8")),
    "sweep",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("a sweep's frames", () => {
  it("reads each item's state at each frame off the frame's lists, in shedding order", async () => {
    const document = await sweep()
    const { items, adapters } = sweepFrames(document)
    expect(items.map((item) => item.id)).toEqual(document.shedding.map((entry) => entry.item_id))
    expect(items.at(-1)).toMatchObject({ id: "q:base", tier: "protected", firstOmittedAt: null })
    const python = adapters[0]!
    expect(python.budgets).toEqual(document.adapters.python!.frames.map((f) => f.budget_input))
    // The full budget keeps everything; the refusal names nothing.
    expect(frameCounts(python, items.length, 0)).toEqual({ whole: 42, variant: 0, omitted: 0 })
    const last = python.budgets.length - 1
    expect(frameCounts(python, items.length, last)).toEqual({ whole: 0, variant: 0, omitted: 0 })
    expect(stateAt(python, items.length, last, 0)).toBe(ITEM_STATE.absent)
    // Every frame's counts are the curve's.
    document.adapters.python!.frames.forEach((frame, f) => {
      const point = pointOfFrame(frame)
      const counts = frameCounts(python, items.length, f)
      expect(counts.whole + counts.variant).toBe(point.included)
      expect(counts.variant).toBe(point.compressed)
      expect(counts.omitted).toBe(point.omitted)
    })
    // The first item to leave leaves first.
    expect(stateAt(python, items.length, 1, 0)).toBe(ITEM_STATE.omitted)
    expect(python.mispredicted.every((flag) => !flag)).toBe(true)
    expect(stateAt(python, items.length, -1, 0)).toBe(ITEM_STATE.absent)
    expect(stateAt(python, items.length, 0, items.length)).toBe(ITEM_STATE.absent)
  })

  it("records variants, mispredictions and items the shedding list does not name", async () => {
    const document = await sweep()
    const frame = document.adapters.python!.frames[1]!
    const changed: SweepV1 = {
      ...document,
      adapters: {
        python: {
          frames: [
            {
              ...frame,
              included: [
                { ...frame.included[0]!, variant_id: "x~v1" },
                { item_id: "stranger", slot: "evidence.knowledge", tokens: 3, variant_id: null },
                { item_id: null, slot: null, tokens: null, variant_id: null },
                ...frame.included.slice(1),
              ],
              omitted: [...frame.omitted, null],
              predicted: ["refused", "protected_content_over_budget"],
              audit_failed: ["A3"],
            },
          ],
        },
      },
    }
    const { items, adapters } = sweepFrames(changed)
    expect(items).toHaveLength(43)
    expect(items.at(-1)).toEqual({
      id: "stranger",
      slot: "evidence.knowledge",
      tier: null,
      firstCompressedAt: null,
      firstOmittedAt: null,
    })
    const python = adapters[0]!
    const first = items.findIndex((item) => item.id === frame.included[0]!.item_id)
    expect(stateAt(python, items.length, 0, first)).toBe(ITEM_STATE.variant)
    expect(python.variants[0]).toEqual([[first, "x~v1"]])
    expect(stateAt(python, items.length, 0, 42)).toBe(ITEM_STATE.whole)
    expect(python.mispredicted).toEqual([true])
    expect(python.auditFailed).toEqual([["A3"]])
  })
})

describe("a sweep's timelines", () => {
  const paths = [
    "timelines/aaa/python.json",
    "timelines/aaa/go.json",
    "timelines/bbb/python.json",
    "timelines/bbb/typescript.json",
  ]

  it("are the adapter's files, placed at the frame of their budget", () => {
    expect(adapterTimelines(paths, "python")).toEqual([
      "timelines/aaa/python.json",
      "timelines/bbb/python.json",
    ])
    expect(adapterTimelines(paths, "rust")).toEqual([])
    const placed = placeTimelines(
      [100, 80, 60, 40],
      [
        { path: "b", budget: 40 },
        { path: "a", budget: 80 },
        { path: "lost", budget: 55 },
      ],
    )
    expect(placed).toEqual([
      { path: "a", frame: 1 },
      { path: "b", frame: 3 },
    ])
    expect(nearestTimeline(placed, 1)).toEqual({ path: "a", frame: 1, exact: true })
    expect(nearestTimeline(placed, 0)).toEqual({ path: "a", frame: 1, exact: false })
    // A tie goes to the earlier frame.
    expect(nearestTimeline(placed, 2)).toEqual({ path: "a", frame: 1, exact: false })
    expect(nearestTimeline([], 2)).toBeNull()
  })
})
