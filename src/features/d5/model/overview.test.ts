// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d5Document } from "@/test/d5-fixture"
import { D5_FIXTURE_RUNS } from "@/test/fixture-fetch"

import { d5Metrics } from "./metrics"
import { adaptiveRows, armRows, forgedRows, structureChecks, tiersOf } from "./overview"

const run = D5_FIXTURE_RUNS.recorded
const metrics = d5Metrics(d5Document(`${run}/summary.json`, "d5/summary").metrics)

describe("Domain 5's overview selectors", () => {
  it("give one row per arm of a metric with no tier, in the write-up's order, pairs left out", () => {
    const rows = armRows(metrics, "s2.asr")
    expect(rows).toHaveLength(12)
    expect(rows[0]).toMatchObject({ id: "system-content", group: "conventional" })
    expect(rows.find((row) => row.id === "xml-unescaped")?.group).toBe("control")
    expect(rows.at(-1)).toMatchObject({ id: "cwa-observation", group: "cwa" })
    expect(rows.find((row) => row.id === "naive")?.value).toBeCloseTo(2208 / 12270)
    expect(armRows(metrics, "s2.asr_by_length", "4k")).toHaveLength(12)
    expect(tiersOf(metrics, "s2.asr_by_length")).toEqual(["1k", "4k", "16k", "32k"])
  })

  it("read the adaptive attacker at its full budget, or the budget asked, beside the static rate", () => {
    const full = adaptiveRows(metrics)
    expect(full.budgets).toEqual(["500", "1000", "2000"])
    expect(full.budget).toBe("2000")
    const boundary = full.rows.find((row) => row.arm === "cwa-boundary")
    expect(boundary?.adaptive?.value).toBeCloseTo(0.382, 3)
    expect(boundary?.static?.id).toBe("s4.asr_static")
    expect(adaptiveRows(metrics, "500").budget).toBe("500")
    expect(adaptiveRows(metrics, "7").budget).toBe("2000")
  })

  it("take the structural checks and what the conventional payloads let through", () => {
    const checks = structureChecks([{ runId: run, metrics }])
    expect(checks.map((check) => check.metric.id)).toContain("s1.structure")
    expect(checks.every((check) => check.metric.status === "pass")).toBe(true)
    const forged = forgedRows(metrics)
    expect(forged.find((row) => row.arm === "delimited")?.forged?.value).toBe(1)
    expect(forged.find((row) => row.arm === "naive")?.markers?.value).toBe(1)
    expect(forged.find((row) => row.arm === "naive")?.forged).toBeUndefined()
    expect(forged.some((row) => row.arm.startsWith("cwa"))).toBe(false)
  })
})
