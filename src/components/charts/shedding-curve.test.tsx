import { render, screen, within } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { parseDocumentAs } from "@/data/validate"
import { summarizeSweep, sweepPath, type SweepSummary } from "@/features/d1/model/sweep-curve"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { SheddingCurve } from "./shedding-curve"
import { shownSeries } from "./shedding-geometry"

const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"

async function summary(): Promise<SweepSummary> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, sweepPath(SWEEP)), "utf8")),
    "sweep",
  )
  if (!result.ok) throw new Error(result.reason)
  return summarizeSweep(result.document)
}

describe("the shedding curve", () => {
  it("shows one adapter's frames when the adapters agree, with the rules and the table", async () => {
    const data = await summary()
    expect(shownSeries(data).map((s) => s.adapter)).toEqual(["python"])
    render(<SheddingCurve summary={data} tableOpen />)
    const chart = screen.getByRole("img", { name: /Shedding curve of compressible-v0/ })
    expect(chart).toHaveAccessibleName(/charged tokens against a budget shrinking from 2,104/)
    expect(screen.getByText("4 of 4 agree")).toBeInTheDocument()
    expect(chart.querySelector('[data-rule="threshold"]')).not.toBeNull()
    expect(chart.querySelector('[data-rule="protected"]')).not.toBeNull()
    expect(chart.querySelector('[data-region="refused"]')).not.toBeNull()
    expect(chart.querySelector('[data-series="python"] path')).not.toBeNull()
    const table = screen.getByRole("region", { name: "Sweep frames table" })
    expect(within(table).getAllByRole("row")).toHaveLength(17)
    expect(within(table).getAllByText("refused").length).toBeGreaterThan(0)
  })

  it("overlays every adapter when they disagree", async () => {
    const data = { ...(await summary()), agree: false }
    expect(shownSeries(data)).toHaveLength(4)
    render(<SheddingCurve summary={data} />)
    expect(screen.getByText("adapters disagree")).toBeInTheDocument()
    const chart = screen.getByRole("img")
    expect(chart.querySelectorAll("[data-series]")).toHaveLength(4)
  })

  it("marks a reveal done at once where it cannot animate", async () => {
    // jsdom has no path length, so the reveal is declined and reported done.
    const onRevealed = vi.fn()
    render(<SheddingCurve summary={await summary()} reveal onRevealed={onRevealed} />)
    expect(onRevealed).toHaveBeenCalled()
  })

  it("says so when a sweep has no frames", async () => {
    const data = { ...(await summary()), curves: [] }
    render(<SheddingCurve summary={data} />)
    expect(screen.getByText("This sweep has no frames.")).toBeInTheDocument()
  })
})
