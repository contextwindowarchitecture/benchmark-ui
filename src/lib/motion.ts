// The one place GSAP is set up (DESIGN.md 2.2, 3.3): the plugin registered once, and the hook
// re-exported so every animated module imports from here. Only the modules that need motion (the
// pipeline walk, the curve's reveal, later the shedding viewer) import this file, and the routes
// that carry them are loaded lazily, so GSAP stays out of the routes that do not need it.

import { useGSAP } from "@gsap/react"
import gsap from "gsap"

gsap.registerPlugin(useGSAP)

/** The motion tokens of DESIGN.md 3.2, in seconds for GSAP. */
export const MOTION = {
  fast: 0.12,
  standard: 0.18,
  emphasis: 0.28,
} as const

export { gsap, useGSAP }
