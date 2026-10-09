// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { CiReportV1, RunsIndexV1, SummaryV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { computeComparison, harnessCompared } from "./compare"
import { runById } from "./runs"

async function summary(run: string): Promise<SummaryV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, run, "summary.json"), "utf8")),
    "summary",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

async function index(): Promise<RunsIndexV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, "index.json"), "utf8")),
    "runs-index",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("comparing two runs", () => {
  it("knows when the harness's report compares exactly this pair", async () => {
    const result = parseDocumentAs(
      JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.nightly, "ci.json"), "utf8")),
      "ci-report",
    )
    if (!result.ok) throw new Error(result.reason)
    const ci: CiReportV1 = result.document
    expect(harnessCompared(ci, "20261008T131247Z-691b414")).toBe(true)
    expect(harnessCompared(ci, FIXTURE_RUNS.failing)).toBe(false)
    expect(harnessCompared(undefined, FIXTURE_RUNS.failing)).toBe(false)
  })

  it("lines up statuses, suites, metrics, findings and commits between the failing run and the nightly", async () => {
    const doc = await index()
    const comparison = computeComparison(
      {
        runId: FIXTURE_RUNS.failing,
        summary: await summary(FIXTURE_RUNS.failing),
        entry: runById(doc, FIXTURE_RUNS.failing),
      },
      {
        runId: FIXTURE_RUNS.nightly,
        summary: await summary(FIXTURE_RUNS.nightly),
        entry: runById(doc, FIXTURE_RUNS.nightly),
      },
    )
    expect(comparison.status).toEqual({ from: "fail", to: "pass" })
    const changed = comparison.suites.filter((suite) => suite.changed)
    expect(changed.map((suite) => [suite.id, suite.from, suite.to])).toEqual([
      ["S4", "fail", "pass"],
      ["S5", "fail", "pass"],
      ["S11", null, "pass"],
    ])
    expect(comparison.suites).toHaveLength(11)
    expect(comparison.suites[0]!.id).toBe("S0")
    // 14 metrics moved and 27 (S11's) exist only in the nightly.
    expect(comparison.metrics).toHaveLength(41)
    expect(comparison.metrics.filter((metric) => metric.from === null)).toHaveLength(27)
    const kill = comparison.metrics.find((metric) => metric.id === "s0.auditor.kill_rate")
    expect(kill?.from?.value).not.toBe(kill?.to?.value)
    // Ordered by suite, id, adapter.
    expect(comparison.metrics[0]!.id).toBe("s0.auditor.kill_rate")
    expect(comparison.findings).toEqual([
      { suite: "S4", from: 7, to: 0 },
      { suite: "S5", from: 12, to: 0 },
    ])
    expect(comparison.totals).toEqual({ from: 19, to: 0 })
    const rust = comparison.bumps.find((bump) => bump.what === "rust")
    expect(rust?.from?.startsWith("302bbea")).toBe(true)
    expect(rust?.to?.startsWith("92b4d6f")).toBe(true)
  })

  it("finds nothing between a run and itself, and no bumps without index entries", async () => {
    const nightly = await summary(FIXTURE_RUNS.nightly)
    const same = computeComparison(
      { runId: FIXTURE_RUNS.nightly, summary: nightly },
      { runId: FIXTURE_RUNS.nightly, summary: nightly },
    )
    expect(same.bumps).toEqual([])
    expect(same.suites.every((suite) => !suite.changed)).toBe(true)
    expect(same.metrics).toEqual([])
    expect(same.findings).toEqual([])
  })
})
