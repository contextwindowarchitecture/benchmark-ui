// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { FindingV1, ManifestV1, SummaryV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import {
  adapterMetricTally,
  driftSummary,
  fileRows,
  filterMetrics,
  groupFindings,
  groupMetricsBySuite,
  metricDefinition,
  provenanceWarnings,
} from "./run"

async function doc<K extends "manifest" | "summary" | "ci-report" | "run-index">(
  run: string,
  path: string,
  kind: K,
) {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, run, path), "utf8")),
    kind,
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("provenanceWarnings", () => {
  it("is empty for a clean run at the pinned contract", async () => {
    expect(
      provenanceWarnings(await doc(FIXTURE_RUNS.nightly, "manifest.json", "manifest")),
    ).toEqual([])
  })

  it("warns on a dirty checkout and a contract commit other than the pinned one", async () => {
    const manifest = (await doc(FIXTURE_RUNS.nightly, "manifest.json", "manifest")) as ManifestV1
    const altered: ManifestV1 = {
      ...manifest,
      contract: { ...manifest.contract, commit: "0123456789abcdef", dirty: true },
      adapters: { ...manifest.adapters, go: { ...manifest.adapters["go"]!, dirty: true } },
    }
    expect(provenanceWarnings(altered).map((w) => w.id)).toEqual([
      "contract-commit",
      "contract-dirty",
      "go-dirty",
    ])
  })
})

describe("metrics", () => {
  it("builds a DESIGN.md 4.4 definition with the producer's judgment", async () => {
    const summary = (await doc(FIXTURE_RUNS.nightly, "summary.json", "summary")) as SummaryV1
    const digest = summary.metrics.find((m) => m.id === "s0.digest")!
    expect(metricDefinition(digest)).toMatchObject({
      id: "s0.digest",
      unit: "rate",
      formattedValue: "100% (65 / 65)",
      numerator: 65,
      denominator: 65,
      target: 1,
      status: "pass",
    })
  })

  it("groups by suite in suite order and filters by suite, status and text", async () => {
    const summary = (await doc(FIXTURE_RUNS.nightly, "summary.json", "summary")) as SummaryV1
    const groups = groupMetricsBySuite(summary.metrics)
    expect(groups.map((g) => g.suite).slice(0, 3)).toEqual(["S0", "S1", "S2"])
    expect(groups.every((g) => g.metrics.length > 0)).toBe(true)
    expect(filterMetrics(summary.metrics, { suite: "S0" }).every((m) => m.suite === "S0")).toBe(
      true,
    )
    expect(
      filterMetrics(summary.metrics, { status: "info" }).every((m) => m.status === "info"),
    ).toBe(true)
    expect(filterMetrics(summary.metrics, { q: "kill" }).map((m) => m.id)).toContain(
      "s0.auditor.kill_rate",
    )
  })
})

describe("adapterMetricTally", () => {
  it("counts the producer's judgments per adapter and suite without re-judging", async () => {
    const summary = (await doc(FIXTURE_RUNS.nightly, "summary.json", "summary")) as SummaryV1
    expect(adapterMetricTally(summary, "S0", "python")).toEqual({
      status: "not-run",
      counts: { pass: 0, fail: 0, info: 0, na: 0 },
      total: 0,
    })
    const s2 = adapterMetricTally(summary, "S2", "python")
    expect(s2.status).toBe("pass")
    expect(s2.total).toBeGreaterThan(0)
    const failing = (await doc(FIXTURE_RUNS.failing, "summary.json", "summary")) as SummaryV1
    expect(adapterMetricTally(failing, "S4", "python").status).toBe("fail")
  })
})

describe("findings and drift", () => {
  it("groups findings by suite with errors first", async () => {
    const lines = (
      await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.failing, "findings.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
    const findings = lines.map((line) => JSON.parse(line) as FindingV1)
    const groups = groupFindings(findings)
    expect(groups.map((g) => g.suite)).toEqual(["S4", "S5"])
    expect(groups[0]?.findings.length).toBe(7)
    const s5 = groups[1]
    expect(s5 && s5.bySeverity.error + s5.bySeverity.warning + s5.bySeverity.info).toBe(12)
  })

  it("summarizes the drift report", async () => {
    const ci = await doc(FIXTURE_RUNS.nightly, "ci.json", "ci-report")
    const drift = driftSummary(ci)
    expect(drift.verdict).toBe("changed")
    expect(drift.previous?.run_id).toBe("20261008T131247Z-691b414")
    expect(drift.changedSuites.map((s) => s.id)).toEqual(["S2"])
    expect(drift.findings.resolved).toHaveLength(1)
  })

  it("marks which files this build reads", async () => {
    const index = await doc(FIXTURE_RUNS.nightly, "index.json", "run-index")
    const rows = fileRows(index)
    expect(rows.find((f) => f.path === "summary.json")?.readAs).toBe("summary")
    expect(rows.find((f) => f.path === "config.toml")?.readAs).toBeNull()
    expect(rows.map((f) => f.path)).toEqual([...rows.map((f) => f.path)].sort())
  })
})
