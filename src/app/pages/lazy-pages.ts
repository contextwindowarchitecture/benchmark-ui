// Pages loaded on first visit (DESIGN.md 2.2, 11): the ones that carry the charts and the motion,
// so the dashboard pages never pay for D3 or GSAP. Each resolves to its module's component.

import { lazy } from "react"

export const D2OverviewPage = lazy(() =>
  import("@/features/d2/components/overview/overview-page").then((module) => ({
    default: module.D2OverviewPage,
  })),
)

export const OverviewPage = lazy(() =>
  import("@/features/d1/components/overview/overview-page").then((module) => ({
    default: module.OverviewPage,
  })),
)

export const ViewerPage = lazy(() =>
  import("@/features/d1/components/sweeps/viewer-page").then((module) => ({
    default: module.ViewerPage,
  })),
)

export const PerfPage = lazy(() =>
  import("@/features/d1/components/perf/perf-page").then((module) => ({
    default: module.PerfPage,
  })),
)

export const D2TrackingPage = lazy(() =>
  import("@/features/d2/components/questions/tracking-page").then((module) => ({
    default: module.TrackingPage,
  })),
)

export const D2InstructionsPage = lazy(() =>
  import("@/features/d2/components/questions/instructions-page").then((module) => ({
    default: module.InstructionsPage,
  })),
)
