import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D2_FIXTURE_RUNS.nightly

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 2's variable tracking page", () => {
  it("names the viability document's RULER row and the paper, and says Domain 2 does not run it", async () => {
    renderApp("/d2/tracking")
    expect(
      await screen.findByRole("heading", { level: 1, name: "Variable tracking (RULER)" }),
    ).toBeInTheDocument()
    const viability = await section("viability")
    expect(viability.getByText(/Variable Tracking \(RULER\)/)).toBeInTheDocument()
    expect(
      viability.getByRole("link", { name: /RULER: What's the Real Context Size/ }),
    ).toHaveAttribute("href", "https://arxiv.org/abs/2404.06654")
    expect(viability.getByText(/Domain 2 does not run RULER/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Variable tracking (RULER)" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it("plots the VT family's current and stale values per arm from S2's tallies", async () => {
    renderApp("/d2/tracking")
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", { name: /^VT: the current value, at 8,192 tokens/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("img", { name: /^VT: a stale value, at 8,192 tokens/ }),
    ).toBeInTheDocument()
    const current = evidence.getByRole("region", { name: "VT: the current value, at 8,192 tokens" })
    expect(
      within(current).getByRole("cell", { name: "truncate-pinned: 95.8% (92 / 96)" }),
    ).toBeInTheDocument()
    const upper = within(current).getByText("control-full").closest("tr") as HTMLElement
    expect(within(upper).getByText("no budget")).toBeInTheDocument()

    const verdicts = evidence.getByRole("region", { name: "Grades by verdict at 8,192 tokens" })
    expect(
      within(verdicts).getByRole("cell", { name: "concat, Overflow, not sent: 31.3% (135 / 432)" }),
    ).toBeInTheDocument()

    expect(
      await evidence.findByRole("region", { name: "S3: VT · Variable tracking at 8,192 tokens" }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("img", { name: /^Stale answers in the loop at 8,192 tokens/ }),
    ).toBeInTheDocument()
    expect(evidence.getAllByRole("link", { name: run }).length).toBeGreaterThan(0)
  })

  it("reads the family and the budget from the address", async () => {
    renderApp("/d2/tracking?family=cc&at=16384")
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", { name: /^CC: the current value, at 16,384 tokens/ }),
    ).toBeInTheDocument()
  })

  it("reads a family or budget the run does not have as the default", async () => {
    renderApp("/d2/tracking?family=nope&at=1")
    expect(
      await screen.findByRole("img", { name: /^VT: the current value, at 8,192 tokens/ }),
    ).toBeInTheDocument()
  })

  it("says when S2's own summary cannot be read", async () => {
    renderApp("/d2/tracking", {
      overrides: { [`/results/d2/${run}/suites/S2/summary.json`]: { status: 404 } },
    })
    const evidence = await section("evidence")
    expect(
      (await evidence.findAllByText("S2's own summary could not be read; its suite page says why."))
        .length,
    ).toBeGreaterThan(0)
  })

  it("links the drill-down into the suite pages of the runs it read", async () => {
    renderApp("/d2/tracking")
    const drill = await section("drill-down")
    expect(
      await drill.findByRole("link", { name: "S2 by family, length and rule" }),
    ).toHaveAttribute("href", `/d2/runs/${run}/suites/S2#breakdowns`)
  })
})
