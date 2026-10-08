import { describe, expect, it } from "vitest"

import { fixtureRows } from "@/features/d1/model/row-kinds.test"
import { ADAPTER_IDS } from "@/lib/adapters"
import { FIXTURE_RUNS } from "@/test/fixture-fetch"

import { facetsOf, indexRows, matchesFilter, queryRows } from "./row-store"

const rows = indexRows(
  "result-row",
  fixtureRows(FIXTURE_RUNS.nightly, "suites/S1/results.jsonl", "result-row").map((document, i) => ({
    line: i + 1,
    document,
  })),
)

describe("row store", () => {
  it("counts facets over the whole file, adapters in the fixed order", () => {
    const facets = facetsOf(rows)
    const order = facets.adapters.map((entry) => entry.value)
    expect(order).toEqual(ADAPTER_IDS.filter((id) => order.includes(id)))
    expect(facets.adapters.reduce((sum, entry) => sum + entry.count, 0)).toBe(rows.length)
    expect(facets.verdicts[0]?.value).toBe("passed")
    expect(facets.tags.length).toBeGreaterThan(0)
    expect(facets.tags).toEqual([...facets.tags].sort((a, b) => a.value.localeCompare(b.value)))
  })

  it("filters by adapter, verdict, outcome, tag and search text", () => {
    const facets = facetsOf(rows)
    const adapter = facets.adapters[0]!
    expect(queryRows(rows, { filter: { adapter: adapter.value }, page: 1 }).matched).toBe(
      adapter.count,
    )
    expect(queryRows(rows, { filter: { verdict: "nope" }, page: 1 }).matched).toBe(0)
    expect(queryRows(rows, { filter: { outcome: "assembled" }, page: 1 }).matched).toBe(
      facets.outcomes.find((entry) => entry.value === "assembled")?.count,
    )
    const tag = facets.tags[0]!
    expect(queryRows(rows, { filter: { tag: tag.value }, page: 1 }).matched).toBe(tag.count)
    const caseId = rows[0]!.fields.caseId
    expect(
      queryRows(rows, { filter: { q: caseId.slice(0, 6).toUpperCase() }, page: 1 }).matched,
    ).toBeGreaterThan(0)
    expect(matchesFilter(rows[0]!.fields, { q: "   " })).toBe(true)
  })

  it("pages and clamps the page number", () => {
    const first = queryRows(rows, { filter: {}, page: 1, pageSize: 5 })
    expect(first.rows).toHaveLength(5)
    expect(first.pageCount).toBe(Math.ceil(rows.length / 5))
    expect(first.total).toBe(rows.length)
    const last = queryRows(rows, { filter: {}, page: 99, pageSize: 5 })
    expect(last.page).toBe(first.pageCount)
    expect(last.rows.length).toBeGreaterThan(0)
    expect(queryRows(rows, { filter: {}, page: 0, pageSize: 5 }).page).toBe(1)
    const none = queryRows(rows, { filter: { verdict: "nope" }, page: 3 })
    expect(none.rows).toEqual([])
    expect(none.pageCount).toBe(1)
    expect(none.page).toBe(1)
  })
})
