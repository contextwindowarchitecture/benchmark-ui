// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  formatBytes,
  formatCount,
  formatDuration,
  formatExponent,
  formatMetricValue,
  formatMs,
  formatPercent,
  formatRate,
  formatTarget,
  formatUtc,
  isoUtc,
  shortDigest,
} from "./format"

describe("rates", () => {
  it("writes a percentage with its fraction", () => {
    expect(formatRate(1616 / 1626, 1616, 1626)).toBe("99.4% (1,616 / 1,626)")
    expect(formatRate(1, 1, 1)).toBe("100% (1 / 1)")
    expect(formatRate(1, 1000, 1000)).toBe("100% (1,000 / 1,000)")
    expect(formatRate(0, 0, 294)).toBe("0% (0 / 294)")
  })

  it("never rounds up to 100%", () => {
    expect(formatPercent(0.9996)).toBe("99.96%")
    expect(formatPercent(0.99996)).toBe("99.996%")
    expect(formatPercent(0.9949)).toBe("99.5%")
  })

  it("says when a rate was not measured or has no fraction", () => {
    expect(formatRate(null, null, null)).toBe("not measured")
    expect(formatRate(0.5, null, null)).toBe("50.0%")
  })
})

describe("counts, times and sizes", () => {
  it("groups thousands", () => {
    expect(formatCount(12000)).toBe("12,000")
  })

  it("switches milliseconds to seconds above a second", () => {
    expect(formatMs(89.138)).toBe("89.1 ms")
    expect(formatMs(5600)).toBe("5.6 s")
  })

  it("shows bytes in the fitting unit with one decimal", () => {
    expect(formatBytes(779)).toBe("779 B")
    expect(formatBytes(66 * 1024)).toBe("66.0 kB")
    expect(formatBytes(25.8 * 1024 * 1024)).toBe("25.8 MB")
    expect(formatBytes(15 * 1024 * 1024 * 1024)).toBe("15.0 GB")
  })

  it("writes exponents with their standard error", () => {
    expect(formatExponent(1.8712, 0.0468)).toBe("1.87 ± 0.05")
    expect(formatExponent(0.96)).toBe("0.96")
  })

  it("formats a metric by its unit", () => {
    expect(formatMetricValue("rate", 0.5, 1, 2)).toBe("50.0% (1 / 2)")
    expect(formatMetricValue("count", 0)).toBe("0")
    expect(formatMetricValue("ms", 71.6)).toBe("71.6 ms")
    expect(formatMetricValue("exponent", 1.91)).toBe("1.91")
    expect(formatMetricValue("count", null)).toBe("not measured")
    expect(formatTarget("rate", 1)).toBe("100%")
    expect(formatTarget("count", null)).toBe("ungated")
  })

  it("formats durations", () => {
    expect(formatDuration(850)).toBe("850 ms")
    expect(formatDuration(2500)).toBe("2.5 s")
    expect(formatDuration(18 * 60_000 + 15_000)).toBe("18 min 15 s")
    expect(formatDuration(78 * 60_000 + 13_000)).toBe("1 h 18 min")
    expect(formatDuration(null)).toBe("not available")
  })
})

describe("digests and times", () => {
  it("shortens a digest to seven hex characters", () => {
    expect(
      shortDigest("sha256:4787069c613585aee3505c3344406cccd93dd9038859f0a0cf479c697cf12a95"),
    ).toBe("4787069")
    expect(shortDigest("d5d2bcd71dde133adfb5361002e052af1a496abc40bf0bd541f8b148aa8cb1b0")).toBe(
      "d5d2bcd",
    )
  })

  it("writes times in UTC with the zone visible", () => {
    expect(formatUtc("2026-10-08T13:34:53.817Z")).toBe("2026-10-08 13:34:53 UTC")
    expect(formatUtc("2026-10-08T00:42:13+02:00")).toBe("2026-10-07 22:42:13 UTC")
    expect(formatUtc("nope")).toBe("invalid time")
    expect(isoUtc("2026-10-08T13:34:53.817Z")).toBe("2026-10-08T13:34:53.817Z")
  })
})
