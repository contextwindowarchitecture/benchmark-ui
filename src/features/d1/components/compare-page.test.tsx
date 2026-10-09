import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

describe("compare page", () => {
  it("renders the harness's report when it compared exactly this pair", async () => {
    renderApp(`/d1/compare?from=20261008T131247Z-691b414&to=${FIXTURE_RUNS.nightly}`)
    expect(await screen.findByText("The harness's own report")).toBeInTheDocument()
    const report = document.querySelector('[data-source="harness"]') as HTMLElement
    expect(within(report).getByText("changed")).toBeInTheDocument()
    expect(within(report).getAllByText("partial").length).toBeGreaterThan(0)
    expect(within(report).getByText(/0 new, 1 resolved, 0 persisting/)).toBeInTheDocument()
    expect(screen.queryByText(/Computed by this viewer/)).toBeNull()
  })

  it("computes the comparison for a pair the harness did not compare, and says so", async () => {
    renderApp(`/d1/compare?from=${FIXTURE_RUNS.failing}&to=${FIXTURE_RUNS.nightly}`)
    expect(
      await screen.findByText("Computed by this viewer, not by the harness"),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "20261008T131247Z-691b414" })).toHaveAttribute(
      "href",
      `/d1/compare?from=20261008T131247Z-691b414&to=${FIXTURE_RUNS.nightly}`,
    )
    const suites = document.querySelector("[data-suites]") as HTMLElement
    expect(suites.querySelectorAll('[data-changed="true"]')).toHaveLength(3)
    expect(
      within(suites.querySelector('[data-suite="S11"]') as HTMLElement).getByText(
        "not in the from run",
      ),
    ).toBeInTheDocument()
    const metrics = screen.getByRole("region", { name: "Metrics that moved table" })
    expect(within(metrics).getAllByRole("row")).toHaveLength(42)
    expect(within(metrics).getAllByText("not in this run")).toHaveLength(27)
    const bumps = screen.getByRole("region", { name: "Bumps table" })
    expect(within(bumps).getByText("302bbea")).toBeInTheDocument()
    expect(within(bumps).getByText("92b4d6f")).toBeInTheDocument()
    const findings = document.querySelector("[data-findings]") as HTMLElement
    expect(within(findings).getByText(/S4/)).toBeInTheDocument()
    expect(screen.getByText(/19 in/)).toBeInTheDocument()
  })

  it("asks for two different runs, and shows a pruned run as such", async () => {
    renderApp("/d1/compare")
    expect(await screen.findByText(/Pick two runs above/)).toBeInTheDocument()
    const { unmount } = renderApp(
      `/d1/compare?from=${FIXTURE_RUNS.nightly}&to=${FIXTURE_RUNS.nightly}`,
    )
    expect(await screen.findByText(/Pick two different runs/)).toBeInTheDocument()
    unmount()
    renderApp(`/d1/compare?from=${FIXTURE_RUNS.failing}&to=${FIXTURE_RUNS.s7}`, {
      overrides: { [`/results/d1/${FIXTURE_RUNS.s7}/index.json`]: { status: 404 } },
    })
    expect(
      await screen.findByText(`Run ${FIXTURE_RUNS.s7} is not on the server`),
    ).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe("Compare · CWA benchmark"))
  })
})
