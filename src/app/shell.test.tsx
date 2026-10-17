import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildInfo } from "@/lib/build-info"
import { D2_FIXTURE_RUNS, FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"
import { SPONSORS_FIXTURE } from "@/test/sponsors-fixture"

describe("the shell", () => {
  it("opens a page with its sidebar group as the kicker", async () => {
    renderApp("/d1/runs")
    const runs = await screen.findByRole("heading", { level: 1, name: "Runs" })
    expect(runs.previousElementSibling).toHaveTextContent("Domain 1 · Assembly")
  })

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

  it("tells visitors the site is still being built, until they dismiss it for the session", async () => {
    renderApp("/")
    const notice = screen.getByRole("region", { name: "Site notice" })
    expect(notice).toHaveTextContent("This site is still being built.")
    await userEvent.click(within(notice).getByRole("button", { name: "Dismiss notice" }))
    expect(screen.queryByRole("region", { name: "Site notice" })).not.toBeInTheDocument()
    renderApp("/about")
    expect(screen.queryByRole("region", { name: "Site notice" })).not.toBeInTheDocument()
  })

  it("links back to the project's site from the sidebar and the footer", () => {
    renderApp("/")
    const links = screen.getAllByRole("link", { name: /contextwindowarchitecture\.io/ })
    expect(links).toHaveLength(2)
    for (const link of links)
      expect(link).toHaveAttribute("href", "https://contextwindowarchitecture.io")
    const footer = screen.getByRole("navigation", { name: "Footer" }).closest("footer")
    expect(footer).toHaveTextContent(`ui ${buildInfo.uiCommit}`)
  })

  it("shows the headline sponsor above the sidebar's logo, hidden with it when the sidebar is icons", async () => {
    renderApp("/", {}, { sponsors: SPONSORS_FIXTURE })
    const sidebar = document.querySelector('[data-slot="sidebar"][data-state]') as HTMLElement
    expect(sidebar).toHaveAttribute("data-state", "expanded")
    const block = sidebar.querySelector('[data-sponsors="sidebar"]') as HTMLElement
    expect(block).toHaveTextContent("Supported by")
    const links = within(block).getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", "/go/placeholder-compute")
    expect(links[0]).toHaveAttribute("aria-label", "Placeholder Compute")
    // The partner stays out of the sidebar, and the block sits above the logo's link.
    expect(within(sidebar).queryByRole("link", { name: "Placeholder Models" })).toBeNull()
    const logo = within(sidebar).getByRole("link", { name: /contextwindowarchitecture\.io/ })
    expect(block.compareDocumentPosition(logo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Collapsed to icons, the block hides the way the logo does: the same class, off the same state.
    expect(block).toHaveClass("group-data-[collapsible=icon]:hidden")
    expect(logo.querySelector(".group-data-\\[collapsible\\=icon\\]\\:hidden")).not.toBeNull()
    await userEvent.click(screen.getAllByRole("button", { name: "Toggle Sidebar" })[0]!)
    expect(sidebar).toHaveAttribute("data-state", "collapsed")
    expect(sidebar).toHaveAttribute("data-collapsible", "icon")
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

  it("renders a lazy run page in the shell with the run in its title", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}/perf`)
    expect(await screen.findByRole("heading", { name: "Performance" })).toBeInTheDocument()
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument()
    await waitFor(() =>
      expect(document.title).toBe(`Performance · ${FIXTURE_RUNS.nightly} · CWA benchmark`),
    )
  })

  it("keeps the route focus on the title when a lazy page replaces its fallback", async () => {
    const { router } = renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}`)
    await screen.findByRole("heading", { level: 1, name: FIXTURE_RUNS.nightly })
    await act(() => router.navigate(`/d1/runs/${FIXTURE_RUNS.s7}/perf`))
    await screen.findByRole("region", { name: "Startup table" })
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 1, name: "Performance" }),
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

  it("moves focus to the new page's title on navigation, but not when a filter changes the query", async () => {
    const { router } = renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}`)
    const box = await screen.findByRole("searchbox", { name: "Search metrics" })
    await userEvent.type(box, "s1")
    await waitFor(() => expect(router.state.location.search).toBe("?q=s1"))
    expect(document.activeElement).toBe(box)

    await router.navigate("/about")
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById("page-title")))
  })

  describe("with a fragment in the URL", () => {
    const scrolled = vi.fn<(this: Element) => void>()
    afterEach(() => {
      scrolled.mockReset()
      // jsdom has no scrolling; the stub stands in for the browser's.
      delete (Element.prototype as Partial<Element>).scrollIntoView
    })

    it("lands on the element the fragment names, on the first render too", async () => {
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.call(this)
      }
      renderApp("/about#viewer")
      await screen.findByRole("heading", { level: 1, name: "About" })
      await waitFor(() =>
        expect(scrolled.mock.contexts).toContain(document.getElementById("viewer")),
      )
    })

    it("lands on a section that renders once its data has loaded", async () => {
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.call(this)
      }
      renderApp(`/d2/runs/${D2_FIXTURE_RUNS.nightly}/suites/S5#cost`)
      await waitFor(() => expect(document.getElementById("cost")).not.toBeNull())
      await waitFor(() => expect(scrolled.mock.contexts).toContain(document.getElementById("cost")))
    })
  })
})
