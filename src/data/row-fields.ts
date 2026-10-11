// What one row of any domain's row files offers the rows store (ui-plan.md 5.4, 8.4): the fields
// the filters, the facets, the search and the explorer link key on. Each domain's row kinds say
// how their rows fill them (features/<domain>/model/row-kinds.ts); the store, the worker and the
// tables read only these.

export type RowFields = {
  /** The case the row judges, for the search and the answer explorer's address. */
  caseId: string
  /** What the search matches besides the case id: a relation, an operator, a check, a cell. */
  searchText: string
  /** The adapters the row names: one for a per-adapter row, every answering adapter otherwise. */
  adapters: string[]
  /** The row's judgment, as its kind calls it: a verdict, a status or a drift kind. */
  verdict: string
  /** The outcomes the row records, one per answer, de-duplicated. */
  outcomes: string[]
  tags: string[]
  /** A snapshot, payload or trace blob is referenced, so the answer explorer has something to show. */
  hasBlobs: boolean
  /** The findings the row names. */
  findings: string[]
  /** The suite the row belongs to; null for the blob index. */
  suite: string | null
  /** A finding's oracle; null for every other kind. */
  oracle: string | null
  /** The arm the row measures (Domain 2); null for a row of no arm. */
  arm: string | null
  /** The task family (Domain 2); null for a row of no family. */
  family: string | null
  /** The budget or corpus tier (Domain 2); null for a row of no tier. */
  tier: string | null
}
