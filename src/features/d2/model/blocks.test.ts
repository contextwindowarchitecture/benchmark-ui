// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d2Document } from "@/test/d2-fixture"
import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"

import {
  answerLengthTurns,
  armBlocks,
  bandLabel,
  byArmAndTier,
  costGroups,
  defaultTier,
  lqBreakdowns,
  pairedReference,
  replyTurns,
  scriptedBreakdowns,
  share,
} from "./blocks"

const run = D2_FIXTURE_RUNS.nightly
const summary = (suite: string) =>
  d2Document(`${run}/suites/${suite}/summary.json`, "d2/suite-summary")

describe("a suite summary's by_arm block", () => {
  it("has the shape its suite decides: S2's and S3's scripted, S4's long-context, S6's loop", () => {
    expect(armBlocks(summary("S2"))).toMatchObject({ lq: [], loop: [] })
    expect(armBlocks(summary("S2")).scripted).toHaveLength(24)
    expect(armBlocks(summary("S3")).scripted).toHaveLength(13)
    expect(armBlocks(summary("S4"))).toMatchObject({ scripted: [], loop: [] })
    expect(armBlocks(summary("S4")).lq).toHaveLength(24)
    expect(armBlocks(summary("S6")).loop).toHaveLength(6)
    expect(armBlocks(summary("S0"))).toEqual({ scripted: [], lq: [], loop: [] })
  })

  it("lays out by arm and tier in the write-up's orders, the controls' tier last", () => {
    const table = byArmAndTier(armBlocks(summary("S2")).scripted)
    expect(table.tiers).toEqual(["8192", "16384", "control"])
    expect(table.arms.slice(0, 4).map((arm) => arm.id)).toEqual([
      "control-full",
      "control-concat",
      "concat",
      "truncate",
    ])
    expect(table.arms.find((arm) => arm.id === "cwa-state")?.group).toBe("cwa")
    expect(table.at("concat", "8192")?.paired).toMatchObject({
      reference: "truncate-pinned",
      n: 432,
      difference: -0.203704,
    })
    expect(table.at("truncate-pinned", "8192")?.paired).toBeNull()
    expect(table.at("control-full", "8192")).toBeUndefined()
    expect(defaultTier(table.tiers)).toBe("8192")
    expect(defaultTier(["control"])).toBe("control")
    expect(defaultTier([])).toBeUndefined()
    expect(pairedReference(armBlocks(summary("S2")).scripted)).toBe("truncate-pinned")
    expect(pairedReference(armBlocks(summary("S4")).lq)).toBe("rag")
    expect(pairedReference([])).toBeNull()
  })

  it("breaks the scripted suites down by family, turn count and rule, in reading order", () => {
    const entries = armBlocks(summary("S2")).scripted
    const breakdowns = scriptedBreakdowns(entries)
    expect(breakdowns.map((b) => [b.id, b.keys])).toEqual([
      ["family", ["vt", "fr", "cc", "ip"]],
      ["turns", ["10", "50", "100"]],
      ["rule", ["brackets", "signoff", "uppercase"]],
      ["rule-turns", ["10", "50", "100"]],
    ])
    const state = entries.find((entry) => entry.arm === "cwa-state" && entry.tier === "8192")
    const [family, turns, rule] = breakdowns
    expect(family?.cell(state as never, "vt")).toEqual({ n: 96, k: 94 })
    expect(family?.keyLabel("vt")).toBe("VT · Variable tracking")
    expect(turns?.cell(state as never, "100")).toEqual({ n: 270, k: 268 })
    expect(rule?.cell(state as never, "uppercase")).toEqual({ n: 48, k: 41 })
    expect(rule?.keyLabel("uppercase")).toBe("capital letters")
    expect(rule?.measure).toBe("compliant")
    expect(scriptedBreakdowns([])).toEqual([])
  })

  it("breaks the long-context suite down by kind and format, in reading order", () => {
    const entries = armBlocks(summary("S4")).lq
    const breakdowns = lqBreakdowns(entries)
    expect(breakdowns.map((b) => [b.id, b.keys])).toEqual([
      ["kind", ["single", "multi", "none"]],
      ["format", ["short", "mcq"]],
    ])
    const pinned = entries.find((entry) => entry.arm === "truncate-pinned" && entry.tier === "x1")
    expect(breakdowns[0]?.cell(pinned as never, "single")).toEqual({ n: 12, k: 0 })
    expect(breakdowns[1]?.keyLabel("mcq")).toBe("multiple choice")
    expect(pinned?.abstained).toEqual({ n: 24, count: 9 })
  })

  it("lists the loop's reply turns ascending", () => {
    expect(replyTurns(armBlocks(summary("S6")).loop)).toEqual([
      "1",
      "11",
      "21",
      "31",
      "41",
      "51",
      "61",
      "71",
      "81",
      "91",
    ])
  })

  it("takes a share of a tally and never a zero of nothing", () => {
    expect(share(432, 364)).toBeCloseTo(0.8426, 4)
    expect(share(0, 0)).toBeNull()
  })
})

describe("S5's cost block", () => {
  it("groups the rows by suite, arms in the write-up's order, tiers in theirs", () => {
    const cost = summary("S5").cost
    expect(cost).toBeDefined()
    const groups = costGroups(cost as NonNullable<typeof cost>)
    expect(groups.map((group) => [group.suite, group.rows.length])).toEqual([
      ["S2", 24],
      ["S4", 24],
    ])
    expect(groups[0]?.rows.slice(0, 4).map((row) => `${row.arm}@${row.tier}`)).toEqual([
      "control-full@control",
      "control-concat@control",
      "concat@8192",
      "concat@16384",
    ])
    expect(groups[1]?.rows.slice(0, 2).map((row) => `${row.arm}@${row.tier}`)).toEqual([
      "control-full@x0.25",
      "control-full@x1",
    ])
    expect(answerLengthTurns(groups[0]?.rows ?? [])).toEqual(["10", "50", "100"])
    expect(answerLengthTurns(groups[1]?.rows ?? [])).toEqual([])
  })

  it("names a band of server prompt tokens", () => {
    const count = (value: number) => String(value)
    expect(bandLabel([0, 500], count)).toBe("0 to 499")
    expect(bandLabel([8000, null], count)).toBe("8000 and up")
    expect(bandLabel([null, 500], count)).toBe("below 500")
    expect(bandLabel([null, null], count)).toBe("every size")
  })
})
