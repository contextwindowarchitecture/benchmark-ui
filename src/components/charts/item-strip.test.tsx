import { render, screen, within } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseDocumentAs } from "@/data/validate"
import { sweepPath } from "@/features/d1/model/sweep-curve"
import { ITEM_STATE, sweepFrames } from "@/features/d1/model/sweep-frames"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { ItemStrip } from "./item-strip"

const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"

async function data() {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, sweepPath(SWEEP)), "utf8")),
    "sweep",
  )
  if (!result.ok) throw new Error(result.reason)
  return { full: result.document.full, ...sweepFrames(result.document) }
}

describe("the item strip", () => {
  it("dims the items the current frame did not keep and says the frame's counts", async () => {
    const { full, items, adapters } = await data()
    render(
      <ItemStrip items={items} frames={adapters[0]!} full={full} frame={1} adapterLabel="Python" />,
    )
    const chart = screen.getByRole("img", { name: /Items kept at each budget/ })
    expect(chart).toHaveAccessibleName(
      /At budget 1,980: 40 included whole, 0 as a variant, 2 omitted/,
    )
    const first = chart.querySelector(`[data-item="${items[0]!.id}"]`)
    expect(first?.getAttribute("data-state")).toBe(String(ITEM_STATE.omitted))
    expect(first?.getAttribute("opacity")).toBe("0.35")
    const kept = chart.querySelector('[data-item="q:base"]')
    expect(kept?.getAttribute("opacity")).toBe("1")
    expect(chart.querySelector('[data-tier="protected"]')).not.toBeNull()
    expect(chart.querySelector("[data-cursor]")).not.toBeNull()
    const table = screen.getByRole("region", { name: "Sweep items table" })
    expect(within(table).getAllByRole("row")).toHaveLength(43)
    expect(within(table).getAllByText("omitted")).toHaveLength(2)
  })

  it("says so when the adapter has no frames", async () => {
    const { full, items, adapters } = await data()
    render(
      <ItemStrip
        items={items}
        frames={{ ...adapters[0]!, budgets: [], states: new Uint8Array(), variants: [] }}
        full={full}
        frame={0}
        adapterLabel="Go"
      />,
    )
    expect(screen.getByText("Go has no frames.")).toBeInTheDocument()
  })
})
