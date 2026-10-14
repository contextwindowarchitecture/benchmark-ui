// @vitest-environment node
import { describe, expect, it } from "vitest"

import { armPlotLayout, type ArmRow } from "./arm-plot-geometry"
import { tierLinesLayout } from "./tier-lines-geometry"

const groups = [
  { id: "a", label: "Group A" },
  { id: "b", label: "Group B" },
]

describe("the arm plot", () => {
  it("is nothing without rows", () => {
    expect(armPlotLayout({ rows: [], groups, domain: [0, 1], width: 600, mark: "dot" })).toBeNull()
  })

  it("places rows under their group headers, in group order, skipping empty groups", () => {
    const rows: ArmRow[] = [
      { id: "b1", group: "b", value: 0.5 },
      { id: "a1", group: "a", value: 0.25, low: 0.2, high: 0.3, backdrop: 0.9 },
      { id: "a2", group: "a", value: null },
    ]
    const layout = armPlotLayout({
      rows,
      groups: [...groups, { id: "c", label: "Empty" }],
      domain: [0, 1],
      width: 600,
      mark: "dot",
      reference: { value: 0.5, label: "ref" },
    })
    expect(layout).not.toBeNull()
    if (!layout) return
    expect(layout.groups.map((g) => g.id)).toEqual(["a", "b"])
    expect(layout.rows.map((r) => r.id)).toEqual(["a1", "a2", "b1"])
    const [a1, a2, b1] = layout.rows
    expect(a1?.y).toBeLessThan(a2?.y ?? 0)
    // A missing value is a gap, not a zero.
    expect(a2?.x).toBeNull()
    expect(a1?.low).toBeLessThan(a1?.x ?? 0)
    expect(a1?.high).toBeGreaterThan(a1?.x ?? 0)
    expect(a1?.backdrop).toBeGreaterThan(a1?.high ?? 0)
    expect(layout.referenceX).toBe(b1?.x)
    expect(layout.x(0)).toBe(layout.margin.left)
    expect(layout.x(1)).toBe(600 - layout.margin.right)
  })

  it("sets the reference's label on the side of the rule with more room", () => {
    const at = (value: number) =>
      armPlotLayout({
        rows: [{ id: "x", group: "a", value: 0.5 }],
        groups,
        domain: [0, 1],
        width: 375,
        mark: "dot",
        reference: { value, label: "truncate-pinned" },
      })?.referenceAnchor
    expect(at(0.2)).toBe("start")
    expect(at(0.9)).toBe("end")
  })

  it("clamps an interval to a fixed domain and drops non-finite values", () => {
    const layout = armPlotLayout({
      rows: [{ id: "x", group: "a", value: 1, low: 0.9, high: 1.2, backdrop: Number.NaN }],
      groups,
      domain: [0, 1],
      width: 400,
      mark: "dot",
    })
    const row = layout?.rows[0]
    expect(row?.high).toBe(layout?.x(1))
    expect(row?.backdrop).toBeNull()
  })

  it("reaches from zero to the largest value when the domain is auto, and survives all zeros", () => {
    const layout = armPlotLayout({
      rows: [
        { id: "x", group: "a", value: 1726 },
        { id: "y", group: "a", value: 5793 },
      ],
      groups,
      domain: "auto",
      width: 500,
      mark: "bar",
    })
    const [d0, d1] = layout?.x.domain() ?? []
    expect(d0).toBe(0)
    expect(d1).toBeGreaterThanOrEqual(5793)
    expect(layout?.rows[0]?.base).toBe(layout?.x(0))
    const zeros = armPlotLayout({
      rows: [{ id: "z", group: "a", value: 0 }],
      groups,
      domain: "auto",
      width: 500,
      mark: "bar",
    })
    expect(zeros?.x.domain()).toEqual([0, 1])
  })

  it("takes negative values from below zero, with bars starting at zero", () => {
    const layout = armPlotLayout({
      rows: [{ id: "x", group: "a", value: -0.025, low: -0.04, high: -0.01 }],
      groups,
      domain: "auto",
      width: 500,
      mark: "bar",
    })
    const [d0] = layout?.x.domain() ?? []
    expect(d0).toBeLessThan(0)
    expect(layout?.rows[0]?.base).toBe(layout?.x(0))
    expect(layout?.rows[0]?.x).toBeLessThan(layout?.rows[0]?.base ?? 0)
  })
})

describe("the tier lines", () => {
  const points = (values: (number | null)[]) =>
    [0.25, 1, 4, 16].map((size, i) => ({ tier: `x${size}`, size, value: values[i] ?? null }))

  it("is nothing without points", () => {
    expect(tierLinesLayout({ series: [], panelWidth: 200, panelHeight: 120 })).toBeNull()
  })

  it("puts sizes on a log scale, a rate on zero to one, and the reference faint elsewhere", () => {
    const layout = tierLinesLayout({
      series: [
        { id: "rag", points: points([0.99, 1, 1, 0.99]) },
        { id: "truncate-pinned", points: points([0.89, 0.5, null, 0.31]) },
      ],
      reference: "rag",
      panelWidth: 200,
      panelHeight: 120,
    })
    expect(layout).not.toBeNull()
    if (!layout) return
    expect(layout.ticks.map((t) => t.tier)).toEqual(["x0.25", "x1", "x4", "x16"])
    // Equal steps in size ratio are equal steps along the axis.
    const [t0, t1, t2] = layout.ticks.map((t) => t.x)
    expect((t1 ?? 0) - (t0 ?? 0)).toBeCloseTo((t2 ?? 0) - (t1 ?? 0))
    const [rag, pinned] = layout.panels
    expect(rag?.reference).toBeNull()
    expect(pinned?.reference).toBe(rag?.path)
    // The missing point is a gap: the path breaks into two moves.
    expect(pinned?.path?.match(/M/g)).toHaveLength(2)
    expect(pinned?.points).toHaveLength(3)
  })

  it("draws a lone point without a line, and one size on a linear span", () => {
    const layout = tierLinesLayout({
      series: [{ id: "a", points: [{ tier: "x1", size: 1, value: 0.5 }] }],
      panelWidth: 200,
      panelHeight: 120,
    })
    expect(layout?.panels[0]?.path).toBeNull()
    expect(layout?.panels[0]?.points).toHaveLength(1)
    expect(layout?.ticks).toHaveLength(1)
  })
})
