// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d5Document } from "@/test/d5-fixture"
import { D5_FIXTURE_RUNS } from "@/test/fixture-fetch"

import {
  armMetricTable,
  d5Metrics,
  metricSuites,
  pairedMetrics,
  pairOf,
  suiteGateMetrics,
  suiteOfMetric,
  tieredMetricIds,
} from "./metrics"

const summary = d5Document(`${D5_FIXTURE_RUNS.recorded}/summary.json`, "d5/summary")

describe("Domain 5's metrics", () => {
  it("file each metric under the suite its id names, S5's rates included (ask 22)", () => {
    const filedUnderS2 = summary.metrics.filter((m) => m.id.startsWith("s5.") && m.suite === "S2")
    expect(filedUnderS2.length).toBeGreaterThan(0)
    expect(suiteOfMetric(filedUnderS2[0]!)).toBe("S5")
    const metrics = d5Metrics(summary.metrics)
    expect(metrics.filter((m) => m.id.startsWith("s5.")).every((m) => m.suite === "S5")).toBe(true)
    expect(metrics.filter((m) => m.suite === "S2").every((m) => m.id.startsWith("s2."))).toBe(true)
    expect(metricSuites(metrics)).toEqual(["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7"])
  })

  it("read a paired metric's two arms (ask 21), and nothing else as a pair", () => {
    expect(pairOf("cwa vs xml-unescaped")).toEqual({ arm: "cwa", reference: "xml-unescaped" })
    expect(pairOf("cwa")).toBeNull()
    expect(pairOf(null)).toBeNull()
    const s2 = pairedMetrics(d5Metrics(summary.metrics), "S2")
    expect(s2.map((entry) => `${entry.pair.arm}/${entry.pair.reference}`)).toEqual([
      "xml-unescaped/naive",
      "cwa/xml-unescaped",
      "cwa/naive",
      "cwa-boundary/reminder",
      "cwa-reinforced/cwa-boundary",
      "cwa-observation/tool-role",
    ])
    expect(s2[1]?.metric.value).toBeCloseTo(-0.073024)
  })

  it("lay out a suite's metrics as gates, by arm, by arm and tier", () => {
    const metrics = d5Metrics(summary.metrics)
    expect(suiteGateMetrics(metrics, "S1").map((m) => m.id)).toContain("s1.gate")
    const byArm = armMetricTable(metrics, "S2")
    expect(byArm?.arms[0]).toBe("system-content")
    expect(byArm?.arms).toHaveLength(12)
    expect(byArm?.ids.map((entry) => entry.id)).toContain("s2.asr")
    expect(byArm?.cell("naive", "s2.asr")).toMatchObject({ numerator: 2208, denominator: 12270 })
    expect(byArm?.ids.map((entry) => entry.id)).not.toContain("s2.asr_paired")
    expect(tieredMetricIds(metrics, "S2")).toEqual([
      "s2.asr_by_length",
      "s2.bu_by_length",
      "s2.asr_by_representation",
      "s2.dropped_by_producer",
      "s2.asr_sampled",
    ])
  })
})
