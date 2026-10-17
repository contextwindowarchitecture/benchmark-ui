// A sponsors list for the placement tests and for previewing the slots: a headline sponsor, a
// sponsor and a partner, plainly named placeholders. The logos are in src/assets/sponsors/ beside
// where a real sponsor's go; nothing in the app imports this file, so the production build carries
// none of it.

import placeholderComputeDark from "@/assets/sponsors/placeholder-compute-dark.png"
import placeholderComputeLight from "@/assets/sponsors/placeholder-compute-light.png"
import placeholderModelsDark from "@/assets/sponsors/placeholder-models-dark.png"
import placeholderModelsLight from "@/assets/sponsors/placeholder-models-light.png"
import type { Sponsor } from "@/content"

export const PLACEHOLDER_HEADLINE: Sponsor = {
  tier: "headline",
  name: "Placeholder Compute",
  url: "https://example.com/compute",
  slug: "placeholder-compute",
  role: "Provides the GPU host the recorded runs are made on.",
  details: [
    "A dedicated host for the recorded runs of Domains 2 and 5.",
    "Its engineers can replay any run from the committed caches.",
  ],
  logo: { light: placeholderComputeLight, dark: placeholderComputeDark, width: 537, height: 96 },
}

export const PLACEHOLDER_SPONSOR: Sponsor = {
  tier: "sponsor",
  name: "Placeholder Hosting",
  url: "https://example.com/hosting",
  slug: "placeholder-hosting",
  role: "Hosts this results site and the results volume it reads.",
  details: ["The cluster the site and its runs are served from."],
  linkText: "Read about the hosting",
  logo: { light: placeholderModelsLight, dark: placeholderModelsDark, width: 499, height: 96 },
}

export const PLACEHOLDER_PARTNER: Sponsor = {
  tier: "partner",
  name: "Placeholder Models",
  url: "https://example.com/models?ref=cwa",
  slug: "placeholder-models",
  role: "Gives the model credits Domains 2 and 5 spend.",
  details: ["Credits for the second model family of Domains 2 and 5."],
  logo: { light: placeholderModelsLight, dark: placeholderModelsDark, width: 499, height: 96 },
}

/** The partner first, so a test can tell the placements order the list rather than keep it. */
export const SPONSORS_FIXTURE: readonly Sponsor[] = [
  PLACEHOLDER_PARTNER,
  PLACEHOLDER_SPONSOR,
  PLACEHOLDER_HEADLINE,
]
