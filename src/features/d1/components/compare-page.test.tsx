import { screen, waitFor, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

/**
 * The nightly's ci.json as the harness would have written it against the failing run. The fixture's
 * own report is its profile's baseline (no previous run), so the harness's comparison of a pair is
 * exercised on its report with `previous`, `verdict` and `suites` filled in the producer's shape.
 */
function reportAgainstFailing() {
  const ci = JSON.parse(
    readFileSync(join(FIXTURES_DIR, FIXTURE_RUNS.nightly, "ci.json"), "utf8"),
  ) as Record<string, unknown>
  return JSON.stringify({
    ...ci,
    previous: {
      run_id: FIXTURE_RUNS.failing,
      status: "fail",
      started_at: "2026-10-08T00:42:13.231Z",
    },
    verdict: "changed",
    suites: [
      { id: "S4", status: "pass", previous: "fail" },
      { id: "S5", status: "pass", previous: "fail" },
    ],
  })
}

describe("compare page", () => {
  it("renders the harness's report when it compared exactly this pair", async () => {
    renderApp(`/d1/compare?from=${FIXTURE_RUNS.failing}&to=${FIXTURE_RUNS.nightly}`, {
      overrides: {
        [`/results/d1/${FIXTURE_RUNS.nightly}/ci.json`]: {
          status: 200,
          body: reportAgainstFailing(),
          contentType: "application/json",
        },
      },
    })
    expect(await screen.findByText("The harness's own report")).toBeInTheDocument()
    const report = document.querySelector('[data-source="harness"]') as HTMLElement
    expect(within(report).getByText("changed")).toBeInTheDocument()
    expect(within(report).getAllByText("fail").length).toBeGreaterThan(0)
    expect(within(report).getByText(/0 new, 0 resolved, 0 persisting/)).toBeInTheDocument()
    expect(screen.queryByText(/Computed by this viewer/)).toBeNull()
  })

  it("computes the comparison for a pair the harness did not compare, and says so", async () => {
    renderApp(`/d1/compare?from=${FIXTURE_RUNS.failing}&to=${FIXTURE_RUNS.nightly}`)
    expect(
      await screen.findByText("Computed by this viewer, not by the harness"),
    ).toBeInTheDocument()
    // The nightly's own report is its profile's baseline, so there is no harness pair to link.
    expect(screen.getByText(/is the profile's baseline, compared with no run/)).toBeInTheDocument()
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
