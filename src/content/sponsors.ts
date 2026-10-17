// The sponsors and partners (the plan's chrome decisions): who paid for what the benchmark runs on,
// in words. One list drives every placement: the home page's hero, the sidebar's footer, the site
// footer and the About page's section; an empty list renders none of them, so the site is exactly
// as it was until a sponsor is added here. Words only: a sponsor's role is a sentence, never a
// sum. The disclosure's words were reviewed against the benchmark repository at CONTENT_SOURCE:
// the harness, the schemas and the results are public there, at the commit the vendor lock pins.
//
// Adding a sponsor: two logo files under src/assets/sponsors/ (<slug>-light.png on the paper
// theme, <slug>-dark.png on the dark one, as src/assets/brand/ does; transparent, about 96 px
// tall), an entry below, and its redirect in deploy/base/nginx/sponsors.inc, whose expected text
// src/content/sponsors.test.ts holds.

import yourCompanyDark from "@/assets/sponsors/your-company-dark.png"
import yourCompanyLight from "@/assets/sponsors/your-company-light.png"

import { DOMAIN_1_WRITE_UP, type Citation } from "./source"

/**
 * A presenting sponsor shows in the hero and the sidebar as well as the footer and About; a
 * partner in the footer and About only.
 */
export type SponsorTier = "presenting" | "partner"

export type Sponsor = {
  tier: SponsorTier
  name: string
  /** The sponsor's own page, where the site's redirect sends a click. */
  url: string
  /** URL-safe and stable: the path of the redirect, `/go/<slug>`. */
  slug: string
  /** What they gave, in one sentence: compute, model credits, hosting. */
  role: string
  /** The logo on each theme, and the files' pixel size, so the box is laid out before they load. */
  logo: { light: string; dark: string; width: number; height: number }
}

/**
 * The sponsors and partners. Until there is one, an open presenting slot: it shows readers what a
 * sponsor's credit looks like and links to the benchmark's sponsorship request.
 */
export const SPONSORS: readonly Sponsor[] = [
  {
    tier: "presenting",
    name: "Your Company",
    url: "https://github.com/contextwindowarchitecture/benchmark/blob/main/docs/sponsorship-request.md",
    slug: "become-a-sponsor",
    role: "An open slot, shown as a sponsor's credit would be: the sponsorship request says what sponsors fund.",
    logo: { light: yourCompanyLight, dark: yourCompanyDark, width: 456, height: 96 },
  },
]

/** At most this many presenting sponsors show in the sidebar's footer. */
export const SIDEBAR_SPONSORS = 2

/** Each tier's words, as the About page labels a sponsor. */
export const TIER_WORDS: Record<SponsorTier, string> = {
  presenting: "Presenting sponsor",
  partner: "Partner",
}

/**
 * The disclosure under the sponsors on the About page: they do not influence the harness, the
 * schemas or the results, which are public at the pinned benchmark commit.
 */
export const SPONSORS_DISCLOSURE: readonly string[] = [
  "Sponsors and partners pay for what the benchmark runs on: compute, model credits and hosting.",
  "They do not influence the harness, the schemas or the results. All three are public in the benchmark repository at the commit this site is pinned to, and every number on this site is read from a run that harness wrote.",
]

/** Where the disclosure's claim was checked: the write-up's account of reproducing the runs. */
export const SPONSORS_CITATION: Citation = { file: DOMAIN_1_WRITE_UP, section: "Reproducing it" }

/** The `utm_source` the redirect adds to a sponsor's URL, so a sponsor can tell these clicks apart. */
export const UTM_SOURCE = "benchmark.contextwindowarchitecture.io"

/** The path a sponsor's logo links to: the server redirects it and counts it in its access log. */
export function sponsorPath(sponsor: Pick<Sponsor, "slug">): string {
  return `/go/${sponsor.slug}`
}

/** Where the redirect sends a click: the sponsor's URL with `utm_source` added. */
export function sponsorRedirect(sponsor: Pick<Sponsor, "url">): string {
  const url = new URL(sponsor.url)
  url.searchParams.set("utm_source", UTM_SOURCE)
  return url.href
}

const TIER_ORDER: Record<SponsorTier, number> = { presenting: 0, partner: 1 }

/** The sponsors as the footer and About list them: presenting first, alphabetical within a tier. */
export function orderedSponsors(sponsors: readonly Sponsor[]): Sponsor[] {
  return [...sponsors].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.name.localeCompare(b.name, "en"),
  )
}

/** The presenting sponsors, alphabetical: the hero's and the sidebar's. */
export function presentingSponsors(sponsors: readonly Sponsor[]): Sponsor[] {
  return orderedSponsors(sponsors).filter((sponsor) => sponsor.tier === "presenting")
}
