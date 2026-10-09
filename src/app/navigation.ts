// The navigation tree (ui-plan.md 6.1; DESIGN.md 4.3): typed, with stable ids, and the routes
// that make an item active. The sidebar renders it; nothing else knows the tree.

import {
  Activity,
  BookOpen,
  Boxes,
  GitCompare,
  House,
  Layers,
  ListChecks,
  Search,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"
import { matchPath } from "react-router"

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  /** The route, given the run in context (null when there is none yet). */
  href: (runId: string | null) => string
  /** The item needs a run; without one it points at the runs list. */
  needsRun?: boolean
  /** Route patterns that make the item active. */
  patterns: string[]
  /** The phase that builds the page, when it is not built yet. */
  phase?: string
}

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
  /** A domain with no results yet: listed, not navigable beyond its placeholder. */
  notStarted?: boolean
}

const runPath = (suffix: string) => (runId: string | null) =>
  runId ? `/d1/runs/${runId}/${suffix}` : "/d1/runs"

export const navigation: NavGroup[] = [
  {
    id: "benchmark",
    label: "Benchmark",
    items: [
      { id: "home", label: "Home", icon: House, href: () => "/", patterns: ["/"] },
      {
        id: "about",
        label: "About",
        icon: BookOpen,
        href: () => "/about",
        patterns: ["/about"],
      },
    ],
  },
  {
    id: "d1",
    label: "Domain 1 · Assembly",
    items: [
      {
        id: "d1-overview",
        label: "Overview",
        icon: Layers,
        href: () => "/d1",
        patterns: ["/d1"],
      },
      {
        id: "d1-runs",
        label: "Runs",
        icon: ListChecks,
        href: () => "/d1/runs",
        patterns: [
          "/d1/runs",
          "/d1/runs/:runId",
          "/d1/runs/:runId/suites/*",
          "/d1/runs/:runId/answers/*",
        ],
      },
      {
        id: "d1-coverage",
        label: "Coverage",
        icon: Boxes,
        href: runPath("coverage"),
        needsRun: true,
        patterns: ["/d1/runs/:runId/coverage"],
        phase: "UI-P3",
      },
      {
        id: "d1-findings",
        label: "Findings",
        icon: Search,
        href: runPath("findings"),
        needsRun: true,
        patterns: ["/d1/runs/:runId/findings/*"],
        phase: "UI-P3",
      },
      {
        id: "d1-perf",
        label: "Performance",
        icon: Activity,
        href: runPath("perf"),
        needsRun: true,
        patterns: ["/d1/runs/:runId/perf"],
        phase: "UI-P4",
      },
      {
        id: "d1-sweeps",
        label: "Shedding",
        icon: SlidersHorizontal,
        href: runPath("sweeps"),
        needsRun: true,
        patterns: ["/d1/runs/:runId/sweeps/*"],
        phase: "UI-P4",
      },
      {
        id: "d1-compare",
        label: "Compare",
        icon: GitCompare,
        href: () => "/d1/compare",
        patterns: ["/d1/compare"],
      },
    ],
  },
  ...(
    [
      ["d2", "Domain 2 · Long-horizon stability"],
      ["d3", "Domain 3 · Agentic capability"],
      ["d4", "Domain 4 · Economics and caching"],
      ["d5", "Domain 5 · Hierarchy and security"],
    ] as const
  ).map(([id, label]): NavGroup => ({
    id,
    label,
    notStarted: true,
    items: [
      {
        id: `${id}-overview`,
        label: "Not started",
        icon: Layers,
        href: () => `/${id}`,
        patterns: [`/${id}`],
      },
    ],
  })),
]

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.patterns.some((pattern) => matchPath({ path: pattern, end: true }, pathname) !== null)
}
