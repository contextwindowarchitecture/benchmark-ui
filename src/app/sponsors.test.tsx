// The sponsor placements over a fixture list (a partner listed before a sponsor before a headline
// sponsor), the Sponsors page and its dialog, and an empty list.

import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { CONTENT_SOURCE, SPONSORSHIP_REQUEST, type Sponsor } from "@/content"
import { renderApp } from "@/test/render-app"
import {
  PLACEHOLDER_HEADLINE,
  PLACEHOLDER_PARTNER,
  PLACEHOLDER_SPONSOR,
  SPONSORS_FIXTURE,
} from "@/test/sponsors-fixture"

/** A sponsor's link: through the site's redirect, named, no referrer, an image per theme. */
function expectSponsorLink(link: HTMLElement, sponsor: Sponsor) {
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

const headline = (n: number): Sponsor[] =>
  ["Alpha", "Beta", "Delta", "Gamma"].slice(0, n).map((name) => ({
    ...PLACEHOLDER_HEADLINE,
    name,
    slug: name.toLowerCase(),
  }))

describe("the sponsor placements", () => {
  it("put the headline sponsor in the hero under Supported by, and not the others", async () => {
    renderApp("/", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    const hero = document.querySelector('[data-sponsors="hero"]') as HTMLElement
    expect(hero.closest("header")).toContainElement(screen.getByRole("heading", { level: 1 }))
    const list = within(hero).getByRole("list", { name: "Supported by" })
    const links = within(list).getAllByRole("link")
    expect(links).toHaveLength(1)
    expectSponsorLink(links[0]!, PLACEHOLDER_HEADLINE)
  })

  it("line the headline sponsors up in the footer, with a link to the Sponsors page", async () => {
    renderApp("/", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    const row = screen.getByRole("list", { name: "Sponsors" })
    const links = within(row).getAllByRole("link")
    expect(links).toHaveLength(1)
    expectSponsorLink(links[0]!, PLACEHOLDER_HEADLINE)
    const nav = screen.getByRole("navigation", { name: "Footer" })
    expect(within(nav).getByRole("link", { name: "Sponsors" })).toHaveAttribute("href", "/sponsors")
    expect(row.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("keep three headline sponsors at most in the hero, the sidebar and the footer", async () => {
    renderApp("/", {}, { sponsors: headline(4) })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    for (const placement of ["hero", "sidebar", "footer"]) {
      const block = document.querySelector(`[data-sponsors="${placement}"]`) as HTMLElement
      expect(
        within(block)
          .getAllByRole("link")
          .map((link) => link.getAttribute("aria-label")),
        placement,
      ).toEqual(["Alpha", "Beta", "Delta"])
    }
  })

  it("leave the chrome to headline sponsors: a partner alone is on the Sponsors page, linked from the footer", async () => {
    renderApp("/", {}, { sponsors: [PLACEHOLDER_PARTNER] })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    expect(screen.queryByText("Supported by")).toBeNull()
    for (const placement of ["hero", "sidebar", "footer"]) {
      expect(document.querySelector(`[data-sponsors="${placement}"]`), placement).toBeNull()
    }
    const nav = screen.getByRole("navigation", { name: "Footer" })
    expect(within(nav).getByRole("link", { name: "Sponsors" })).toHaveAttribute("href", "/sponsors")
  })

  it("give About the disclosure and a link to the Sponsors page, not the list", async () => {
    renderApp("/about", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "About" })
    const section = screen.getByRole("region", { name: "Sponsors and partners" })
    expect(section).toHaveAttribute("id", "sponsors")
    expect(within(section).queryByRole("listitem")).toBeNull()
    expect(section).toHaveTextContent(
      "They do not influence the harness, the schemas or the results.",
    )
    expect(
      within(section).getByRole("link", { name: /The repository at that commit/ }),
    ).toHaveAttribute(
      "href",
      `https://github.com/${CONTENT_SOURCE.repository}/tree/${CONTENT_SOURCE.commit}`,
    )
    expect(
      within(section).getByRole("link", { name: "Every sponsor and partner, and what each funds" }),
    ).toHaveAttribute("href", "/sponsors")
  })

  it("render nothing in the chrome for an empty list: no label, no row, no Sponsors link, no About section", async () => {
    renderApp("/", {}, { sponsors: [] })
    await screen.findByRole("heading", { level: 1, name: "CWA benchmark" })
    expect(screen.queryByText("Supported by")).toBeNull()
    expect(screen.queryByRole("list", { name: "Sponsors" })).toBeNull()
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

describe("the Sponsors page", () => {
  it("is in the sidebar's Benchmark group and titled", async () => {
    renderApp("/sponsors", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "Sponsors" })
    await waitFor(() => expect(document.title).toBe("Sponsors · CWA benchmark"))
    const sidebar = document.querySelector('[data-slot="sidebar"][data-state]') as HTMLElement
    const item = within(sidebar).getByRole("link", { name: "Sponsors", current: "page" })
    expect(item).toHaveAttribute("href", "/sponsors")
  })

  it("puts every sponsor in a card, a section per tier in order, each card its tier, name and role", async () => {
    renderApp("/sponsors", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "Sponsors" })
    const sections = ["Headline sponsors", "Sponsors", "Partners"].map((name) =>
      screen.getByRole("region", { name }),
    )
    for (const [section, sponsor] of [
      [sections[0]!, PLACEHOLDER_HEADLINE],
      [sections[1]!, PLACEHOLDER_SPONSOR],
      [sections[2]!, PLACEHOLDER_PARTNER],
    ] as const) {
      const card = within(section).getByRole("button", { name: sponsor.name })
      expect(card).toHaveAttribute("aria-haspopup", "dialog")
      expect(card).toHaveAccessibleDescription(sponsor.role)
      // The logo is in its own colours here, one image per theme, decorative beside the name.
      const logo = card.querySelector(`[data-sponsor-logo="${sponsor.slug}"]`) as HTMLElement
      expect([...logo.querySelectorAll("img")].map((image) => image.getAttribute("src"))).toEqual([
        sponsor.logo.light,
        sponsor.logo.dark,
      ])
    }
    expect(within(sections[0]!).getByRole("button")).toHaveTextContent("Headline sponsor")
    expect(within(sections[2]!).getByRole("button")).toHaveTextContent("Partner")
    expect(
      sections[0]!.compareDocumentPosition(sections[2]!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByRole("region", { name: "What sponsors do not do" })).toHaveTextContent(
      "They do not influence the harness, the schemas or the results.",
    )
  })

  it("opens a card's dialog on the detail and the link, and gives the focus back on Escape", async () => {
    const user = userEvent.setup()
    renderApp("/sponsors", {}, { sponsors: SPONSORS_FIXTURE })
    await screen.findByRole("heading", { level: 1, name: "Sponsors" })
    const card = screen.getByRole("button", { name: PLACEHOLDER_HEADLINE.name })
    await user.click(card)
    const dialog = await screen.findByRole("dialog", { name: PLACEHOLDER_HEADLINE.name })
    expect(dialog).toHaveAccessibleDescription(PLACEHOLDER_HEADLINE.role)
    expect(dialog).toHaveTextContent("Headline sponsor")
    for (const paragraph of PLACEHOLDER_HEADLINE.details)
      expect(dialog).toHaveTextContent(paragraph)
    const link = within(dialog).getByRole("link", { name: "Visit Placeholder Compute" })
    expect(link).toHaveAttribute("href", "/go/placeholder-compute")
    expect(link).toHaveAttribute("rel", "noreferrer")
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(card).toHaveFocus()
    // A sponsor's own words for the link replace "Visit".
    await user.click(screen.getByRole("button", { name: PLACEHOLDER_SPONSOR.name }))
    const other = await screen.findByRole("dialog", { name: PLACEHOLDER_SPONSOR.name })
    expect(within(other).getByRole("link", { name: "Read about the hosting" })).toHaveAttribute(
      "href",
      "/go/placeholder-hosting",
    )
    await user.click(within(other).getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("invites a sponsor, and with none says so instead of the tiers and the disclosure", async () => {
    renderApp("/sponsors", {}, { sponsors: [] })
    await screen.findByRole("heading", { level: 1, name: "Sponsors" })
    expect(screen.getByText("There are no sponsors yet.")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Headline sponsors" })).toBeNull()
    expect(screen.queryByRole("region", { name: "What sponsors do not do" })).toBeNull()
    const become = screen.getByRole("region", { name: "Become a sponsor" })
    expect(
      within(become).getByRole("link", { name: /Read the sponsorship request/ }),
    ).toHaveAttribute("href", SPONSORSHIP_REQUEST)
  })
})
