import { screen, within } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const s7 = FIXTURE_RUNS.s7

describe("the sweeps list", () => {
  it("lists every sweep the summary names, linking the ones the run's index lists", async () => {
    renderApp(`/d1/runs/${s7}/sweeps`)
    expect(await screen.findByRole("heading", { level: 1, name: "Shedding" })).toBeInTheDocument()
    const table = await screen.findByRole("region", { name: "Sweeps table" })
    const rows = within(table).getAllByRole("row").slice(1)
    expect(rows).toHaveLength(8)
    // The fixture keeps two of the eight sweep files.
    const links = within(table).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["droppable-heavy", "compressible-v0"])
    expect(links[1]).toHaveAttribute(
      "href",
      `/d1/runs/${s7}/sweeps/1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3`,
    )
    expect(within(table).getAllByText(/^Not in the run's file list/)).toHaveLength(6)
    const first = rows[0]!
    expect(within(first).getByText("268")).toBeInTheDocument()
    expect(within(first).getByText("4 agree")).toBeInTheDocument()
    expect(within(first).getByText("as computed")).toBeInTheDocument()
    expect(within(first).getByText("as predicted, audit clean")).toBeInTheDocument()
    expect(within(first).getByText(/70% droppable examples and user state/)).toBeInTheDocument()
  })

  it("points a run without S7 at the newest run that has it", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}/sweeps`)
    expect(await screen.findByText("S7's sweeps: not in this run")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: s7 })).toHaveAttribute("href", `/d1/runs/${s7}/sweeps`)
  })

  it("says so when the summary has no scale block", async () => {
    const withoutScale = JSON.parse(
      await readFile(join(FIXTURES_DIR, s7, "suites/S7/summary.json"), "utf8"),
    ) as Record<string, unknown>
    delete withoutScale.scale
    renderApp(`/d1/runs/${s7}/sweeps`, {
      overrides: {
        [`/results/d1/${s7}/suites/S7/summary.json`]: {
          status: 200,
          body: JSON.stringify(withoutScale),
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText("S7's summary in this run has no scale block, so no sweeps to list."),
    ).toBeInTheDocument()
  })
})
