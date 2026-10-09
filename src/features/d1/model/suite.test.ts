import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { indexRows } from "@/data/row-store"
import type { ContractV1, SuiteSummaryV1, SummaryV1 } from "@/data/schema/generated"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"
import { fixtureRows } from "@/test/fixture-rows"

import {
  cellGroup,
  conformanceCases,
  environmentMatrix,
  goldenDriftRows,
  isSuiteId,
  labeledCorpora,
  mutationOperators,
  purityRows,
  relationMetrics,
  requirementChips,
  suiteEntry,
  suiteFindingsCount,
  unavailableAdapters,
} from "./suite"

const nightly = FIXTURE_RUNS.nightly
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, nightly, path), "utf8")) as T
const suiteSummary = (suite: string) => read<SuiteSummaryV1>(`suites/${suite}/summary.json`)

describe("suite selectors", () => {
  it("validates suite ids and finds the suite in the run summary", () => {
    expect(isSuiteId("S12")).toBe(true)
    expect(isSuiteId("latest")).toBe(false)
    const summary = read<SummaryV1>("summary.json")
    expect(suiteEntry(summary, "S1")?.summary).toBe("suites/S1/summary.json")
    expect(suiteEntry(summary, "S7")).toBeUndefined()
    expect(suiteFindingsCount(summary, "S1")).toBe(0)
    expect(unavailableAdapters(summary)).toEqual([])
  })

  it("orders requirement chips by number and takes the contract's words", () => {
    const contract = read<ContractV1>("contract.json")
    const chips = requirementChips(["R-23", "R-2", "R-10"], contract)
    expect(chips.map((chip) => chip.id)).toEqual(["R-2", "R-10", "R-23"])
    expect(chips[0]?.summary).toBe("Required fields and canonical JSON shape")
    expect(requirementChips(["R-2"], undefined)[0]?.summary).toBeNull()
  })

  it("sorts mutation operators with survivors first", () => {
    const rows = mutationOperators(suiteSummary("S0").mutation!)
    expect(rows).toHaveLength(32)
    expect(rows[0]!.survivors).toBeGreaterThan(0)
    expect(rows[rows.length - 1]!.survivors).toBe(0)
    expect(rows.every((row) => row.killRate === null || row.killRate <= 1)).toBe(true)
  })

  it("pivots conformance rows into cases with one answer per adapter", () => {
    const rows = indexRows(
      "result-row",
      fixtureRows(nightly, "suites/S1/results.jsonl", "result-row").map((document, i) => ({
        line: i + 1,
        document,
      })),
    )
    const cases = conformanceCases(rows)
    expect(cases.length).toBeGreaterThan(0)
    expect(cases.length).toBeLessThanOrEqual(rows.length)
    const first = cases[0]!
    expect(first.answers.size).toBeGreaterThan(0)
    expect([...first.answers.values()][0]?.verdict).toBe("passed")
  })

  it("lays the environment matrix out baseline first, grouped by what each cell changes", () => {
    const matrix = environmentMatrix(suiteSummary("S2").cells!)
    expect(matrix.adapters).toEqual(["python", "typescript", "go", "rust"])
    expect(matrix.rows[0]?.cell).toBe("baseline")
    const order = matrix.rows.map((row) => cellGroup(row.cell))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const faketime = matrix.rows.find((row) => row.cell === "linux:faketime-30y")
    expect(faketime?.byAdapter.get("go")?.applied).toBe(0)
  })

  it("keeps the relation metrics in MR order", () => {
    const ids = relationMetrics(suiteSummary("S4").metrics).map((metric) => metric.id)
    expect(ids).toEqual(Array.from({ length: 14 }, (_, i) => `s4.mr${i + 1}`))
  })

  it("rates the labeled corpora per adapter", () => {
    const rows = labeledCorpora(suiteSummary("S6").labeled!)
    expect(rows[0]?.rate).toBe(1)
    expect(rows.map((row) => row.corpus)).toEqual([...rows.map((row) => row.corpus)].sort())
  })

  it("separates harmless cache writes from the rest in S10", () => {
    const rows = purityRows(suiteSummary("S10").purity!)
    expect(rows.map((row) => row.adapter)).toEqual(["python", "typescript", "go", "rust"])
    const python = rows[0]!
    expect(python.harmlessCacheWrites.length).toBeGreaterThan(0)
    expect(python.cacheWrites).toEqual([])
    expect(python.network).toEqual([])
  })

  it("counts golden drift per adapter", () => {
    const rows = goldenDriftRows(suiteSummary("S12").goldens!)
    expect(rows.map((row) => row.adapter)).toEqual(["python", "typescript", "go", "rust"])
    expect(rows[0]).toEqual({
      adapter: "python",
      counts: { match: 1352, spec_change: 0, regression: 0, new: 0 },
      total: 1352,
    })
  })
})
