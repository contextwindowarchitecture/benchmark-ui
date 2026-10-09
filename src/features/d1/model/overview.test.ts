// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { DocumentByKind, SchemaKind } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import {
  headlineMetrics,
  medianExponents,
  reasonsExercised,
  suiteOfMetricId,
  suitesPassing,
  ungatedSummarizerMetrics,
} from "./overview"

async function document<K extends SchemaKind>(
  run: string,
  path: string,
  kind: K,
): Promise<DocumentByKind[K]> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, run, path), "utf8")),
    kind,
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("overview selectors", () => {
  it("picks the headline metrics out of both summaries, cross-adapter ones once and the rest per adapter", async () => {
    const nightly = await document(FIXTURE_RUNS.nightly, "summary.json", "summary")
    const s7 = await document(FIXTURE_RUNS.s7, "summary.json", "summary")
    const groups = headlineMetrics([
      { runId: FIXTURE_RUNS.nightly, summary: nightly },
      { runId: FIXTURE_RUNS.s7, summary: s7 },
    ])
    expect(groups.map((g) => g.group.id)).toEqual([
      "determinism",
      "agreement",
      "protected",
      "crash-free",
      "metamorphic",
      "purity",
      "goldens",
    ])
    const determinism = groups[0]!
    expect(determinism.missing).toEqual([])
    expect(determinism.metrics.map((m) => m.id)).toEqual([
      "s2.decision_invariance",
      "s2.payload_invariance",
      "s2.trace_invariance",
    ])
    expect(determinism.metrics[0]!.cross).toBe(false)
    expect(determinism.metrics[0]!.entries.map((m) => m.adapter)).toEqual([
      "python",
      "typescript",
      "go",
      "rust",
    ])
    const agreement = groups[1]!
    expect(agreement.metrics.map((m) => [m.id, m.runId, m.cross])).toEqual([
      ["s1.differential.agreement", FIXTURE_RUNS.nightly, true],
      ["s5.agreement", FIXTURE_RUNS.nightly, true],
      ["s7.agreement", FIXTURE_RUNS.s7, true],
    ])
    expect(agreement.metrics[2]!.entries[0]!.value).toBe(1)
  })

  it("names the ids no source carries, so the page can say which run would", async () => {
    const nightly = await document(FIXTURE_RUNS.nightly, "summary.json", "summary")
    const groups = headlineMetrics([{ runId: FIXTURE_RUNS.nightly, summary: nightly }])
    expect(groups[1]!.missing).toEqual(["s7.agreement"])
    expect(groups[2]!.missing).toEqual(["s7.protected_preserved", "s7.refusal_correct"])
    expect(suiteOfMetricId("s7.agreement")).toBe("S7")
    expect(suiteOfMetricId("s11.fit_utility.llm")).toBe("S11")
  })

  it("lists the summarizer's ungated metrics on their own", async () => {
    const nightly = await document(FIXTURE_RUNS.nightly, "summary.json", "summary")
    const ungated = ungatedSummarizerMetrics([{ runId: FIXTURE_RUNS.nightly, summary: nightly }])
    // In the summary's own order, which is the harness's.
    expect(ungated.map((m) => m.id)).toEqual([
      "s11.repeat_stability",
      "s11.flip_rate",
      "s11.cache_hit_rate",
      "s11.fidelity",
      "s11.fit_utility.off",
      "s11.fit_utility.stub",
      "s11.fit_utility.llm",
    ])
    for (const metric of ungated) {
      expect(metric.entries.every((entry) => entry.status === "info")).toBe(true)
    }
  })

  it("counts the reason codes any adapter exercised", async () => {
    const coverage = await document(FIXTURE_RUNS.nightly, "coverage.json", "coverage")
    expect(reasonsExercised(coverage)).toEqual({ exercised: 35, total: 35, unknown: 0 })
    const none = { ...coverage, reasons: [] }
    expect(reasonsExercised(none)).toEqual({ exercised: 0, total: 0, unknown: 0 })
  })

  it("takes the median in-process diagonal exponent per adapter and label from the fits", async () => {
    const perf = await document(FIXTURE_RUNS.s7, "perf/summary.json", "perf-summary")
    const rows = medianExponents(perf)
    expect(rows.map((row) => row.adapter)).toEqual(["python", "typescript", "go", "rust"])
    // The fixture keeps one shape, so each median is that shape's exponent.
    expect(rows[0]).toEqual({
      adapter: "python",
      noPressure: 0.9474,
      pressure: 1.9119,
      shapes: { noPressure: 1, pressure: 1 },
      fewestPoints: 4,
    })
    expect(rows[2]!.pressure).toBe(1.5769)
    const empty = medianExponents({ ...perf, fits: [] })
    expect(empty).toEqual([])
  })

  it("counts the suites that pass", async () => {
    const nightly = await document(FIXTURE_RUNS.nightly, "summary.json", "summary")
    expect(suitesPassing(nightly)).toEqual({ passed: 11, total: 11 })
    const failing = await document(FIXTURE_RUNS.failing, "summary.json", "summary")
    expect(suitesPassing(failing).passed).toBeLessThan(suitesPassing(failing).total)
  })
})
