import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D2_FIXTURE_RUNS.nightly

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 2's cost page", () => {
  it("places S5 beside the viability document's Domain 4, which it measures only in part", async () => {
    renderApp("/d2/cost")
    expect(await screen.findByRole("heading", { level: 1, name: "Cost" })).toBeInTheDocument()
    const viability = await section("viability")
    expect(
      viability.getByText(/Domain 4 section, which Domain 2 measures only in part/),
    ).toBeInTheDocument()
    expect(viability.getByText(/Domain 2 does not measure prefix caching/)).toBeInTheDocument()
    // The sidebar's item, beside the breadcrumb's.
    expect(
      screen
        .getAllByRole("link", { name: "Cost" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true)
  })

  it("plots tokens per correct answer and latency per arm, then S5's cost block", async () => {
    renderApp("/d2/cost")
    const evidence = await section("evidence")
    const tokens = await evidence.findByRole("region", {
      name: "Prompt tokens per correct answer at 8,192 tokens",
    })
    const pinned = within(tokens).getByText("truncate-pinned").closest("tr") as HTMLElement
    expect(within(pinned).getByText("4,704 tokens")).toBeInTheDocument()
    const latency = evidence.getByRole("region", {
      name: "Median latency per call at 8,192 tokens",
    })
    expect(within(latency).getByText("cwa-state")).toBeInTheDocument()

    expect(await evidence.findByText("The margin")).toBeInTheDocument()
    expect(evidence.getByRole("region", { name: "Under-count by prompt size" })).toBeInTheDocument()
    expect(evidence.getAllByRole("link", { name: run }).length).toBeGreaterThan(0)
  })

  it("reads the budget from the address", async () => {
    renderApp("/d2/cost?at=16384")
    expect(
      await screen.findByRole("region", {
        name: "Prompt tokens per correct answer at 16,384 tokens",
      }),
    ).toBeInTheDocument()
  })
})
