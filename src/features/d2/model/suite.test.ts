// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d2Document } from "@/test/d2-fixture"
import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"

import { suiteRowFiles } from "./suite"

const run = D2_FIXTURE_RUNS.nightly
const index = () => d2Document(`${run}/index.json`, "d2/run-index")

describe("a suite's row files", () => {
  it("are its directory's files, its model calls and, for S1, the producers' calls", () => {
    expect(
      suiteRowFiles(index(), "S1", "suites/S1/turns.jsonl").map((file) => [file.path, file.kind]),
    ).toEqual([
      ["suites/S1/turns.jsonl", "d2/turn-row"],
      ["suites/S1/baselines.jsonl", "d2/baseline-row"],
      ["suites/S1/lq-baselines.jsonl", "d2/lq-baseline-row"],
      ["suites/S1/lq.jsonl", "d2/lq-gate-row"],
      ["producers/calls.jsonl", "d2/producer-row"],
    ])
    expect(suiteRowFiles(index(), "S2", "suites/S2/grades.jsonl").map((file) => file.path)).toEqual(
      ["suites/S2/grades.jsonl", "model/calls.jsonl"],
    )
    expect(suiteRowFiles(index(), "S6").map((file) => file.path)).toEqual([
      "suites/S6/grades.jsonl",
      "suites/S6/turns.jsonl",
      "model/s6-calls.jsonl",
    ])
    expect(suiteRowFiles(index(), "S5")).toEqual([])
    expect(suiteRowFiles(index(), "S2")[0]?.rows).toBe(12)
  })
})
