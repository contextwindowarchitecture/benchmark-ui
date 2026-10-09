// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { TimelineV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { countsThrough, isLane, LANES, walkView } from "./pipeline"

const TIMELINE =
  "timelines/0b7c50eb7a0298d763b683bbb8e34227a099303a1463deb642cb8afec7f3e56c/go.json"

async function timeline(): Promise<TimelineV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, TIMELINE), "utf8")),
    "timeline",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("the pipeline walk's view", () => {
  it("shapes a timeline's events onto the eight lanes in sequence order", async () => {
    const view = walkView(await timeline())
    expect(LANES).toHaveLength(8)
    expect([...view.byLane.keys()]).toEqual(LANES)
    expect(view.events).toHaveLength(42)
    expect(view.events.map((event) => event.seq)).toEqual([...view.events.keys()])
    expect(view.byLane.get("fit")).toHaveLength(40)
    expect(view.byLane.get("render")).toHaveLength(2)
    expect(view.byLane.get("admit")).toEqual([])
    expect(view.inferred).toBe(0)
    expect(view.unknownLanes).toEqual([])
  })

  it("sorts events the file lists out of order and marks inferred ones", async () => {
    const document = await timeline()
    const shuffled: TimelineV1 = {
      ...document,
      lanes: [...document.lanes, "extra"],
      events: [...document.events]
        .reverse()
        .map((event, i) => (i === 0 ? { ...event, order: "inferred" as const } : event)),
    }
    const view = walkView(shuffled)
    expect(view.events[0]!.seq).toBe(0)
    expect(view.inferred).toBe(1)
    expect(view.events.at(-1)!.inferred).toBe(true)
    expect(view.unknownLanes).toEqual(["extra"])
    expect(isLane("extra")).toBe(false)
  })

  it("counts events by type up to a step", async () => {
    const view = walkView(await timeline())
    expect(countsThrough(view, -1).size).toBe(0)
    expect(countsThrough(view, 0).get("omitted")).toBe(1)
    const all = countsThrough(view, view.events.length - 1)
    expect(all.get("omitted")).toBe(40)
    expect(all.get("placed")).toBe(2)
  })
})
