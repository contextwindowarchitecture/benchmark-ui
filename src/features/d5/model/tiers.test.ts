// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d5Document } from "@/test/d5-fixture"
import { D5_FIXTURE_RUNS } from "@/test/fixture-fetch"

import { d5TierLabel, d5TierSize, TIER_KINDS } from "./tiers"

describe("Domain 5's tiers", () => {
  it("name a tier as its metric means it", () => {
    expect(d5TierLabel("4k", "s2.asr_by_length")).toBe("4k tokens")
    expect(d5TierLabel("tag", "s1.forged")).toBe("after a forged close of the arm's own wrapper")
    expect(d5TierLabel("text", "s2.asr_by_representation")).toBe("visible text extracted")
    expect(d5TierLabel("0.7", "s2.asr_sampled")).toBe("temperature 0.7")
    expect(d5TierLabel("scenario-2", "s3.llmail_asr")).toBe("scenario 2")
    expect(d5TierLabel("succeeded", "s3.llmail_asr")).toBe("beat its own level")
    expect(d5TierLabel("2000", "s4.asr_by_budget")).toBe("2,000 queries")
    expect(d5TierLabel("5-8", "s6.persistence")).toBe("turns 5 to 8 after the poison")
    expect(d5TierLabel("value", "s6.stored")).toBe("a planted figure")
    // An id the table does not know, or none, shows the tier as written.
    expect(d5TierLabel("500", "s9.new")).toBe("500")
    expect(d5TierLabel("500")).toBe("500")
  })

  it("place lengths, budgets and bands on a scale, and nothing else", () => {
    expect(d5TierSize("32k", "s2.asr_by_length")).toBe(32000)
    expect(d5TierSize("1000", "s4.asr_by_budget")).toBe(1000)
    expect(d5TierSize("13-16", "s6.persistence")).toBe(13)
    expect(d5TierSize("tag", "s1.forged")).toBeNull()
  })

  it("know every metric of the recorded run that carries a tier", () => {
    const summary = d5Document(`${D5_FIXTURE_RUNS.recorded}/summary.json`, "d5/summary")
    const tiered = new Set(summary.metrics.filter((m) => m.tier !== null).map((m) => m.id))
    expect([...tiered].filter((id) => !(id in TIER_KINDS)).sort()).toEqual([])
  })
})
