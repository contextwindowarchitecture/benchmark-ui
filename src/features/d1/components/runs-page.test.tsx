import { screen, waitFor, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const indexJson = () => readFileSync(join(FIXTURES_DIR, "index.json"), "utf8")

function rowOf(runId: string) {
  const row = document.querySelector(`tr[data-run="${runId}"]`)
  if (!row) throw new Error(`no row for ${runId}`)
  return within(row as HTMLElement)
}

describe("runs list", () => {
  it("renders every run of the fixture index with status, profile, duration, suites, adapters and commits", async () => {
    renderApp("/d1/runs")
    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument()
    expect(await screen.findByText("3 runs")).toBeInTheDocument()
    const rows = document.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(3)
    // Newest first by default.
    expect(rows[0]).toHaveAttribute("data-run", FIXTURE_RUNS.nightly)

    const nightly = rowOf(FIXTURE_RUNS.nightly)
    expect(nightly.getByRole("link", { name: FIXTURE_RUNS.nightly })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.nightly}`,
    )
    expect(nightly.getByText("2026-10-08 13:34:53 UTC")).toBeInTheDocument()
    expect(nightly.getByText("pass")).toBeInTheDocument()
    expect(nightly.getByText("nightly")).toBeInTheDocument()
    expect(nightly.getByText("18 min 15 s")).toBeInTheDocument()
    expect(nightly.getByText("S0 S1 S2 S4 S5 S6 S8 S9 S10 S11 S12")).toBeInTheDocument()
    expect(
      nightly.getByRole("list", { name: "Adapters: Python, TypeScript, Go, Rust" }),
    ).toBeInTheDocument()
    expect(nightly.getByText("16de4be")).toHaveAttribute(
      "title",
      "16de4be0534583f135a597171c927d42c87ee82c",
    )
    expect(nightly.getByText("contract")).toBeInTheDocument()
    // The verdict comes from ci.json, lazily.
    expect(await nightly.findByText("changed")).toBeInTheDocument()

    const s7 = rowOf(FIXTURE_RUNS.s7)
    expect(s7.getByText("S7")).toBeInTheDocument()
    expect(await s7.findByText("no report")).toBeInTheDocument()
    expect(rowOf(FIXTURE_RUNS.failing).getByText("fail")).toBeInTheDocument()
  })

  it("filters by status and profile from the URL and says when nothing matches", async () => {
    renderApp("/d1/runs?status=fail")
    expect(await screen.findByText("1 of 3 runs match")).toBeInTheDocument()
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1)
    renderApp("/d1/runs?profile=none")
    expect(await screen.findByText("2 of 3 runs match")).toBeInTheDocument()
    renderApp("/d1/runs?profile=weekly")
    expect(await screen.findByText("No runs match these filters.")).toBeInTheDocument()
  })

  it("sorts by a column from the URL", async () => {
    renderApp("/d1/runs?sort=status&dir=asc")
    await screen.findByText("3 runs")
    const rows = document.querySelectorAll("tbody tr")
    expect(rows[0]).toHaveAttribute("data-run", FIXTURE_RUNS.failing)
    expect(screen.getByRole("columnheader", { name: /Status/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    )
  })

  it("shows a running run without a link and a pruned run as pruned", async () => {
    const index = JSON.parse(indexJson()) as { runs: Record<string, unknown>[] }
    const running = {
      ...index.runs[0],
      run_id: "20261009T000000Z-691b414",
      status: "running",
      finished_at: null,
      started_at: "2026-10-09T00:00:00.000Z",
    }
    renderApp("/d1/runs", {
      overrides: {
        "/results/d1/index.json": {
          status: 200,
          body: JSON.stringify({ ...index, runs: [running, ...index.runs] }),
          contentType: "application/json",
        },
        [`/results/d1/${FIXTURE_RUNS.failing}/index.json`]: { status: 404 },
      },
    })
    expect(await screen.findByText("4 runs")).toBeInTheDocument()
    const runningRow = rowOf("20261009T000000Z-691b414")
    expect(runningRow.queryByRole("link")).toBeNull()
    expect(
      runningRow.getByText("running", { selector: "span[data-status] span" }),
    ).toBeInTheDocument()
    const pruned = rowOf(FIXTURE_RUNS.failing)
    await waitFor(() => expect(pruned.getByText("pruned")).toBeInTheDocument())
    expect(pruned.queryByRole("link")).toBeNull()
  })

  it("tells a failed index load from an empty index", async () => {
    renderApp("/d1/runs", { overrides: { "/results/d1/index.json": { status: 503 } } })
    expect(await screen.findByText("Could not load the runs index")).toBeInTheDocument()
    renderApp("/d1/runs", {
      overrides: {
        "/results/d1/index.json": {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/runs-index/v1","latest":null,"runs":[]}',
          contentType: "application/json",
        },
      },
    })
    expect(await screen.findByText(/No runs yet/)).toBeInTheDocument()
  })
})
