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

describe("a Domain 2 suite page", () => {
  it("lays S2's metrics out by arm and tier, names the open blocks, and pages its grades", async () => {
    renderApp(`/d2/runs/${run}/suites/S2`)
    expect(
      await screen.findByRole("heading", { level: 1, name: "S2 · Scripted conversations" }),
    ).toBeInTheDocument()
    expect(await screen.findByText("Not read until the harness types them")).toBeInTheDocument()

    const gate = await loaded("metrics")
    expect(gate.getByText("s2.call_errors")).toBeInTheDocument()

    const arms = await loaded("arms")
    const aptitude = arms.getByRole("region", { name: "Correct answers by arm and tier" })
    const cell = within(aptitude).getByRole("cell", {
      name: /^truncate-pinned, 8,192 tokens: 84\.3% \(364 \/ 432\), 95% interval 71\.8% to 94\.3%$/,
    })
    expect(cell).toBeInTheDocument()
    expect(
      within(aptitude).getByRole("cell", { name: "control-full, 8,192 tokens: not measured" }),
    ).toBeInTheDocument()

    const rows = await loaded("rows")
    const user = userEvent.setup()
    await user.click(rows.getByRole("button", { name: "Load the rows" }))
    expect(await rows.findByText("12 rows")).toBeInTheDocument()
    expect(rows.getAllByText("correct").length).toBeGreaterThan(0)
  })

  it("opens a filtered page of rows from the address", async () => {
    renderApp(`/d2/runs/${run}/suites/S2?arm=truncate-pinned`)
    const rows = await loaded("rows")
    expect(await rows.findByText(/of 12 rows match/)).toBeInTheDocument()
  })

  it("shows S0's self-checks and S1's gate from their typed blocks", async () => {
    renderApp(`/d2/runs/${run}/suites/S0`)
    const checks = await loaded("self-check")
    expect(await checks.findByText("Planted replies graded as intended")).toBeInTheDocument()
    expect(checks.getAllByRole("row")).toHaveLength(10)

    renderApp(`/d2/runs/${run}/suites/S1`)
    const gate = await loaded("gate")
    expect(await gate.findByText("Conversations and arms through the gate")).toBeInTheDocument()
  })

  it("says a suite is not in the run", async () => {
    renderApp(`/d2/runs/${run}/suites/S9`)
    expect(await screen.findByText(/Suite S9: not in this run/)).toBeInTheDocument()
  })
})
