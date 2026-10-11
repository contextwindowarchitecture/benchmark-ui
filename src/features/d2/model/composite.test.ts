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

  it("is empty for an index with no finished run", () => {
    expect(composite({ ...index, runs: [] }).suites).toEqual([])
  })
})
