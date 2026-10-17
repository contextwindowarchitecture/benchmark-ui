// @vitest-environment node
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  orderedSponsors,
  presentingSponsors,
  SPONSORS,
  SPONSORS_CITATION,
  SPONSORS_DISCLOSURE,
  sponsorPath,
  sponsorRedirect,
  TIER_WORDS,
  UTM_SOURCE,
  type Sponsor,
} from "./index"
import {
  PLACEHOLDER_PARTNER,
  PLACEHOLDER_PRESENTING,
  SPONSORS_FIXTURE,
} from "@/test/sponsors-fixture"

const root = resolve(import.meta.dirname, "../..")

/** A names-only pattern: a domain's number is a name, any other digit a value. */
const identifiers = /\bDomains? \d+(?: and \d+)?\b/g

describe("the sponsors", () => {
  it.each<[string, readonly Sponsor[]]>([
    ["the content file's list", SPONSORS],
    ["the fixture", SPONSORS_FIXTURE],
  ])(
    "hold a URL-safe slug, an https URL, a role in one sentence and a logo per theme, in %s",
    async (_name, sponsors) => {
      expect(new Set(sponsors.map((sponsor) => sponsor.slug)).size).toBe(sponsors.length)
      expect(new Set(sponsors.map((sponsor) => sponsor.name)).size).toBe(sponsors.length)
      for (const sponsor of sponsors) {
        expect(sponsor.slug).toMatch(/^[a-z][a-z0-9-]*$/)
        expect(sponsor.url).toMatch(/^https:\/\/\S+$/)
        expect(sponsor.name.trim()).toBe(sponsor.name)
        expect(sponsor.role.endsWith("."), sponsor.role).toBe(true)
        expect(sponsor.role.replace(identifiers, ""), sponsor.role).not.toMatch(/\d/)
        expect(Object.keys(TIER_WORDS)).toContain(sponsor.tier)
        // Two files under src/assets/sponsors/, one per theme, each with the size recorded.
        expect(sponsor.logo.light).not.toBe(sponsor.logo.dark)
        for (const [theme, url] of Object.entries({
          light: sponsor.logo.light,
          dark: sponsor.logo.dark,
        })) {
          expect(url, `${sponsor.slug}'s ${theme} logo`).toMatch(
            new RegExp(`/src/assets/sponsors/[a-z0-9-]+-${theme}\\.png$`),
          )
          const file = resolve(root, url.replace(/^\//, ""))
          await expect(readFile(file)).resolves.toBeInstanceOf(Buffer)
        }
        expect(sponsor.logo.width).toBeGreaterThan(0)
        expect(sponsor.logo.height).toBeGreaterThan(0)
      }
    },
  )

  it("ship a fixture of one presenting sponsor and one partner, out of the app's own graph", () => {
    expect(SPONSORS_FIXTURE.map((sponsor) => sponsor.tier)).toEqual(["partner", "presenting"])
    expect(PLACEHOLDER_PRESENTING.name).toMatch(/^Placeholder /)
    expect(PLACEHOLDER_PARTNER.name).toMatch(/^Placeholder /)
  })

  it("order presenting first, then alphabetical, without touching the list; the hero takes the presenting", () => {
    expect(orderedSponsors(SPONSORS_FIXTURE).map((sponsor) => sponsor.slug)).toEqual([
      "placeholder-compute",
      "placeholder-models",
    ])
    expect(SPONSORS_FIXTURE[0]).toBe(PLACEHOLDER_PARTNER)
    expect(presentingSponsors(SPONSORS_FIXTURE)).toEqual([PLACEHOLDER_PRESENTING])
    expect(presentingSponsors([])).toEqual([])
    const b = { ...PLACEHOLDER_PRESENTING, slug: "b", name: "Beta" }
    const a = { ...PLACEHOLDER_PRESENTING, slug: "a", name: "alpha" }
    const z = { ...PLACEHOLDER_PARTNER, slug: "z", name: "Aardvark" }
    expect(orderedSponsors([z, b, a]).map((sponsor) => sponsor.slug)).toEqual(["a", "b", "z"])
  })

  it("link through the site's redirect, which adds utm_source to the sponsor's own URL", () => {
    expect(sponsorPath(PLACEHOLDER_PRESENTING)).toBe("/go/placeholder-compute")
    expect(UTM_SOURCE).toBe("benchmark.contextwindowarchitecture.io")
    expect(sponsorRedirect(PLACEHOLDER_PRESENTING)).toBe(
      `https://example.com/compute?utm_source=${UTM_SOURCE}`,
    )
    // A URL that has a query keeps it; one with a fragment keeps that after the query.
    expect(sponsorRedirect(PLACEHOLDER_PARTNER)).toBe(
      `https://example.com/models?ref=cwa&utm_source=${UTM_SOURCE}`,
    )
    expect(sponsorRedirect({ url: "https://example.com/a#team" })).toBe(
      `https://example.com/a?utm_source=${UTM_SOURCE}#team`,
    )
  })

  it("cite a vendored file for the disclosure, whose words hold no value", async () => {
    const cited = await readFile(resolve(root, "vendor/cwa-bench", SPONSORS_CITATION.file), "utf8")
    expect(cited).toContain(`## ${SPONSORS_CITATION.section}`)
    expect(SPONSORS_DISCLOSURE.length).toBeGreaterThan(0)
    for (const sentence of SPONSORS_DISCLOSURE) {
      expect(sentence.endsWith("."), sentence).toBe(true)
      expect(sentence).not.toMatch(/\d/)
    }
    expect(SPONSORS_DISCLOSURE.join(" ")).toMatch(
      /do not influence the harness, the schemas or the results/,
    )
  })
})
