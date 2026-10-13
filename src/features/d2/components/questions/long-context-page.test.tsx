import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D2_FIXTURE_RUNS.nightly

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 2's long-context page", () => {
  it("names the viability document's LongBench v2 row and the paper, and says Domain 2 does not run it", async () => {
    renderApp("/d2/long-context")
    expect(
      await screen.findByRole("heading", { level: 1, name: "Long Context" }),
    ).toBeInTheDocument()
    const viability = await section("viability")
    expect(viability.getByRole("link", { name: /^LongBench v2: Towards Deeper/ })).toHaveAttribute(
      "href",
      "https://arxiv.org/abs/2412.15204",
    )
    expect(viability.getByText(/Domain 2 does not run LongBench v2/)).toBeInTheDocument()
  })

  it("draws every question's correct answers over corpus size, then the other S4 and S1 panels", async () => {
    renderApp("/d2/long-context")
    const evidence = await section("evidence")
    const curves = await evidence.findByRole("region", {
      name: "Correct answers by corpus size: every question",
    })
    expect(
      within(curves).getByRole("cell", { name: "control-full, 1 × the budget: 91.7% (33 / 36)" }),
    ).toBeInTheDocument()
    expect(
      await evidence.findByRole("region", {
        name: "Needed chunks in the payload by arm and corpus size",
      }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("region", { name: "Paired difference from rag by corpus size" }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("region", {
        name: "Abstentions and prompt size by arm and corpus size",
      }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("region", { name: "Near-miss answers by arm and corpus size" }),
    ).toBeInTheDocument()
    expect(evidence.getAllByRole("link", { name: run }).length).toBeGreaterThan(0)
  })

  it("counts one kind of question when the address names it", async () => {
    renderApp("/d2/long-context?questions=single")
    const curves = await screen.findByRole("region", {
      name: "Correct answers by corpus size: one site's fact",
    })
    expect(
      within(curves).getByRole("cell", { name: "truncate-pinned, 4 × the budget: 0% (0 / 12)" }),
    ).toBeInTheDocument()
  })

  it("reads an unknown question filter as every question", async () => {
    renderApp("/d2/long-context?questions=nope")
    expect(
      await screen.findByRole("region", { name: "Correct answers by corpus size: every question" }),
    ).toBeInTheDocument()
  })
})
