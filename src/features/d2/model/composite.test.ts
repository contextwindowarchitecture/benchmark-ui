// @vitest-environment node
import { describe, expect, it } from "vitest"

import type { D2RunsIndexV1 } from "@/data/schema/generated"

import { composite, sourceOf } from "./composite"

type Run = D2RunsIndexV1["runs"][number]

const run = (
  id: string,
  suites: string[],
  profile: string | null,
  status: Run["status"] = "pass",
): Run => ({
  run_id: id,
  status,
  started_at: "2026-10-11T00:00:00.000Z",
  finished_at: "2026-10-11T01:00:00.000Z",
  path: id,
  suites,
  adapters: ["python"],
  ci_profile: profile,
})

// Newest first, as the harness writes the index.
const index: D2RunsIndexV1 = {
  $schema: "cwa-bench-d2/runs-index/v1",
  latest: "20261012T000000Z-aaaaaaa",
  profiles: { nightly: "20261012T000000Z-aaaaaaa" },
  runs: [
    run("20261012T000000Z-aaaaaaa", ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7"], "nightly"),
    run("20261011T200000Z-bbbbbbb", ["S0", "S1", "S4"], null),
    run("20261011T190000Z-ccccccc", ["S0", "S6"], null, "running"),
    run("20261011T100000Z-ddddddd", ["S0", "S1", "S2", "S3", "S4", "S5", "S7"], null),
  ],
}

describe("the composite", () => {
  it("reads each suite from the newest finished run outside a CI profile that has it", () => {
    const view = composite(index)
    expect(sourceOf(view, "S4")?.run_id).toBe("20261011T200000Z-bbbbbbb")
    expect(sourceOf(view, "S2")?.run_id).toBe("20261011T100000Z-ddddddd")
    // A running run never counts; only the CI run has S6.
    expect(sourceOf(view, "S6")?.run_id).toBe("20261012T000000Z-aaaaaaa")
    expect(view.suites.map((source) => source.suite)).toEqual([
      "S0",
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
    ])
    expect(view.runs.map((r) => r.run_id)).toEqual([
      "20261012T000000Z-aaaaaaa",
      "20261011T200000Z-bbbbbbb",
      "20261011T100000Z-ddddddd",
    ])
    expect(view.pinned).toBeUndefined()
    expect(view.unknownPin).toBeNull()
  })

  it("pins every suite the named run has, and only those", () => {
    const view = composite(index, "20261012T000000Z-aaaaaaa")
    expect(view.pinned?.run_id).toBe("20261012T000000Z-aaaaaaa")
    expect(view.suites.every((source) => source.pinned)).toBe(true)
    const partial = composite(index, "20261011T200000Z-bbbbbbb")
    expect(sourceOf(partial, "S4")?.run_id).toBe("20261011T200000Z-bbbbbbb")
    expect(sourceOf(partial, "S2")?.run_id).toBe("20261011T100000Z-ddddddd")
  })

  it("names a pinned run the index does not list", () => {
    const view = composite(index, "20260101T000000Z-0000000")
    expect(view.unknownPin).toBe("20260101T000000Z-0000000")
    expect(sourceOf(view, "S2")?.run_id).toBe("20261011T100000Z-ddddddd")
  })

  it("reads past a pruned run to the next that has the suite, and says which it stands in for", () => {
    const pruned = new Set(["20261011T200000Z-bbbbbbb"])
    const view = composite(index, undefined, pruned)
    // S4: the pruned run's place is taken by the next reported run that has S4.
    const s4 = view.suites.find((source) => source.suite === "S4")
    expect(s4?.run.run_id).toBe("20261011T100000Z-ddddddd")
    expect(s4?.insteadOf?.run_id).toBe("20261011T200000Z-bbbbbbb")
    // S0 and S1 too; S2 was never read from the pruned run, so nothing stands in.
    expect(view.suites.find((source) => source.suite === "S1")?.insteadOf?.run_id).toBe(
      "20261011T200000Z-bbbbbbb",
    )
    expect(view.suites.find((source) => source.suite === "S2")?.insteadOf).toBeUndefined()
    expect(view.runs.map((r) => r.run_id)).toEqual([
      "20261012T000000Z-aaaaaaa",
      "20261011T100000Z-ddddddd",
    ])
    expect(view.passedOver.map((r) => r.run_id)).toEqual(["20261011T200000Z-bbbbbbb"])
    // With no other run having a suite, the CI run is next; with none at all, the suite is absent.
    const all = composite(
      index,
      undefined,
      new Set(["20261011T200000Z-bbbbbbb", "20261011T100000Z-ddddddd"]),
    )
    expect(all.suites.find((source) => source.suite === "S2")?.run.run_id).toBe(
      "20261012T000000Z-aaaaaaa",
    )
    const gone = composite(index, undefined, new Set(index.runs.map((r) => r.run_id)))
    expect(gone.suites).toEqual([])
    expect(gone.passedOver.map((r) => r.run_id)).toEqual([])
  })

  it("falls back from a pruned pinned run to the rule, and says so", () => {
    const view = composite(index, "20261011T200000Z-bbbbbbb", new Set(["20261011T200000Z-bbbbbbb"]))
    const s4 = view.suites.find((source) => source.suite === "S4")
    expect(s4?.run.run_id).toBe("20261011T100000Z-ddddddd")
    expect(s4?.pinned).toBe(false)
    expect(s4?.insteadOf?.run_id).toBe("20261011T200000Z-bbbbbbb")
    expect(view.pinned?.run_id).toBe("20261011T200000Z-bbbbbbb")
  })

  it("prefers a recorded run to a newer pilot, and either to a newer CI run, as each index gives size", () => {
    const sized: D2RunsIndexV1 = {
      ...index,
      runs: [
        { ...run("20261014T142634Z-aaaaaaa", ["S0", "S2"], "nightly"), size: "pilot" },
        { ...run("20261014T135142Z-bbbbbbb", ["S0", "S2", "S6"], null), size: "pilot" },
        { ...run("20261013T224806Z-ccccccc", ["S0", "S2"], null), size: "recorded" },
        { ...run("20261012T000000Z-ddddddd", ["S0", "S5"], null), size: null },
      ],
    }
    const view = composite(sized)
    expect(sourceOf(view, "S2")?.run_id).toBe("20261013T224806Z-ccccccc")
    expect(sourceOf(view, "S0")?.run_id).toBe("20261013T224806Z-ccccccc")
    // Only a pilot has S6, and only a run of unknown size has S5: each is read from it.
    expect(sourceOf(view, "S6")?.run_id).toBe("20261014T135142Z-bbbbbbb")
    expect(sourceOf(view, "S5")?.run_id).toBe("20261012T000000Z-ddddddd")
    // A pin still wins.
    expect(sourceOf(composite(sized, "20261014T135142Z-bbbbbbb"), "S2")?.run_id).toBe(
      "20261014T135142Z-bbbbbbb",
    )
    // Pruned, the recorded run gives way to the newest pilot outside a CI profile.
    const pruned = composite(sized, undefined, new Set(["20261013T224806Z-ccccccc"]))
    expect(pruned.suites.find((source) => source.suite === "S2")?.run.run_id).toBe(
      "20261014T135142Z-bbbbbbb",
    )
    // Without sizes (an index written before the field), the rule is the newest outside a profile.
    expect(sourceOf(composite(index), "S4")?.run_id).toBe("20261011T200000Z-bbbbbbb")
  })

  it("is empty for an index with no finished run", () => {
    expect(composite({ ...index, runs: [] }).suites).toEqual([])
  })
})
