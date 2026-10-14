import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D5_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D5_FIXTURE_RUNS.recorded

const loaded = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 5's runs list", () => {
  it("lists Domain 5's runs, linked under /d5", async () => {
    renderApp("/d5/runs")
    expect(await screen.findByRole("heading", { level: 1, name: "Runs" })).toBeInTheDocument()
    expect(screen.getByText(/Every run of Domain 5/)).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: run })).toHaveAttribute(
      "href",
      `/d5/runs/${run}`,
    )
  })
})

describe("Domain 5's run page", () => {
  it("renders the fixture: provenance, suites, what it generated, metrics, files", async () => {
    renderApp(`/d5/runs/${run}`)
    expect(await screen.findByRole("heading", { level: 1, name: run })).toBeInTheDocument()
    expect(await screen.findByText("A fixture, not a whole run")).toBeInTheDocument()

    const provenance = await loaded("provenance")
    expect(await provenance.findByText(/cwa-bench-d5 0\.1\.0/)).toBeInTheDocument()

    const suites = await loaded("suites")
    expect(await suites.findByRole("link", { name: /S6 · Persistence/ })).toHaveAttribute(
      "href",
      `/d5/runs/${run}/suites/S6`,
    )

    const generated = await loaded("generated")
    const tasks = await generated.findByRole("region", { name: "Tasks table" })
    const email = within(tasks).getByText("EM · Email").closest("tr") as HTMLElement
    expect(within(email).getByText("recorded")).toBeInTheDocument()
    const attacks = await generated.findByRole("region", { name: "Attacks table" })
    expect(within(attacks).getByText("EX · Extraction")).toBeInTheDocument()
    expect(
      await generated.findByRole("region", { name: "External sets table" }),
    ).toBeInTheDocument()

    const metrics = await loaded("metrics")
    // S5's rates are filed under S5, not S2 (ask 22), and a length is named as tokens.
    expect(await metrics.findAllByText("s5.asr")).not.toHaveLength(0)
    expect(metrics.getAllByText("4k tokens").length).toBeGreaterThan(0)
    expect(await loaded("files")).toBeTruthy()
  })
})

describe("Domain 5's suite pages", () => {
  it("lay out S2's metrics by arm, by arm and tier, and paired in percentage points", async () => {
    renderApp(`/d5/runs/${run}/suites/S2`)
    expect(
      await screen.findByRole("heading", { level: 1, name: "S2 · Static attacks" }),
    ).toBeInTheDocument()
    const arms = await loaded("arms")
    const byArm = await arms.findByRole("region", { name: "S2 metrics by arm" })
    expect(within(byArm).getByText("The escaping control")).toBeInTheDocument()
    expect(
      within(byArm).getByRole("cell", { name: /^naive, Attacks executed: 18\.0%/ }),
    ).toBeInTheDocument()
    const length = arms.getByRole("region", { name: /Attacks executed, padded content by arm/ })
    const headers = within(length)
      .getAllByRole("columnheader")
      .map((header) => header.textContent)
    expect(headers).toEqual(["Arm", "1k tokens", "4k tokens", "16k tokens", "32k tokens"])
    const paired = await loaded("paired")
    expect(
      paired.getByRole("cell", { name: /^cwa less xml-unescaped: −7\.3 pp, 95% interval/ }),
    ).toBeInTheDocument()
    const rows = await loaded("rows")
    expect(rows.getByText("suites/S2/probes.jsonl")).toBeInTheDocument()
  })

  it("show S4's budget from its typed block", async () => {
    renderApp(`/d5/runs/${run}/suites/S4`)
    const budget = await loaded("budget")
    expect(await budget.findByText("500, 1,000, 2,000")).toBeInTheDocument()
  })

  it("show S1's gate from its typed block", async () => {
    renderApp(`/d5/runs/${run}/suites/S1`)
    expect(await screen.findByText("Cells and CWA arms through the gate")).toBeInTheDocument()
  })

  it("name S0's self-checks in words", async () => {
    renderApp(`/d5/runs/${run}/suites/S0`)
    expect(
      await screen.findByText("Planted forgeries the structure oracle reads right"),
    ).toBeInTheDocument()
  })

  it("says a suite is not in the run", async () => {
    renderApp(`/d5/runs/${run}/suites/S9`)
    expect(await screen.findByText(/Suite S9: not in this run/)).toBeInTheDocument()
  })
})
