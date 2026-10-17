// A sponsors list for the placement tests and for previewing the slots: one presenting sponsor and
// one partner, plainly named placeholders. The logos are in src/assets/sponsors/ beside where a
// real sponsor's go; nothing in the app imports this file, so the production build carries none
// of it.

import placeholderComputeDark from "@/assets/sponsors/placeholder-compute-dark.png"
import placeholderComputeLight from "@/assets/sponsors/placeholder-compute-light.png"
import placeholderModelsDark from "@/assets/sponsors/placeholder-models-dark.png"
import placeholderModelsLight from "@/assets/sponsors/placeholder-models-light.png"
import type { Sponsor } from "@/content"

export const PLACEHOLDER_PRESENTING: Sponsor = {
  tier: "presenting",
  name: "Placeholder Compute",
  url: "https://example.com/compute",
  slug: "placeholder-compute",
  role: "Provides the GPU host the recorded runs are made on.",
  logo: { light: placeholderComputeLight, dark: placeholderComputeDark, width: 537, height: 96 },
}

export const PLACEHOLDER_PARTNER: Sponsor = {
  tier: "partner",
  name: "Placeholder Models",
  url: "https://example.com/models?ref=cwa",
  slug: "placeholder-models",
  role: "Gives the model credits Domains 2 and 5 spend.",
  logo: { light: placeholderModelsLight, dark: placeholderModelsDark, width: 499, height: 96 },
}

/** The partner first, so a test can tell the placements order the list rather than keep it. */
export const SPONSORS_FIXTURE: readonly Sponsor[] = [PLACEHOLDER_PARTNER, PLACEHOLDER_PRESENTING]
