// Filtering, facet counts and paging over a file's validated rows (ui-plan.md 5.4, 8.4): pure
// functions over indexed rows, so the main thread and the worker run the same code and the tests
// need no DOM. Rows are indexed once (rowFields) and queried many times.

import { rowFields, type RowFields, type RowKind, type RowOf } from "@/features/d1/model/row-kinds"
import { compareSuites } from "@/features/d1/model/runs"
import { orderAdapters } from "@/lib/adapters"

import type { ParsedRow } from "./validate"

export const ROW_PAGE_SIZE = 100

export type RowFilter = {
  adapter?: string | undefined
  verdict?: string | undefined
  outcome?: string | undefined
  tag?: string | undefined
  suite?: string | undefined
  oracle?: string | undefined
  /** The case id exactly (the explorer), or a digest for the blob index. */
  caseId?: string | undefined
  /** A finding id the row names (a finding's "rows that carry it" link). */
  finding?: string | undefined
  /** Matched against the case id and the kind's search text, case-insensitively. */
  q?: string | undefined
}

export type RowQuery = { filter: RowFilter; page: number; pageSize?: number }

export type FacetEntry = { value: string; count: number }

export type RowFacets = {
  adapters: FacetEntry[]
  verdicts: FacetEntry[]
  outcomes: FacetEntry[]
  tags: FacetEntry[]
  suites: FacetEntry[]
  oracles: FacetEntry[]
}

export type IndexedRow<K extends RowKind> = { line: number; document: RowOf<K>; fields: RowFields }

export type RowPage<K extends RowKind> = {
  rows: IndexedRow<K>[]
  /** Rows matching the filter, across every page. */
  matched: number
  /** Rows in the file. */
  total: number
  page: number
  pageCount: number
  pageSize: number
  /** Counts over the whole file, so a filter never hides the values it could take. */
  facets: RowFacets
}

export function indexRows<K extends RowKind>(
  kind: K,
  rows: readonly ParsedRow<K>[],
): IndexedRow<K>[] {
  return rows.map((row) => ({
    line: row.line,
    document: row.document,
    fields: rowFields(kind, row.document),
  }))
}

function tally(values: Iterable<string>, into: Map<string, number>) {
  for (const value of values) into.set(value, (into.get(value) ?? 0) + 1)
}

const byCount = (map: Map<string, number>): FacetEntry[] =>
  [...map]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))

const byValue = (map: Map<string, number>): FacetEntry[] =>
  [...map]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))

/** Every value each filter can take, with how many rows carry it; adapters in the fixed order. */
export function facetsOf(rows: readonly IndexedRow<RowKind>[]): RowFacets {
  const adapters = new Map<string, number>()
  const verdicts = new Map<string, number>()
  const outcomes = new Map<string, number>()
  const tags = new Map<string, number>()
  const suites = new Map<string, number>()
  const oracles = new Map<string, number>()
  for (const { fields } of rows) {
    tally(fields.adapters, adapters)
    tally([fields.verdict], verdicts)
    tally(fields.outcomes, outcomes)
    tally(fields.tags, tags)
    if (fields.suite !== null) tally([fields.suite], suites)
    if (fields.oracle !== null) tally([fields.oracle], oracles)
  }
  return {
    adapters: orderAdapters([...adapters.keys()]).map((value) => ({
      value,
      count: adapters.get(value) ?? 0,
    })),
    verdicts: byCount(verdicts),
    outcomes: byCount(outcomes),
    tags: byValue(tags),
    suites: [...suites]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => compareSuites(a.value, b.value)),
    oracles: byCount(oracles),
  }
}

export function matchesFilter(fields: RowFields, filter: RowFilter): boolean {
  if (filter.adapter && !fields.adapters.includes(filter.adapter)) return false
  if (filter.verdict && fields.verdict !== filter.verdict) return false
  if (filter.outcome && !fields.outcomes.includes(filter.outcome)) return false
  if (filter.tag && !fields.tags.includes(filter.tag)) return false
  if (filter.suite && fields.suite !== filter.suite) return false
  if (filter.oracle && fields.oracle !== filter.oracle) return false
  if (filter.caseId !== undefined && fields.caseId !== filter.caseId) return false
  if (filter.finding && !fields.findings.includes(filter.finding)) return false
  const q = filter.q?.trim().toLowerCase()
  if (q && !fields.searchText.toLowerCase().includes(q)) return false
  return true
}

/** One page of the rows a filter keeps, with the counts around it; the page number is clamped. */
export function queryRows<K extends RowKind>(
  rows: readonly IndexedRow<K>[],
  query: RowQuery,
  facets: RowFacets = facetsOf(rows),
): RowPage<K> {
  const pageSize = Math.max(1, Math.floor(query.pageSize ?? ROW_PAGE_SIZE))
  const matched = rows.filter((row) => matchesFilter(row.fields, query.filter))
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize))
  const requested = Number.isFinite(query.page) ? Math.floor(query.page) : 1
  const page = Math.min(Math.max(1, requested), pageCount)
  const start = (page - 1) * pageSize
  return {
    rows: matched.slice(start, start + pageSize),
    matched: matched.length,
    total: rows.length,
    page,
    pageCount,
    pageSize,
    facets,
  }
}
