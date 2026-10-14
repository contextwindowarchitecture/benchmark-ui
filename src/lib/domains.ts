// What each domain with results has on the site (ui-plan.md 6.1, 6.2; the UI-D2 plan): its routes'
// base, its name, and the pages it has, so a page both domains share links only to pages that
// exist. Domains 2 and 5 have no findings pages or compare page: their findings so far are none,
// and their drift reports are the harness's own.

import { useResultsDomain } from "@/data/queries"
import type { ResultsDomain } from "@/data/source"

export type DomainPages = {
  id: ResultsDomain
  /** "Domain 1" */
  label: string
  /** The routes' base: `/d1`. */
  base: string
  /** The suite whose drift is golden drift. */
  goldenSuite: string
  /** Whether a finding has a page of its own (`<base>/runs/:runId/findings/:id`). */
  findingPages: boolean
  /** Whether the domain has a compare page (`<base>/compare`). */
  compare: boolean
  /** The rows a suite page offers are per adapter (Domain 1) or per arm (Domains 2 and 5). */
  rowsBy: "adapter" | "arm"
}

export const DOMAIN_PAGES: Record<ResultsDomain, DomainPages> = {
  d1: {
    id: "d1",
    label: "Domain 1",
    base: "/d1",
    goldenSuite: "S12",
    findingPages: true,
    compare: true,
    rowsBy: "adapter",
  },
  d2: {
    id: "d2",
    label: "Domain 2",
    base: "/d2",
    goldenSuite: "S7",
    findingPages: false,
    compare: false,
    rowsBy: "arm",
  },
  d5: {
    id: "d5",
    label: "Domain 5",
    base: "/d5",
    goldenSuite: "S7",
    findingPages: false,
    compare: false,
    rowsBy: "arm",
  },
}

/**
 * The domain a path belongs to: its first segment when that is a domain with results, else
 * Domain 1's, the default for the pages every domain shares (home, About, the glossary).
 */
export function domainOfPath(pathname: string): ResultsDomain {
  const first = pathname.split("/")[1] ?? ""
  return first in DOMAIN_PAGES ? (first as ResultsDomain) : "d1"
}

/** The pages of the domain the current route belongs to. */
export function useDomainPages(): DomainPages {
  return DOMAIN_PAGES[useResultsDomain()]
}
