// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { parseDocumentAs } from "@/data/validate"
import { sweepPath } from "@/features/d1/model/sweep-curve"
import { ITEM_STATE, sweepFrames, type AdapterFrames } from "@/features/d1/model/sweep-frames"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { planeOfSlot, stripLayout } from "./item-strip-geometry"

const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"

async function frames() {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, sweepPath(SWEEP)), "utf8")),
    "sweep",
  )
  if (!result.ok) throw new Error(result.reason)
  return { document: result.document, ...sweepFrames(result.document) }
}

describe("the item strip's geometry", () => {
  it("groups the items by tier, the first to go at the top and protected at the bottom", async () => {
    const { document, items, adapters } = await frames()
    const layout = stripLayout({ items, frames: adapters[0]!, full: document.full, width: 800 })
    expect(layout).not.toBeNull()
    if (!layout) return
    expect(layout.groups.map((group) => [group.tier, group.rows.length])).toEqual([
      ["compressible", 40],
      ["protected", 2],
    ])
    const ys = layout.groups.flatMap((group) => group.rows.map((row) => row.y))
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
    expect(layout.height).toBeGreaterThan(ys.at(-1)!)
  })

  it("draws each item's frames as merged segments that end where the item leaves", async () => {
    const { document, items, adapters } = await frames()
    const layout = stripLayout({ items, frames: adapters[0]!, full: document.full, width: 800 })
    if (!layout) throw new Error("no layout")
    const budgets = adapters[0]!.budgets
    const first = layout.groups[0]!.rows[0]!
    // The first item leaves at the second frame: one segment over the first frame's span.
    expect(first.segments).toEqual([
      {
        x0: layout.x(budgets[0]!),
        x1: layout.x(budgets[1]!),
        state: ITEM_STATE.whole,
        variant: null,
        from: 0,
        to: 0,
      },
    ])
    // A protected item stays through every assembled frame, in one segment.
    const kept = layout.groups[1]!.rows[0]!
    expect(kept.segments).toHaveLength(1)
    expect(kept.segments[0]!.from).toBe(0)
    expect(kept.segments[0]!.to).toBe(budgets.length - 2)
    expect(kept.segments[0]!.x1).toBe(layout.x(budgets.at(-1)!))
  })

  it("keeps a compressed stretch apart, with its variant, and handles the edges", async () => {
    const { document, items } = await frames()
    const two = items.slice(0, 1)
    const fake: AdapterFrames = {
      adapter: "python",
      budgets: [100, 80, 60],
      states: new Uint8Array([ITEM_STATE.whole, ITEM_STATE.variant, ITEM_STATE.omitted]),
      variants: [[], [[0, "kb:1~v1"]], []],
      mispredicted: [false, false, false],
      auditFailed: [[], [], []],
    }
    const layout = stripLayout({ items: two, frames: fake, full: 100, width: 400 })
    expect(layout?.groups[0]!.rows[0]!.segments).toEqual([
      {
        x0: layout!.x(100),
        x1: layout!.x(80),
        state: ITEM_STATE.whole,
        variant: null,
        from: 0,
        to: 0,
      },
      {
        x0: layout!.x(80),
        x1: layout!.x(60),
        state: ITEM_STATE.variant,
        variant: "kb:1~v1",
        from: 1,
        to: 1,
      },
    ])
    expect(
      stripLayout({ items: two, frames: { ...fake, budgets: [] }, full: 100, width: 400 }),
    ).toBeNull()
    expect(stripLayout({ items: [], frames: fake, full: document.full, width: 400 })).toBeNull()
    const single = stripLayout({
      items: two,
      frames: { ...fake, budgets: [50], states: new Uint8Array([1]), variants: [[]] },
      full: 50,
      width: 400,
    })
    expect(single?.x.domain()).toEqual([51, 49])
  })

  it("names a slot's plane by its prefix", () => {
    expect(planeOfSlot("evidence.knowledge")).toBe("evidence")
    expect(planeOfSlot("loose")).toBeNull()
    expect(planeOfSlot(null)).toBeNull()
  })
})
