import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { fixtureRows } from "@/test/fixture-rows"

import { isRowKind, rowFields, VERDICT_LABELS } from "./row-kinds"

const nightly = FIXTURE_RUNS.nightly

describe("rowFields", () => {
  it("knows the ten row kinds and no other", () => {
    expect(isRowKind("result-row")).toBe(true)
    expect(isRowKind("manifest")).toBe(false)
    expect(Object.keys(VERDICT_LABELS)).toHaveLength(10)
  })

  it("reads a conformance row: one adapter, its verdict, its outcome, its tags and its blobs", () => {
    const [row] = fixtureRows(nightly, "suites/S1/results.jsonl", "result-row")
    const fields = rowFields("result-row", row!)
    expect(fields.caseId).toBe(row!.case_id)
    expect(fields.adapters).toEqual([row!.adapter])
    expect(fields.verdict).toBe("passed")
    expect(fields.outcomes).toEqual(["assembled"])
    expect(fields.tags.length).toBeGreaterThan(0)
    expect(fields.hasBlobs).toBe(true)
    expect(fields.findings).toEqual([])
  })

  it("reads a determinism row as hashes only, judged by its cell", () => {
    const [row] = fixtureRows(nightly, "suites/S2/results.jsonl", "determinism-row")
    const fields = rowFields("determinism-row", row!)
    expect(fields.verdict).toBe(row!.outcome)
    expect(fields.hasBlobs).toBe(false)
    expect(fields.searchText).toContain(row!.env_cell)
  })

  it("reads a relation row across its judgments", () => {
    const [row] = fixtureRows(nightly, "suites/S4/results.jsonl", "relation-row")
    const fields = rowFields("relation-row", row!)
    expect(fields.caseId).toBe(row!.seed.case_id)
    expect(fields.adapters).toEqual(row!.judgments.map((j) => j.adapter))
    expect(fields.searchText).toContain(row!.relation)
    expect(fields.verdict).toBe(row!.verdict)
  })

  it("reads the answers of fuzz, scale and summarizer rows", () => {
    const [fuzz] = fixtureRows(nightly, "suites/S5/results.jsonl", "fuzz-row")
    const fuzzFields = rowFields("fuzz-row", fuzz!)
    expect(fuzzFields.adapters).toHaveLength(fuzz!.answers.length)
    expect(fuzzFields.outcomes).toEqual([...new Set(fuzz!.answers.map((a) => a.outcome))])
    expect(fuzzFields.tags).toEqual(fuzz!.coverage_tags)

    const [scale] = fixtureRows(FIXTURE_RUNS.s7, "suites/S7/results.jsonl", "scale-row")
    const scaleFields = rowFields("scale-row", scale!)
    expect(scaleFields.searchText).toContain(scale!.cell.shape)
    expect(scaleFields.adapters.length).toBeGreaterThan(0)

    const [summarizer] = fixtureRows(nightly, "suites/S11/results.jsonl", "summarizer-row")
    const summarizerFields = rowFields("summarizer-row", summarizer!)
    expect(summarizerFields.searchText).toContain(summarizer!.arm)
    expect(summarizerFields.hasBlobs).toBe(true)
  })

  it("reads a drift row as its drift kind with both outcomes", () => {
    const [row] = fixtureRows(nightly, "suites/S12/results.jsonl", "drift-row")
    const fields = rowFields("drift-row", row!)
    expect(fields.verdict).toBe("match")
    expect(fields.adapters).toEqual([row!.adapter])
    expect(fields.outcomes).toEqual(["assembled"])
    expect(fields.hasBlobs).toBe(true)
  })

  it("reads a self-check row as its status with no adapter", () => {
    const rows = fixtureRows(nightly, "suites/S0/results.jsonl", "self-check")
    const statuses = new Set(rows.map((row) => rowFields("self-check", row).verdict))
    expect([...statuses].every((s) => ["pass", "fail", "killed", "survived"].includes(s))).toBe(
      true,
    )
    expect(rowFields("self-check", rows[0]!).adapters).toEqual([])
  })
})
