// The navigation tree (ui-plan.md 6.1; DESIGN.md 4.3): typed, with stable ids, and the routes
// that make an item active. The sidebar renders it; nothing else knows the tree.

import {
  Activity,
  BookA,
  BookOpen,
  Boxes,
  CircleCheck,
  ClipboardPaste,
  Coins,
  Crosshair,
  GitCompare,
  History,
  House,
  Layers,
  Library,
  ListChecks,
  Mail,
  Repeat,
  ScrollText,
  Search,
  SlidersHorizontal,
  Variable,
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

const domain2: NavGroup = {
  id: "d2",
  label: "Domain 2 · Long-horizon stability",
  items: [
    {
      id: "d2-overview",
      label: "Overview",
      icon: Layers,
      href: () => "/d2",
      patterns: ["/d2"],
    },
    {
      id: "d2-runs",
      label: "Runs",
      icon: ListChecks,
      href: () => "/d2/runs",
      patterns: ["/d2/runs", "/d2/runs/:runId", "/d2/runs/:runId/suites/*"],
    },
    {
      id: "d2-tracking",
      label: "Variable Tracking",
      icon: Variable,
      href: () => "/d2/tracking",
      patterns: ["/d2/tracking"],
    },
    {
      id: "d2-instructions",
      label: "Instructions",
      icon: ScrollText,
      href: () => "/d2/instructions",
      patterns: ["/d2/instructions"],
    },
    {
      id: "d2-long-context",
      label: "Long Context",
      icon: Library,
      href: () => "/d2/long-context",
      patterns: ["/d2/long-context"],
    },
    {
      id: "d2-cost",
      label: "Cost",
      icon: Coins,
      href: () => "/d2/cost",
      patterns: ["/d2/cost"],
    },
  ],
}

const domain5: NavGroup = {
  id: "d5",
  label: "Domain 5 · Hierarchy and security",
  items: [
    {
      id: "d5-overview",
      label: "Overview",
      icon: Layers,
      href: () => "/d5",
      patterns: ["/d5"],
    },
    {
      id: "d5-runs",
      label: "Runs",
      icon: ListChecks,
      href: () => "/d5/runs",
      patterns: ["/d5/runs", "/d5/runs/:runId", "/d5/runs/:runId/suites/*"],
    },
    {
      id: "d5-structure",
      label: "Structural Isolation",
      icon: Boxes,
      href: () => "/d5/structure",
      patterns: ["/d5/structure"],
    },
    {
      id: "d5-attacks",
      label: "Attacks",
      icon: Crosshair,
      href: () => "/d5/attacks",
      patterns: ["/d5/attacks"],
    },
    {
      id: "d5-utility",
      label: "Utility",
      icon: CircleCheck,
      href: () => "/d5/utility",
      patterns: ["/d5/utility"],
    },
    {
      id: "d5-adaptive",
      label: "Adaptive Attacker",
      icon: Repeat,
      href: () => "/d5/adaptive",
      patterns: ["/d5/adaptive"],
    },
    {
      id: "d5-external",
      label: "External Sets",
      icon: Mail,
      href: () => "/d5/external",
      patterns: ["/d5/external"],
    },
    {
      id: "d5-pasted",
      label: "Pasted Material",
      icon: ClipboardPaste,
      href: () => "/d5/pasted",
      patterns: ["/d5/pasted"],
    },
    {
      id: "d5-persistence",
      label: "Persistence",
      icon: History,
      href: () => "/d5/persistence",
      patterns: ["/d5/persistence"],
    },
  ],
}

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
      {
        id: "glossary",
        label: "Glossary",
        icon: BookA,
        href: () => "/glossary",
        patterns: ["/glossary"],
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
      },
      {
        id: "d1-findings",
        label: "Findings",
        icon: Search,
        href: runPath("findings"),
        needsRun: true,
        patterns: ["/d1/runs/:runId/findings/*"],
      },
      {
        id: "d1-perf",
        label: "Performance",
        icon: Activity,
        href: runPath("perf"),
        needsRun: true,
        patterns: ["/d1/runs/:runId/perf"],
      },
      {
        id: "d1-sweeps",
        label: "Shedding",
        icon: SlidersHorizontal,
        href: runPath("sweeps"),
        needsRun: true,
        patterns: ["/d1/runs/:runId/sweeps/*"],
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
  domain2,
  domain5,
  ...(
    [
      ["d3", "Domain 3 · Agentic capability"],
      ["d4", "Domain 4 · Economics and caching"],
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
