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

export const D2LongContextPage = lazy(() =>
  import("@/features/d2/components/questions/long-context-page").then((module) => ({
    default: module.LongContextPage,
  })),
)

export const D2CostPage = lazy(() =>
  import("@/features/d2/components/questions/cost-page").then((module) => ({
    default: module.CostPage,
  })),
)

export const D5OverviewPage = lazy(() =>
  import("@/features/d5/components/overview/overview-page").then((module) => ({
    default: module.D5OverviewPage,
  })),
)

export const D5StructurePage = lazy(() =>
  import("@/features/d5/components/questions/pages").then((module) => ({
    default: module.StructurePage,
  })),
)

export const D5AttacksPage = lazy(() =>
  import("@/features/d5/components/questions/pages").then((module) => ({
    default: module.AttacksPage,
  })),
)

export const D5UtilityPage = lazy(() =>
  import("@/features/d5/components/questions/pages").then((module) => ({
    default: module.UtilityPage,
  })),
)

export const D5AdaptivePage = lazy(() =>
  import("@/features/d5/components/questions/pages").then((module) => ({
    default: module.AdaptivePage,
  })),
)

export const D5ExternalPage = lazy(() =>
  import("@/features/d5/components/questions/pages").then((module) => ({
    default: module.ExternalPage,
  })),
)

export const D5PastedPage = lazy(() =>
  import("@/features/d5/components/questions/pages").then((module) => ({
    default: module.PastedPage,
  })),
)

export const D5PersistencePage = lazy(() =>
  import("@/features/d5/components/questions/pages").then((module) => ({
    default: module.PersistencePage,
  })),
)
