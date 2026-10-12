// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d2Document } from "@/test/d2-fixture"
import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"

import {
  armPoints,
  armTierTable,
  compareTiers,
  crossArm,
  headlineBudget,
  parseTier,
  suiteArmMetricIds,
  suiteGateMetrics,
  tierLabel,
} from "./metrics"

const summary = () => d2Document(`${D2_FIXTURE_RUNS.nightly}/summary.json`, "d2/summary")

describe("tiers", () => {
  it("read budgets, no budget, ratios of the full size and corpus multiples", () => {
    expect(parseTier("8192")).toEqual({ id: "8192", kind: "budget", value: 8192 })
    expect(parseTier("control")).toEqual({ id: "control", kind: "control", value: null })
    expect(parseTier("r0.50")).toEqual({ id: "r0.50", kind: "ratio", value: 0.5 })
    expect(parseTier("x0.25")).toEqual({ id: "x0.25", kind: "corpus", value: 0.25 })
    expect(parseTier("weird")).toEqual({ id: "weird", kind: "other", value: null })
  })

  it("sort budgets up, ratios down, corpora up, then no budget", () => {
    expect(
      ["control", "x16", "r0.10", "16384", "r1.00", "x0.25", "8192", "32768", "x1"].sort(
        compareTiers,
      ),
    ).toEqual(["8192", "16384", "32768", "r1.00", "r0.10", "x0.25", "x1", "x16", "control"])
  })

  it("say what they are", () => {
    expect(tierLabel("8192")).toBe("8,192 tokens")
    expect(tierLabel("control")).toBe("no budget")
    expect(tierLabel("r0.50")).toBe("0.5 × full size")
    expect(tierLabel("x16")).toBe("16 × the budget")
  })
})

describe("Domain 2's metrics by arm and tier", () => {
  it("lay S2's aptitude out as the write-up's table: every arm, the budgets and no budget", () => {
    const table = armTierTable(summary().metrics, "s2.aptitude")
    expect(table).not.toBeNull()
    if (!table) return
    expect(table.tiers).toEqual(["8192", "16384", "control"])
    expect(table.arms.map((arm) => arm.id)).toEqual([
      "control-full",
      "control-concat",
      "concat",
      "truncate",
      "truncate-pinned",
      "window",
      "summary",
      "cwa-history",
      "cwa-state",
      "cwa-state-x",
      "cwa-memory",
      "cwa-pipeline",
      "cwa-format",
    ])
    expect(table.intervals).toBe(true)
    const pinned = table.cell("truncate-pinned", "8192")
    expect(pinned).toMatchObject({ numerator: 363, denominator: 432, unit: "rate" })
    expect(pinned?.interval).toMatchObject({
      level: 0.95,
      method: "cluster-bootstrap/conversation",
    })
    expect(table.cell("control-full", "8192")).toBeUndefined()
    expect(table.cell("control-full", "control")).toBeDefined()
  })

  it("split the conversations' tiers from the corpora's", () => {
    const metrics = summary().metrics
    const conversations = armTierTable(metrics, "s1.fact_in_payload", {
      tierKinds: ["budget", "control", "ratio"],
    })
    const corpora = armTierTable(metrics, "s1.fact_in_payload", { tierKinds: ["corpus"] })
    expect(conversations?.tiers).toEqual([
      "8192",
      "16384",
      "32768",
      "r1.00",
      "r0.50",
      "r0.25",
      "r0.10",
    ])
    expect(corpora?.tiers).toEqual(["x0.25", "x1", "x4", "x16"])
    expect(corpora?.arms.map((arm) => arm.id)).toContain("cwa-ranked")
    expect(armTierTable(metrics, "no.such.metric")).toBeNull()
  })

  it("lead with the tightest budget S2 measured", () => {
    expect(headlineBudget(summary().metrics)).toBe("8192")
    expect(headlineBudget([])).toBeNull()
  })

  it("give one point per arm at a budget, the upper bounds at theirs", () => {
    const points = armPoints(summary().metrics, "s2.aptitude", "8192")
    expect(points.map((point) => point.arm)[0]).toBe("control-full")
    expect(points.find((point) => point.arm === "control-full")?.tier).toBe("control")
    expect(points.find((point) => point.arm === "cwa-memory")?.tier).toBe("8192")
    expect(points.every((point) => point.metric.value !== null)).toBe(true)
    expect(new Set(points.map((point) => point.arm)).size).toBe(points.length)
  })

  it("tell the gate's counts from the per-arm measurements", () => {
    const metrics = summary().metrics
    expect(suiteGateMetrics(metrics, "S1").map((metric) => metric.id)).toEqual([
      "s1.agreement",
      "s1.audit",
      "s1.prediction",
      "s1.fact_oracle",
      "s1.faults",
      "s1.gate",
      "s1.baseline_fact_oracle",
    ])
    expect(suiteArmMetricIds(metrics, "S3")).toEqual([
      "s3.aptitude",
      "s3.stale_rate",
      "s3.instruction_persistence",
      "s3.aptitude_p90",
      "s3.unreliability",
    ])
    expect(crossArm(metrics, "s1.agreement")?.status).toBe("pass")
    expect(crossArm(metrics, "s2.aptitude")).toBeUndefined()
  })
})
