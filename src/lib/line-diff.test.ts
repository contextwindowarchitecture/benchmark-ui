import { describe, expect, it } from "vitest"

import { DIFF_CELL_BUDGET, diffLines, prettyJson } from "./line-diff"

describe("diffLines", () => {
  it("keeps common lines and marks the rest", () => {
    const result = diffLines("a\nb\nc\nd", "a\nc\nx\nd")
    if (!result.ok) throw new Error("too large")
    expect(result.lines.map((l) => `${l.type[0]}:${l.text}`)).toEqual([
      "s:a",
      "r:b",
      "s:c",
      "a:x",
      "s:d",
    ])
    expect(result.added).toBe(1)
    expect(result.removed).toBe(1)
  })

  it("says when two texts are the same and when both are empty", () => {
    const same = diffLines("x\ny", "x\ny")
    if (!same.ok) throw new Error("too large")
    expect(same.added + same.removed).toBe(0)
    const empty = diffLines("", "")
    if (!empty.ok) throw new Error("too large")
    expect(empty.lines).toEqual([{ type: "same", text: "" }])
  })

  it("refuses a diff above the cell budget", () => {
    const big = Array.from({ length: 2_100 }, (_, i) => `line ${i}`).join("\n")
    const result = diffLines(big, big)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("unexpected")
    expect(result.cells).toBeGreaterThan(DIFF_CELL_BUDGET)
  })

  it("pretty-prints JSON with two spaces", () => {
    expect(prettyJson({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}')
  })
})
