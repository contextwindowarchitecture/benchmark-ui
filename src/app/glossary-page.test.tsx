import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { GLOSSARY } from "@/content"
import { renderApp } from "@/test/render-app"

describe("glossary page", () => {
  it("defines every term in two groups, each with its anchor, its links and its source", async () => {
    renderApp("/glossary")
    expect(await screen.findByRole("heading", { level: 1, name: "Glossary" })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe("Glossary · CWA benchmark"))
    expect(screen.getByText(`${GLOSSARY.length} terms`)).toBeInTheDocument()
    expect(document.querySelectorAll("dt")).toHaveLength(GLOSSARY.length)

    const architecture = screen.getByRole("region", { name: "The architecture" })
    const benchmark = screen.getByRole("region", { name: "The benchmark" })
    expect(architecture).toContainElement(document.getElementById("slot"))
    for (const id of ["oracle", "metamorphic-relation", "generative-fuzzing", "golden"]) {
      expect(benchmark).toContainElement(document.getElementById(id))
    }

    const oracle = document.getElementById("oracle") as HTMLElement
    expect(oracle.tagName).toBe("DT")
    const definition = within(oracle.nextElementSibling as HTMLElement)
    expect(definition.getByText(/trusts no single oracle/)).toBeInTheDocument()
    expect(definition.getByRole("link", { name: "Trace auditor" })).toHaveAttribute(
      "href",
      "/glossary#trace-auditor",
    )
    expect(definition.getByRole("link", { name: "domain1.md" })).toHaveAttribute(
      "href",
      expect.stringContaining("/docs/domain1.md"),
    )

    const nav = screen
      .getAllByRole("link", { name: "Glossary" })
      .find((link) => link.getAttribute("aria-current") === "page")
    expect(nav).toHaveAttribute("href", "/glossary")
  })

  it("lands on the term a URL's fragment names", async () => {
    renderApp("/glossary#golden")
    await screen.findByRole("heading", { level: 1, name: "Glossary" })
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById("golden")))
  })

  it("filters from the query string, keeps focus in the box while typing, and says when nothing matches", async () => {
    const { router } = renderApp("/glossary?q=fuzz")
    expect(await screen.findByText(/terms match$/)).toBeInTheDocument()
    expect(document.getElementById("generative-fuzzing")).not.toBeNull()
    expect(document.getElementById("slot")).toBeNull()
    // No architecture term mentions fuzzing, so its group is not drawn at all.
    expect(screen.queryByRole("region", { name: "The architecture" })).toBeNull()

    const box = screen.getByRole("searchbox", { name: "Search the glossary" })
    await userEvent.clear(box)
    await userEvent.type(box, "zzzz")
    await waitFor(() => expect(router.state.location.search).toBe("?q=zzzz"))
    // A filter is not a navigation: focus stays where the reader is typing.
    expect(document.activeElement).toBe(box)
    expect(screen.getByText(/No term matches/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Show every term" }))
    await waitFor(() => expect(router.state.location.search).toBe(""))
    expect(document.querySelectorAll("dt")).toHaveLength(GLOSSARY.length)
  })
})
