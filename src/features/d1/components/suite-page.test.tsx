import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const nightly = FIXTURE_RUNS.nightly

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("suite page", () => {
  it("renders S1 of the nightly: header, tallies, metrics, differential and the cases", async () => {
    renderApp(`/d1/runs/${nightly}/suites/S1`)
    expect(
      await screen.findByRole("heading", { level: 1, name: "S1 · Conformance replay" }),
    ).toBeInTheDocument()
    const overview = await section("overview")
    expect(await overview.findByRole("list", { name: "Requirements covered" })).toBeInTheDocument()
    expect(overview.getAllByRole("listitem").length).toBeGreaterThan(20)
    // The contract's words arrive after the summary.
    expect(
      await overview.findByText("Required fields and canonical JSON shape"),
    ).toBeInTheDocument()
    expect(overview.getByText("conformance.cases")).toBeInTheDocument()
    const tallies = overview.getByRole("region", { name: "Adapter tallies table" })
    expect(within(tallies).getAllByText("100% (65 / 65)")).toHaveLength(4)
    expect(overview.getByRole("link", { name: /Python conformance report/ })).toHaveAttribute(
      "href",
      `/results/d1/${nightly}/suites/S1/reports/python.conformance-report.json`,
    )
    expect(overview.getByText("No findings in this suite.")).toBeInTheDocument()

    const metrics = await section("metrics")
    expect(metrics.getAllByText("s1.cases.pass_rate")).toHaveLength(4)

    const panel = await section("panel")
    expect(panel.getByText("Differential agreement · 90 of 90 cases")).toBeInTheDocument()
    const cases = await panel.findByRole("region", { name: "Conformance cases table" })
    await waitFor(() => expect(within(cases).getAllByRole("row").length).toBeGreaterThan(1))

    // The rows load on request.
    const rows = await section("rows")
    expect(rows.getByText(/12 rows of/)).toBeInTheDocument()
    await userEvent.click(rows.getByRole("button", { name: "Load the rows" }))
    const table = await rows.findByRole("region", { name: "S1 rows table" })
    expect(within(table).getAllByRole("row")).toHaveLength(13)
    expect(rows.getByText("12 rows")).toBeInTheDocument()
    const first = within(table).getAllByRole("link")[0]
    expect(first?.getAttribute("href")).toMatch(new RegExp(`^/d1/runs/${nightly}/answers/S1/`))
  })

  it.each(["S0", "S2", "S4", "S5", "S6", "S8", "S9", "S10", "S11", "S12"])(
    "renders %s of the nightly with its panel",
    async (suite) => {
      renderApp(`/d1/runs/${nightly}/suites/${suite}`)
      expect(
        await screen.findByRole("heading", { level: 1, name: new RegExp(`^${suite} · `) }),
      ).toBeInTheDocument()
      const panel = await section("panel")
      expect(panel.getByRole("heading", { level: 2 })).toBeInTheDocument()
      expect(panel.queryByText(/does not match its schema/)).toBeNull()
    },
  )

  it("shows S0's mutation table and S12's drift, S2's matrix and S10's harmless writes", async () => {
    renderApp(`/d1/runs/${nightly}/suites/S0`)
    const s0 = await section("panel")
    expect(
      await s0.findByText("Mutation operators · 1,616 of 1,626 mutants killed"),
    ).toBeInTheDocument()
    expect(s0.getByText("Survivors · 10")).toBeInTheDocument()
    expect(s0.getByRole("link", { name: "The surviving mutants' rows" })).toHaveAttribute(
      "href",
      `/d1/runs/${nightly}/suites/S0?verdict=survived`,
    )

    renderApp(`/d1/runs/${nightly}/suites/S12`)
    const s12 = (await screen.findAllByRole("region", { name: "Golden drift table" }))[0]!
    expect(within(s12).getAllByText("1,352").length).toBeGreaterThanOrEqual(4)
    expect(screen.getByRole("link", { name: "20261008T030058Z-8cf806e" })).toHaveAttribute(
      "href",
      "/d1/runs/20261008T030058Z-8cf806e",
    )

    renderApp(`/d1/runs/${nightly}/suites/S2`)
    const matrix = (await screen.findAllByRole("region", { name: "Environment matrix" }))[0]!
    expect(within(matrix).getByText("baseline")).toBeInTheDocument()
    expect(matrix.querySelectorAll('[data-applied="false"]').length).toBeGreaterThan(0)

    renderApp(`/d1/runs/${nightly}/suites/S10`)
    const purity = (await screen.findAllByRole("region", { name: "Purity table" }))[0]!
    expect(within(purity).getAllByText(/\(harmless\)/).length).toBeGreaterThan(0)
  })

  it("says S7 is not in the nightly and points at the newest run that has it", async () => {
    renderApp(`/d1/runs/${nightly}/suites/S7`)
    expect(await screen.findByText("Suite S7: not in this run")).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: FIXTURE_RUNS.s7 })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.s7}/suites/S7`,
    )
  })

  it("renders S7's scale rows from the dedicated run, opened by the address", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.s7}/suites/S7?page=1`)
    expect(await screen.findByRole("heading", { level: 1, name: /^S7 · / })).toBeInTheDocument()
    expect(await screen.findByText("The scale grid is phase UI-P4")).toBeInTheDocument()
    const table = await screen.findByRole("region", { name: "S7 rows table" })
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1)
    expect(within(table).getAllByText("droppable-heavy", { exact: false }).length).toBeGreaterThan(
      0,
    )
  })

  it("filters the rows from the address and reports the count", async () => {
    renderApp(`/d1/runs/${nightly}/suites/S1?adapter=python&verdict=passed`)
    const rows = await section("rows")
    await rows.findByRole("region", { name: "S1 rows table" })
    expect(rows.getByText(/(of 12 rows match|12 rows)$/)).toBeInTheDocument()
    expect(rows.getByRole("combobox", { name: "Filter rows by adapter" })).toHaveTextContent(
      "Python",
    )
    await userEvent.click(rows.getByRole("button", { name: "Clear" }))
    expect(await rows.findByText("12 rows")).toBeInTheDocument()
  })

  it("keeps the rows when the suite summary is of an unsupported schema", async () => {
    renderApp(`/d1/runs/${nightly}/suites/S1`, {
      overrides: {
        [`/results/d1/${nightly}/suites/S1/summary.json`]: {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/suite-summary/v3"}',
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText("This viewer does not read cwa-bench-d1/suite-summary/v3"),
    ).toBeInTheDocument()
    const rows = await section("rows")
    expect(rows.getByRole("button", { name: "Load the rows" })).toBeInTheDocument()
  })

  it("shows the pruned state and rejects a bad suite id", async () => {
    renderApp(`/d1/runs/${nightly}/suites/S1`, {
      overrides: { [`/results/d1/${nightly}/index.json`]: { status: 404 } },
    })
    expect(await screen.findByText(`Run ${nightly} is not on the server`)).toBeInTheDocument()

    renderApp(`/d1/runs/${nightly}/suites/latest`)
    expect(await screen.findByText("latest is not a suite id.")).toBeInTheDocument()
  })
})
