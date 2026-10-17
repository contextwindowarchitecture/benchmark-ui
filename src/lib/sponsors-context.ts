import { createContext, useContext } from "react"

import { SPONSORS, type Sponsor } from "@/content"

/** The sponsors the placements read: the content file's list, or the one a test supplies. */
export const SponsorsContext = createContext<readonly Sponsor[]>(SPONSORS)

export function useSponsors(): readonly Sponsor[] {
  return useContext(SponsorsContext)
}
