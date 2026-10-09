import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

describe("the shell", () => {
  it("has a skip link, one main, named navigation and the plan's tree", async () => {
    renderApp("/")
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#page")
    expect(screen.getAllByRole("main")).toHaveLength(1)
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    for (const label of [
      "Home",
      "About",
      "Overview",
      "Runs",
      "Coverage",
      "Findings",
      "Performance",
      "Shedding",
      "Compare",
    ]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0)
    }
    expect(screen.getByText("Domain 2 · Long-horizon stability")).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe("CWA benchmark"))
  })

  it("marks the active item and sets the document title with the run id", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}`)
    await waitFor(() =>
      expect(document.title).toBe(`Run · ${FIXTURE_RUNS.nightly} · CWA benchmark`),
    )
    const runs = screen
      .getAllByRole("link", { name: "Runs" })
      .find((link) => link.getAttribute("aria-current") === "page")
    expect(runs).toBeDefined()
    const crumbs = within(screen.getByRole("navigation", { name: /breadcrumb/i }))
    expect(crumbs.getByText(FIXTURE_RUNS.nightly)).toBeInTheDocument()
    expect(crumbs.getByRole("link", { name: "Domain 1" })).toHaveAttribute("href", "/d1")
  })

  it("renders a later phase's route as a placeholder in the shell, not a 404", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}/perf`)
    expect(await screen.findByRole("heading", { name: "Performance" })).toBeInTheDocument()
    expect(screen.getByText(/phase UI-P4/)).toBeInTheDocument()
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument()
    await waitFor(() =>
      expect(document.title).toBe(`Performance · ${FIXTURE_RUNS.nightly} · CWA benchmark`),
    )
  })

  it("renders not-started domains and a 404 for anything else", async () => {
    renderApp("/d3")
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Domain 3 · Agentic context engineering/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText("not started")).toBeInTheDocument()
    renderApp("/nothing/here")
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument()
  })
})
