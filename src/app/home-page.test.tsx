import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

describe("home page", () => {
  it("shows Domain 1's latest run from the fixture index", async () => {
    renderApp("/")
    const links = await screen.findAllByRole("link", { name: FIXTURE_RUNS.nightly })
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0]).toHaveAttribute("href", `/d1/runs/${FIXTURE_RUNS.nightly}`)
    expect(screen.getByText("pass")).toBeInTheDocument()
    expect(screen.getByText("2026-10-08 13:34:53 UTC")).toBeInTheDocument()
    expect(screen.getAllByText("not started")).toHaveLength(4)
  })

  it("shows an error state when the index cannot be loaded", async () => {
    renderApp("/", { overrides: { "/results/d1/index.json": { status: 500 } } })
    expect(await screen.findByText(/Could not load the runs index/)).toBeInTheDocument()
  })

  it("shows the unsupported-schema state for an index of another major version", async () => {
    renderApp("/", {
      overrides: {
        "/results/d1/index.json": {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/runs-index/v2","latest":null,"runs":[]}',
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText(/This viewer does not read cwa-bench-d1\/runs-index\/v2/),
    ).toBeInTheDocument()
  })
})
