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

    // From the suite summaries' typed by_arm blocks (harness ask 13).
    expect(
      await evidence.findByRole("img", {
        name: /^Paired difference from truncate-pinned at 8,192 tokens/,
      }),
    ).toBeInTheDocument()
    const paired = evidence.getByRole("region", {
      name: "Paired difference from truncate-pinned at 8,192 tokens",
    })
    expect(
      within(paired).getByRole("cell", {
        name: "cwa-state, 8,192 tokens: +15.3 pp, 95% interval +5.1 to +28.0 pp, over 432 pairs",
      }),
    ).toBeInTheDocument()
    const attribution = evidence.getByRole("region", {
      name: "Correct answers by whether the facts were sent at 8,192 tokens",
    })
    expect(
      within(attribution).getByRole("cell", { name: "window, Facts not sent: 0% (0 / 192)" }),
    ).toBeInTheDocument()
    expect(
      within(attribution).getByRole("cell", {
        name: "control-full, Facts not sent: no probe counted here",
      }),
    ).toBeInTheDocument()
    // concat overflowed on 135 probes, which this run's S2 filed under "facts sent" although
    // nothing was sent: the cell says so rather than claiming every probe had its facts sent.
    expect(
      within(attribution).getByRole("cell", {
        name: /^concat, Facts sent: .*; 135 of these reached no model$/,
      }),
    ).toBeInTheDocument()
    expect(
      within(attribution).getByRole("cell", {
        name: "concat, Facts not sent: no probe counted here",
      }),
    ).toBeInTheDocument()
    expect(evidence.getByText(/An overflow or a refusal reaches no model/)).toBeInTheDocument()
    // The upper bounds have no budget, so the paired table cut to the budget says so.
    expect(
      within(paired).getByRole("cell", {
        name: "control-full, 8,192 tokens: not paired, no budget",
      }),
    ).toBeInTheDocument()
    const documents = await evidence.findByRole("region", {
      name: "Paired difference from rag by corpus size",
    })
    expect(
      within(documents).getByRole("cell", {
        name: "cwa-ranked, 0.25 × the budget: +5.6 pp, 95% interval 0.0 to +11.1 pp, over 36 pairs",
      }),
    ).toBeInTheDocument()
    expect(
      await within(loop).findByRole("cell", {
        name: "window, less truncate-pinned: −24.0 pp, 95% interval −33.3 to −3.7 pp, over 96 pairs",
      }),
    ).toBeInTheDocument()
    expect(evidence.queryByText("What this page does not show yet")).toBeNull()
    expect(evidence.getByRole("link", { name: "S2's breakdowns" })).toHaveAttribute(
      "href",
      `/d2/runs/${run}/suites/S2#breakdowns`,
    )

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

  it("says when S6's own summary cannot be read, rather than dropping its column", async () => {
    renderApp("/d2", {
      overrides: { [`/results/d2/${run}/suites/S6/summary.json`]: { status: 404 } },
    })
    const evidence = await section("evidence")
    expect(
      await evidence.findByText(/S6's own summary, which holds each arm's difference/),
    ).toBeInTheDocument()
    expect(evidence.getByRole("region", { name: "The model in the loop" })).toBeInTheDocument()
  })
})
