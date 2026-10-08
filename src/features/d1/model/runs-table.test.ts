// @vitest-environment node
import { describe, expect, it } from "vitest"

import type { RunEntry } from "./runs"
import { commitsOf, filterRuns, sortRuns } from "./runs-table"

const run = (overrides: Partial<RunEntry>): RunEntry => ({
  run_id: "20261008T000000Z-0000000",
  status: "pass",
  started_at: "2026-10-08T00:00:00.000Z",
  finished_at: "2026-10-08T00:10:00.000Z",
  path: "x",
  suites: [],
  adapters: [],
  ci_profile: null,
  ...overrides,
})

const runs = [
  run({
    run_id: "a",
    status: "pass",
    ci_profile: "nightly",
    started_at: "2026-10-08T03:00:00Z",
    finished_at: "2026-10-08T03:30:00Z",
  }),
  run({
    run_id: "b",
    status: "fail",
    started_at: "2026-10-08T02:00:00Z",
    finished_at: "2026-10-08T02:05:00Z",
  }),
  run({ run_id: "c", status: "running", started_at: "2026-10-08T01:00:00Z", finished_at: null }),
]

describe("filterRuns", () => {
  it("filters by profile, by the absence of one, and by status", () => {
    expect(filterRuns(runs, { profile: "nightly" }).map((r) => r.run_id)).toEqual(["a"])
    expect(filterRuns(runs, { profile: "none" }).map((r) => r.run_id)).toEqual(["b", "c"])
    expect(filterRuns(runs, { status: "fail" }).map((r) => r.run_id)).toEqual(["b"])
    expect(filterRuns(runs, {})).toHaveLength(3)
  })
})

describe("sortRuns", () => {
  it("sorts by start, status, profile and duration, with a stable fallback", () => {
    expect(sortRuns(runs, "started", "desc").map((r) => r.run_id)).toEqual(["a", "b", "c"])
    expect(sortRuns(runs, "started", "asc").map((r) => r.run_id)).toEqual(["c", "b", "a"])
    expect(sortRuns(runs, "status", "asc").map((r) => r.run_id)).toEqual(["b", "a", "c"])
    expect(sortRuns(runs, "profile", "asc").map((r) => r.run_id)).toEqual(["a", "b", "c"])
    expect(sortRuns(runs, "duration", "asc").map((r) => r.run_id)).toEqual(["b", "a", "c"])
  })
})

describe("commitsOf", () => {
  it("puts the contract first and the adapters in the fixed order", () => {
    const entry = run({ commits: { rust: "r", contract: "c", python: "p", zig: null } })
    expect(commitsOf(entry, ["python", "typescript", "go", "rust"])).toEqual([
      { role: "contract", commit: "c" },
      { role: "python", commit: "p" },
      { role: "rust", commit: "r" },
      { role: "zig", commit: null },
    ])
    expect(commitsOf(run({}), [])).toEqual([])
  })
})
