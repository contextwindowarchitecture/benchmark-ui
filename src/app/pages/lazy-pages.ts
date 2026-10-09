// Pages loaded on first visit (DESIGN.md 2.2, 11): the ones that carry the charts and the motion,
// so the dashboard pages never pay for D3 or GSAP. Each resolves to its module's component.

import { lazy } from "react"

export const OverviewPage = lazy(() =>
  import("@/features/d1/components/overview/overview-page").then((module) => ({
    default: module.OverviewPage,
  })),
)
