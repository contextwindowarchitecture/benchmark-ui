import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { ContractV1, CoverageV1 } from "@/data/schema/generated"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import {
  countUnexercised,
  rateOfFraction,
  reasonMatrices,
  requirementGroups,
  tagFamilies,
  tagRows,
} from "./coverage"

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, FIXTURE_RUNS.nightly, path), "utf8")) as T
const coverage = read<CoverageV1>("coverage.json")
const contract = read<ContractV1>("contract.json")

describe("coverage selectors", () => {
  it("treats an unexercised cell as no rate", () => {
    expect(rateOfFraction({ exercised: 0, passed: 0 })).toBeNull()
    expect(rateOfFraction({ exercised: 4, passed: 3 })).toBe(0.75)
    expect(rateOfFraction(undefined)).toBeNull()
  })

  it("groups requirements by scope in the plan's order with the contract's words and the suites", () => {
    const groups = requirementGroups(
      coverage,
      contract,
      new Map([
        ["S6", ["R-1", "R-2"]],
        ["S1", ["R-2"]],
      ]),
    )
    expect(groups.map((g) => g.scope)).toEqual(["boundary", "assembler", "application"])
    const all = groups.flatMap((g) => g.rows)
    expect(all).toHaveLength(26)
    const r2 = all.find((row) => row.id === "R-2")!
    expect(r2.summary).toBe("Required fields and canonical JSON shape")
    expect(r2.suites).toEqual(["S1", "S6"])
    expect(r2.byAdapter.get("python")?.exercised).toBeGreaterThan(0)
    const ids = groups[1]!.rows.map((row) => Number(row.id.slice(2)))
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("orders reasons by kind then the contract's order, with the slots across", () => {
    const matrices = reasonMatrices(coverage, contract)
    expect(matrices.map((m) => m.adapter)).toEqual(["python", "typescript", "go", "rust"])
    const python = matrices[0]!
    expect(python.rows).toHaveLength(35)
    const kinds = python.rows.map((row) => row.kind)
    expect(kinds.lastIndexOf("exclusion")).toBeLessThan(kinds.indexOf("refusal"))
    expect(python.slots[python.slots.length - 1]).toBe("no slot")
    expect(python.slots.length).toBe(12)
    expect(python.rows[0]!.text).toContain("route policy")
    expect(python.rows[0]!.bySlot.size).toBeGreaterThan(0)
  })

  it("lists tag families and puts unexercised tags first", () => {
    const families = tagFamilies(coverage)
    expect(families.map((f) => f.family)).toContain("included")
    expect(families.reduce((n, f) => n + f.count, 0)).toBe(coverage.tags.length)
    const rows = tagRows(coverage, "included")
    expect(rows.every((row) => row.family === "included")).toBe(true)
    const all = tagRows(coverage, undefined)
    const unexercised = countUnexercised(all)
    expect(all.slice(0, unexercised).every((row) => row.unexercised)).toBe(true)
    expect(all.slice(unexercised).every((row) => !row.unexercised)).toBe(true)
  })
})
