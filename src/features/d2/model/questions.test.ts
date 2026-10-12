// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d2Document } from "@/test/d2-fixture"
import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"

import { armBlocks, type ScriptedArm } from "./blocks"
import {
  budgetTiers,
  chosenTier,
  familiesOf,
  familyCorrect,
  familyStale,
  lqSeries,
  persistenceSeries,
  ruleCompliant,
  rulesOf,
  shareRows,
  verdictRows,
} from "./questions"

const run = D2_FIXTURE_RUNS.nightly
const scripted = (suite: string) =>
  armBlocks(d2Document(`${run}/suites/${suite}/summary.json`, "d2/suite-summary")).scripted

describe("the question pages' selectors", () => {
  it("read the budgets from the tightest, and fall back to it for a tier the run lacks", () => {
    const entries = scripted("S2")
    expect(budgetTiers(entries)).toEqual(["8192", "16384"])
    expect(chosenTier(budgetTiers(entries), "16384")).toBe("16384")
    expect(chosenTier(budgetTiers(entries), "4096")).toBe("8192")
    expect(chosenTier(budgetTiers(entries), undefined)).toBe("8192")
    expect(chosenTier([], "8192")).toBeNull()
  })

  it("share a family's tally per arm at a budget, the upper bounds at no budget, in order", () => {
    const rows = shareRows(scripted("S2"), "8192", familyCorrect("vt"))
    expect(rows[0]).toMatchObject({
      id: "control-full",
      group: "control",
      tier: "control",
      value: 1,
      tally: { n: 96, k: 96 },
    })
    const pinned = rows.find((row) => row.id === "truncate-pinned")
    expect(pinned).toMatchObject({ tier: "8192", tally: { n: 96, k: 92 } })
    expect(pinned?.value).toBeCloseTo(92 / 96)
    expect(rows.map((row) => row.id).slice(-3)).toEqual([
      "cwa-memory",
      "cwa-pipeline",
      "cwa-format",
    ])

    const stale = shareRows(scripted("S2"), "8192", familyStale("vt"))
    // None stale is a share of zero, not a gap.
    expect(stale.find((row) => row.id === "window")).toMatchObject({ value: 0, tally: { k: 0 } })
    expect(stale.find((row) => row.id === "cwa-history")?.tally).toEqual({ n: 96, k: 11 })
  })

  it("leave out an arm whose block lacks the tally or whose tally is empty", () => {
    const entries = scripted("S2").map((entry): ScriptedArm => {
      if (entry.arm === "window") return { ...entry, by_family: {} }
      if (entry.arm === "summary")
        return { ...entry, by_family: { vt: { n: 0, correct: 0, stale: 0 } } }
      return entry
    })
    const ids = shareRows(entries, "8192", familyCorrect("vt")).map((row) => row.id)
    expect(ids).not.toContain("window")
    expect(ids).not.toContain("summary")
    expect(ids).toContain("truncate-pinned")
  })

  it("offer the families in the order given, then any other by name", () => {
    expect(familiesOf(scripted("S2"), ["vt", "cc"])).toEqual(["vt", "cc", "fr", "ip"])
    expect(familiesOf([], ["vt"])).toEqual([])
  })

  it("tally every family's grades by verdict per arm", () => {
    const rows = verdictRows(scripted("S2"), "8192")
    const concat = rows.find((row) => row.arm === "concat")
    expect(concat).toMatchObject({ tier: "8192", n: 432 })
    expect(concat?.verdicts.overflow).toBe(135)
    expect(rows.find((row) => row.arm === "control-concat")?.tier).toBe("control")
  })

  it("read compliance with each IP rule, and by the conversation's turn count", () => {
    const entries = scripted("S2")
    expect(rulesOf(entries, ["brackets", "signoff", "uppercase"])).toEqual([
      "brackets",
      "signoff",
      "uppercase",
    ])
    const uppercase = shareRows(entries, "8192", ruleCompliant("uppercase"))
    expect(uppercase.find((row) => row.id === "cwa-state")?.tally).toEqual({ n: 48, k: 42 })
    expect(uppercase.find((row) => row.id === "truncate-pinned")?.value).toBe(0)

    const { series, turns, tallies } = persistenceSeries(entries, "8192")
    expect(turns).toEqual(["10", "50", "100"])
    const truncate = series.find((s) => s.id === "truncate")
    expect(truncate?.points.map((p) => p.size)).toEqual([10, 50, 100])
    expect(truncate?.points[2]?.value).toBeCloseTo(30 / 90)
    expect(tallies.get("control-full")?.get("100")).toEqual({ n: 90, k: 60 })
    expect(series[0]?.id).toBe("control-full")
  })
})

describe("S4's series over corpus size", () => {
  const lq = armBlocks(d2Document(`${run}/suites/S4/summary.json`, "d2/suite-summary")).lq

  it("counts every question, one kind or one format, per arm and corpus tier", () => {
    const all = lqSeries(lq, { by: "all" })
    expect(all.tiers).toEqual(["x0.25", "x1", "x4", "x16"])
    expect(all.series.map((s) => s.id)[0]).toBe("control-full")
    expect(all.tallies.get("control-full")?.get("x1")).toEqual({ n: 36, k: 33 })
    expect(all.series[0]?.points.map((p) => p.size)).toEqual([0.25, 1, 4, 16])

    const single = lqSeries(lq, { by: "kind", key: "single" })
    expect(single.tallies.get("truncate-pinned")?.get("x4")).toEqual({ n: 12, k: 0 })
    const mcq = lqSeries(lq, { by: "format", key: "mcq" })
    expect(mcq.tallies.get("control-full")?.get("x0.25")).toEqual({ n: 18, k: 15 })
  })

  it("leaves out a kind no entry carries", () => {
    expect(lqSeries(lq, { by: "kind", key: "nope" }).series).toEqual([])
  })
})
