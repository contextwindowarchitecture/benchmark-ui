// The sponsors and partners (the plan's chrome decisions): who paid for what the benchmark runs on,
// in words. One list drives every placement. The headline sponsors, three at most, show in the
// home page's hero, the sidebar's footer and the site footer; every sponsor and partner has a card
// on the Sponsors page, which opens on the detail of what they fund. An empty list renders none of
// the placements and leaves the Sponsors page its invitation. Words only: a sponsor's role and
// detail are sentences, never a sum. The disclosure's words were reviewed against the benchmark
// repository at CONTENT_SOURCE: the harness, the schemas and the results are public there, at the
// commit the vendor lock pins. The invitation's were reviewed against the sponsorship request on
// the benchmark's main branch, where it links, since the request is kept current there.
//
// Adding a sponsor: two logo files under src/assets/sponsors/ (<slug>-light.png on the paper
// theme, <slug>-dark.png on the dark one, as src/assets/brand/ does; transparent, about 96 px
// tall), an entry below, and its redirect in deploy/base/nginx/sponsors.inc, whose expected text
// src/content/sponsors.test.ts holds.

import yourCompanyDark from "@/assets/sponsors/your-company-dark.png"
import yourCompanyLight from "@/assets/sponsors/your-company-light.png"

import { DOMAIN_1_WRITE_UP, type Citation } from "./source"

/**
 * A headline sponsor shows in the hero, the sidebar and the footer as well as on the Sponsors
 * page; a sponsor and a partner on the Sponsors page only.
 */
export type SponsorTier = "headline" | "sponsor" | "partner"

export type Sponsor = {
  tier: SponsorTier
  name: string
  /** The sponsor's own page, where the site's redirect sends a click. */
  url: string
  /** URL-safe and stable: the path of the redirect, `/go/<slug>`. */
  slug: string
  /** What they gave, in one sentence: compute, model credits, hosting. The card's line. */
  role: string
  /** The detail of the sponsorship, a paragraph each, in the card's dialog. */
  details: readonly string[]
  /** The dialog's link to the sponsor; "Visit <name>" when not given. */
  linkText?: string
  /** The logo on each theme, and the files' pixel size, so the box is laid out before they load. */
  logo: { light: string; dark: string; width: number; height: number }
}

/** The benchmark's sponsorship request, on its main branch, where it is kept current. */
export const SPONSORSHIP_REQUEST =
  "https://github.com/contextwindowarchitecture/benchmark/blob/main/docs/sponsorship-request.md"

/**
 * The sponsors and partners. Until there is one, an open headline slot: it shows readers what a
 * sponsor's credit looks like and links to the benchmark's sponsorship request.
 */
export const SPONSORS: readonly Sponsor[] = [
  {
    tier: "headline",
    name: "Your Company",
    url: SPONSORSHIP_REQUEST,
    slug: "become-a-sponsor",
    role: "An open slot, shown as a sponsor's credit would be: the sponsorship request says what sponsors fund.",
    details: [
      "This is where a sponsor's credit goes. A headline sponsor's logo also sits beside the home page's title, at the foot of the sidebar and in the site's footer; every other sponsor and partner is credited on this page, with the detail of what they fund.",
      "The benchmark is asking for dedicated GPU time to finish its remaining domains and to run a second model family for the finished ones. The sponsorship request sets out the hardware, the schedule and what a sponsor gets in return.",
    ],
    linkText: "Read the sponsorship request",
    logo: { light: yourCompanyLight, dark: yourCompanyDark, width: 456, height: 96 },
  },
]

/** At most this many headline sponsors: the hero, the sidebar and the footer hold no more. */
export const HEADLINE_LIMIT = 3

/** Each tier's words, as a card and its dialog label a sponsor. */
export const TIER_WORDS: Record<SponsorTier, string> = {
  headline: "Headline sponsor",
  sponsor: "Sponsor",
  partner: "Partner",
}

/** Each tier's heading on the Sponsors page. */
export const TIER_HEADINGS: Record<SponsorTier, string> = {
  headline: "Headline sponsors",
  sponsor: "Sponsors",
  partner: "Partners",
}

/** The Sponsors page's words: its lede, its empty state and its invitation. */
export const SPONSORS_PAGE = {
  description: "Who pays for what the benchmark runs on, and what each of them funds.",
  empty: "There are no sponsors yet.",
  become: [
    "The benchmark needs dedicated GPU time to finish its remaining domains. The sponsorship request sets out what it asks for and what a sponsor gets in return.",
  ],
  becomeLink: "Read the sponsorship request",
} as const

/**
 * The disclosure under the sponsors: they do not influence the harness, the schemas or the
 * results, which are public at the pinned benchmark commit.
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

/** The tiers in the order the Sponsors page and the redirects list them. */
export const TIERS: readonly SponsorTier[] = ["headline", "sponsor", "partner"]

/** The sponsors as the Sponsors page lists them: by tier, alphabetical within a tier. */
export function orderedSponsors(sponsors: readonly Sponsor[]): Sponsor[] {
  return [...sponsors].sort(
    (a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.name.localeCompare(b.name, "en"),
  )
}

/**
 * The headline sponsors, alphabetical and three at most: the hero's, the sidebar's and the
 * footer's. The content test refuses a list with more; the cap keeps the chrome's room if one
 * slips through.
 */
export function headlineSponsors(sponsors: readonly Sponsor[]): Sponsor[] {
  return orderedSponsors(sponsors)
    .filter((sponsor) => sponsor.tier === "headline")
    .slice(0, HEADLINE_LIMIT)
}
