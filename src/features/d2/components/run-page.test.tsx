import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D2_FIXTURE_RUNS.nightly

const loaded = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 2's runs list", () => {
  it("lists Domain 2's runs, linked under /d2, with the verdict from ci.json", async () => {
    renderApp("/d2/runs")
    expect(await screen.findByRole("heading", { level: 1, name: "Runs" })).toBeInTheDocument()
    expect(screen.getByText(/Every run of Domain 2/)).toBeInTheDocument()
    const link = await screen.findByRole("link", { name: run })
    expect(link).toHaveAttribute("href", `/d2/runs/${run}`)
    const row = link.closest("tr") as HTMLElement
    expect(await within(row).findByText("changed")).toBeInTheDocument()
    expect(within(row).getByText("nightly")).toBeInTheDocument()
  })
})

describe("Domain 2's run page", () => {
  it("renders the fixture: provenance, suites, scripts, metrics, no findings, drift, files", async () => {
    renderApp(`/d2/runs/${run}`)
    expect(await screen.findByRole("heading", { level: 1, name: run })).toBeInTheDocument()
    expect(await screen.findByText("A fixture, not a whole run")).toBeInTheDocument()

    const provenance = await loaded("provenance")
    expect(await provenance.findByText(/cwa-bench-d2 0\.1\.0/)).toBeInTheDocument()

    const suites = await loaded("suites")
    const s2 = await suites.findByRole("link", { name: /S2 · Scripted conversations/ })
    expect(s2).toHaveAttribute("href", `/d2/runs/${run}/suites/S2`)
    expect(suites.getAllByRole("row")).toHaveLength(9)

    const scripts = await loaded("scripts")
    expect(await scripts.findByText("VT · Variable tracking")).toBeInTheDocument()
    expect(scripts.getByText("LQ · Long context")).toBeInTheDocument()
    expect(scripts.getAllByText("pilot")).toHaveLength(5)

    const metrics = await loaded("metrics")
    expect(await metrics.findByText("459 metrics")).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(metrics.getByRole("searchbox", { name: "Search metrics" }), "s2.aptitude")
    expect(await metrics.findByText("24 of 459 metrics match")).toBeInTheDocument()
    const pinned = metrics
      .getAllByText("truncate-pinned")
      .map((node) => node.closest("tr") as HTMLElement)
      .find((row) => within(row).queryByText("8,192 tokens"))
    expect(pinned).toBeDefined()
    expect(within(pinned as HTMLElement).getByText("84.3%")).toBeInTheDocument()
    expect(within(pinned as HTMLElement).getByText("364 / 432")).toBeInTheDocument()
    expect(within(pinned as HTMLElement).getByText("71.8% to 94.3%")).toBeInTheDocument()

    expect((await loaded("findings")).getByText("No findings in this run")).toBeInTheDocument()

    const drift = await loaded("drift")
    expect(await drift.findByText("changed")).toBeInTheDocument()
    expect(drift.getByRole("link", { name: "20261011T142551Z-f6869af" })).toHaveAttribute(
      "href",
      "/d2/runs/20261011T142551Z-f6869af",
    )
    // Domain 2 has no compare page: the report does not link to one.
    expect(drift.queryByRole("link", { name: "Compare" })).toBeNull()
    expect(drift.getByText(/24,192 match/)).toBeInTheDocument()

    const files = await loaded("files")
    expect(files.getByRole("link", { name: "Download summary.json" })).toHaveAttribute(
      "href",
      `/results/d2/${run}/summary.json`,
    )
  })

  it("shows a run the server no longer holds as pruned", async () => {
    renderApp("/d2/runs/20260101T000000Z-0000000")
    expect(await screen.findByText(/is not on the server/)).toBeInTheDocument()
  })
})
