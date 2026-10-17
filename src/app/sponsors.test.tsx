// The sponsor placements over a fixture list (a partner listed before a presenting sponsor), and
// over an empty list.

import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CONTENT_SOURCE } from "@/content"
import { renderApp } from "@/test/render-app"
import {
  PLACEHOLDER_PARTNER,
  PLACEHOLDER_PRESENTING,
  SPONSORS_FIXTURE,
} from "@/test/sponsors-fixture"

/** A sponsor's link: through the site's redirect, named, no referrer, an image per theme. */
function expectSponsorLink(link: HTMLElement, sponsor: typeof PLACEHOLDER_PRESENTING) {
  expect(link).toHaveAttribute("href", `/go/${sponsor.slug}`)
  expect(link).toHaveAttribute("rel", "noreferrer")
  expect(link).toHaveAttribute("aria-label", sponsor.name)
  const images = within(link).getAllByRole("img", { name: sponsor.name })
  expect(images.map((image) => image.getAttribute("src"))).toEqual([
    sponsor.logo.light,
    sponsor.logo.dark,
  ])
  expect(images[0]).toHaveClass("dark:hidden")
  expect(images[1]).toHaveClass("dark:block")
}

describe("the sponsor placements", () => {
  it("put the presenting sponsor in the hero under Supported by, and not the partner", async () => {
    renderApp("/", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    const hero = document.querySelector('[data-sponsors="hero"]') as HTMLElement
    expect(hero.closest("header")).toContainElement(screen.getByRole("heading", { level: 1 }))
    const list = within(hero).getByRole("list", { name: "Supported by" })
    const links = within(list).getAllByRole("link")
    expect(links).toHaveLength(1)
    expectSponsorLink(links[0]!, PLACEHOLDER_PRESENTING)
  })

  it("line every sponsor up in the footer, presenting first, with a link to the About section", async () => {
    renderApp("/", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    const row = screen.getByRole("list", { name: "Sponsors" })
    const links = within(row).getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/go/placeholder-compute",
      "/go/placeholder-models",
    ])
    expectSponsorLink(links[1]!, PLACEHOLDER_PARTNER)
    const nav = screen.getByRole("navigation", { name: "Footer" })
    expect(within(nav).getByRole("link", { name: "Sponsors" })).toHaveAttribute(
      "href",
      "/about#sponsors",
    )
    expect(row.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("name each sponsor, its tier and its role on About, then the disclosure", async () => {
    renderApp("/about", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "About" })
    const section = screen.getByRole("region", { name: "Sponsors and partners" })
    expect(section).toHaveAttribute("id", "sponsors")
    const items = within(section).getAllByRole("listitem")
    expect(items.map((item) => item.getAttribute("data-sponsor"))).toEqual([
      "placeholder-compute",
      "placeholder-models",
    ])
    expect(items[0]).toHaveTextContent("Placeholder Compute")
    expect(items[0]).toHaveTextContent("Presenting sponsor")
    expect(items[0]).toHaveTextContent(PLACEHOLDER_PRESENTING.role)
    expect(items[1]).toHaveTextContent("Partner")
    expect(items[1]).toHaveTextContent(PLACEHOLDER_PARTNER.role)
    expectSponsorLink(within(items[1]!).getByRole("link"), PLACEHOLDER_PARTNER)
    expect(section).toHaveTextContent(
      "They do not influence the harness, the schemas or the results.",
    )
    expect(
      within(section).getByRole("link", { name: /The repository at that commit/ }),
    ).toHaveAttribute(
      "href",
      `https://github.com/${CONTENT_SOURCE.repository}/tree/${CONTENT_SOURCE.commit}`,
    )
  })

  it("keep the hero and the sidebar for presenting sponsors: a partner alone is in the footer and About", async () => {
    renderApp("/", {}, { sponsors: [PLACEHOLDER_PARTNER] })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    expect(screen.queryByText("Supported by")).toBeNull()
    expect(document.querySelector('[data-sponsors="hero"]')).toBeNull()
    expect(document.querySelector('[data-sponsors="sidebar"]')).toBeNull()
    const row = screen.getByRole("list", { name: "Sponsors" })
    expect(within(row).getAllByRole("link")).toHaveLength(1)
  })

  it("render nothing for an empty list: no label, no row, no Sponsors link, no About section", async () => {
    renderApp("/", {}, { sponsors: [] })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    expect(screen.queryByText("Supported by")).toBeNull()
    expect(screen.queryByRole("list", { name: "Sponsors" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Sponsors" })).toBeNull()
    expect(document.querySelector('a[href^="/go/"]')).toBeNull()
    // The footer's nav stands alone, as it did, with its three links.
    const nav = screen.getByRole("navigation", { name: "Footer" })
    expect(within(nav).getAllByRole("link")).toHaveLength(3)
    renderApp("/about", {}, { sponsors: [] })
    await screen.findByRole("heading", { level: 1, name: "About" })
    expect(document.getElementById("sponsors")).toBeNull()
    expect(screen.queryByText(/do not influence the harness/)).toBeNull()
  })
})
