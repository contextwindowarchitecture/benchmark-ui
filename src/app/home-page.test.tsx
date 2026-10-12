import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CONTENT_SOURCE } from "@/content"
import { D2_FIXTURE_RUNS, FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

describe("home page", () => {
  it("says what CWA is, draws the model from the latest run's contract, and lists the five domains", async () => {
    renderApp("/")
    expect(
      await screen.findByText(/The Context Window Architecture is an open specification/),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("figure", { name: /The model: four planes, eleven slots/ }),
    ).toBeInTheDocument()

    const d1 = await waitFor(() => {
      const node = document.querySelector('[data-domain="d1"]')
      expect(node).not.toBeNull()
      return node as HTMLElement
    })
    const nightly = within(d1).getByRole("link", { name: FIXTURE_RUNS.nightly })
    expect(nightly).toHaveAttribute("href", `/d1/runs/${FIXTURE_RUNS.nightly}`)
    expect(within(d1).getByRole("link", { name: FIXTURE_RUNS.s7 })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.s7}`,
    )
    expect(within(d1).getAllByText("pass")).toHaveLength(2)
    expect(within(d1).getByText("2026-10-08 13:34:53 UTC")).toBeInTheDocument()
    await waitFor(() => expect(within(d1).getByText("11 of 11 suites pass")).toBeInTheDocument())
    expect(within(d1).getByText("1 of 1 suites pass")).toBeInTheDocument()
    expect(within(d1).getByRole("link", { name: /The overview/ })).toHaveAttribute("href", "/d1")

    const d2 = document.querySelector('[data-domain="d2"]') as HTMLElement
    expect(await within(d2).findByRole("link", { name: D2_FIXTURE_RUNS.nightly })).toHaveAttribute(
      "href",
      `/d2/runs/${D2_FIXTURE_RUNS.nightly}`,
    )
    await waitFor(() => expect(within(d2).getByText("8 of 8 suites pass")).toBeInTheDocument())
    expect(within(d2).getByRole("link", { name: /The overview/ })).toHaveAttribute("href", "/d2")

    expect(screen.getAllByText("not started")).toHaveLength(3)
    expect(screen.getByRole("link", { name: /Domain 5 · Instruction hierarchy/ })).toHaveAttribute(
      "href",
      "/d5",
    )
    expect(screen.getByText(/No single check is trusted alone/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "The glossary of terms" })).toHaveAttribute(
      "href",
      "/glossary",
    )
    expect(screen.getByRole("link", { name: "The Domain 1 write-up" })).toHaveAttribute(
      "href",
      expect.stringContaining(`/blob/${CONTENT_SOURCE.commit}/docs/domain1.md`),
    )
    expect(screen.getByRole("link", { name: "The Domain 2 write-up" })).toHaveAttribute(
      "href",
      expect.stringContaining("/docs/domain2.md"),
    )
  })

  it("shows an error state when the index cannot be loaded", async () => {
    renderApp("/", { overrides: { "/results/d1/index.json": { status: 500 } } })
    expect(await screen.findByText(/Could not load the runs index/)).toBeInTheDocument()
    // The words still read without a run.
    expect(
      screen.getByText(/The Context Window Architecture is an open specification/),
    ).toBeInTheDocument()
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

  it("says there is no run yet when the index lists none finished", async () => {
    renderApp("/", {
      overrides: {
        "/results/d1/index.json": {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/runs-index/v1","latest":null,"runs":[]}',
          contentType: "application/json",
        },
      },
    })
    expect(await screen.findByText(/No finished run yet\./)).toBeInTheDocument()
    expect(screen.getByText(/there is no finished run yet/)).toBeInTheDocument()
  })

  it("draws the model from the newest run the volume holds when the latest is gone", async () => {
    renderApp("/", {
      overrides: { [`/results/d1/${FIXTURE_RUNS.nightly}/contract.json`]: { status: 404 } },
    })
    expect(
      await screen.findByRole("figure", { name: /The model: four planes, eleven slots/ }),
    ).toBeInTheDocument()
    const note = document.querySelector('[data-state="read-past"]') as HTMLElement
    expect(note).toHaveTextContent(
      `The latest run, ${FIXTURE_RUNS.nightly}, is not on the server; the diagram draws from the contract of ${FIXTURE_RUNS.s7}.`,
    )
    expect(screen.queryByText(/the contract is not on the server/)).toBeNull()
  })

  it("shows a contract it cannot read as it is, without reading past it", async () => {
    renderApp("/", {
      overrides: {
        [`/results/d1/${FIXTURE_RUNS.nightly}/contract.json`]: {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/contract/v9"}',
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText("This viewer does not read cwa-bench-d1/contract/v9"),
    ).toBeInTheDocument()
    expect(document.querySelector('[data-state="read-past"]')).toBeNull()
  })
})
