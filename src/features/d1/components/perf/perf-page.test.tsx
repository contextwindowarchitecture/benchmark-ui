import { screen, within } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const s7 = FIXTURE_RUNS.s7

describe("the performance page", () => {
  it("shows startup, the exponents, the scaling plots, throughput, refusal and the cells", async () => {
    renderApp(`/d1/runs/${s7}/perf`)
    expect(
      await screen.findByRole("heading", { level: 1, name: "Performance" }),
    ).toBeInTheDocument()
    const startup = await screen.findByRole("region", { name: "Startup table" })
    await screen.findByRole("heading", { level: 2, name: "Scaling" })
    expect(within(startup).getAllByRole("row")).toHaveLength(5)
    // The run records each assembler's own peak memory, so the page has no warning about it.
    expect(document.querySelector('[data-state="uniform-peak-memory"]')).toBeNull()
    expect(document.getElementById("exponents")).not.toBeNull()
    const scaling = document.getElementById("scaling") as HTMLElement
    const panel = within(scaling).getByRole("img", { name: /^compressible-v0/ })
    expect(panel).toHaveAccessibleName(/Python exponent \d\.\d\d ± \d\.\d\d, r² \d\.\d\d, 4 points/)
    expect(panel.querySelectorAll("[data-fit-line]")).toHaveLength(4)
    expect(screen.getByRole("region", { name: "Throughput table" })).toBeInTheDocument()
    const refusal = screen.getByRole("region", { name: "Time to refusal table" })
    expect(within(refusal).getAllByRole("row")).toHaveLength(5)
    expect(screen.getByText("108 of 108 cells, page 1 of 3.")).toBeInTheDocument()
    expect(screen.queryByText("The harness marks these timings unreliable")).toBeNull()
    expect(screen.getByRole("link", { name: /Every sample/ })).toBeInTheDocument()
  })

  it("takes the plots' choice and the cells' filters from the address", async () => {
    renderApp(`/d1/runs/${s7}/perf?series=tokens&method=e2e&label=threshold-1&adapter=go`)
    await screen.findByRole("heading", { level: 2, name: "Scaling" })
    const scaling = document.getElementById("scaling") as HTMLElement
    expect(
      await within(scaling).findByText(
        /tokens at fixed candidates, timed end to end, at the budget threshold-1/,
      ),
    ).toBeInTheDocument()
    expect(within(scaling).getAllByText("candidate tokens").length).toBeGreaterThan(0)
    expect(screen.getByText("27 of 108 cells.")).toBeInTheDocument()
  })

  it("puts the banner over unreliable timings and leaves the exponents out", async () => {
    const perf = JSON.parse(
      await readFile(join(FIXTURES_DIR, s7, "perf/summary.json"), "utf8"),
    ) as Record<string, unknown>
    renderApp(`/d1/runs/${s7}/perf`, {
      overrides: {
        [`/results/d1/${s7}/perf/summary.json`]: {
          status: 200,
          body: JSON.stringify({ ...perf, reliable: false, host_suspended_seconds: 12.5 }),
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText("The harness marks these timings unreliable"),
    ).toBeInTheDocument()
    expect(screen.getByText(/suspended for 12.5 s/)).toBeInTheDocument()
    expect(document.getElementById("exponents")).toBeNull()
  })

  it("points a run without S7 at the newest run that has it", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}/perf`)
    expect(await screen.findByText("S7's performance: not in this run")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: s7 })).toHaveAttribute("href", `/d1/runs/${s7}/perf`)
  })
})
