import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D2_FIXTURE_RUNS.nightly

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 2's overview", () => {
  it("reads as claim, answer, evidence, trust and drill-down, from the runs it names", async () => {
    renderApp("/d2")
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Domain 2 · Long-horizon multi-turn stability and context drift",
      }),
    ).toBeInTheDocument()

    const claim = await section("claim")
    expect(
      claim.getByText(/does a model given CWA-assembled context keep doing the task/),
    ).toBeInTheDocument()
    const runs = await claim.findByRole("region", { name: "Runs read" })
    expect(within(runs).getByRole("link", { name: run })).toHaveAttribute("href", `/d2/runs/${run}`)
    expect(await within(runs).findByText("pilot")).toBeInTheDocument()
    expect(within(runs).getAllByRole("row")).toHaveLength(2)

    const answer = await section("answer")
    expect(answer.getByText("With state the same model writes")).toBeInTheDocument()

    const evidence = await section("evidence")
    const aptitude = await evidence.findByRole("img", {
      name: /^Correct answers per arm at 8,192 tokens/,
    })
    expect(aptitude).toBeInTheDocument()
    const table = evidence.getByRole("region", { name: "Correct answers per arm at 8,192 tokens" })
    const pinned = within(table).getByText("truncate-pinned").closest("tr") as HTMLElement
    expect(within(pinned).getByText("84.3%")).toBeInTheDocument()
    expect(within(pinned).getByText("71.8% to 94.3%")).toBeInTheDocument()
    expect(within(pinned).getByText("91.7%")).toBeInTheDocument()
    const upper = within(table).getByText("control-full").closest("tr") as HTMLElement
    expect(within(upper).getByText("no budget")).toBeInTheDocument()

    expect(
      evidence.getByRole("region", { name: "Correct answers per arm and corpus size" }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("img", { name: /^Unreliability per arm at 8,192 tokens/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("img", { name: /^Prompt tokens per correct answer at 8,192 tokens/ }),
    ).toBeInTheDocument()
    const loop = evidence.getByRole("region", { name: "The model in the loop" })
    expect(within(loop).getAllByRole("row").length).toBeGreaterThan(1)
    expect(evidence.getByText("What this page does not show yet")).toBeInTheDocument()

    const trust = await section("trust")
    const agreement = trust
      .getAllByText("Snapshots every adapter answered alike")
      .map((node) => node.closest("[data-metric]"))
      .find(Boolean) as HTMLElement
    expect(within(agreement).getByText("100%")).toBeInTheDocument()
    expect(trust.getByText("One model")).toBeInTheDocument()
    expect(trust.getByText("The fact-in-payload oracle")).toBeInTheDocument()

    const drill = await section("drill-down")
    expect(drill.getByRole("link", { name: "Every run" })).toHaveAttribute("href", "/d2/runs")
  })

  it("names a pinned run the index does not list and reads the rule's runs instead", async () => {
    renderApp("/d2?run=20260101T000000Z-0000000")
    expect(
      await screen.findByText("The address names a run the index does not list"),
    ).toBeInTheDocument()
    expect(await screen.findByRole("region", { name: "Runs read" })).toBeInTheDocument()
  })

  it("says there is no evidence when the index lists no finished run", async () => {
    renderApp("/d2", {
      overrides: {
        "/results/d2/index.json": {
          status: 200,
          body: '{"$schema":"cwa-bench-d2/runs-index/v1","latest":null,"runs":[]}',
          contentType: "application/json",
        },
      },
    })
    expect(await screen.findByText("No finished run yet")).toBeInTheDocument()
    expect(screen.getByText("S2: not in this run")).toBeInTheDocument()
  })

  it("does not read Domain 1's index as Domain 2's", async () => {
    renderApp("/d2", {
      overrides: {
        "/results/d2/index.json": {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/runs-index/v1","latest":null,"runs":[]}',
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText(/This viewer does not read cwa-bench-d1\/runs-index\/v1 where/),
    ).toBeInTheDocument()
  })
})
