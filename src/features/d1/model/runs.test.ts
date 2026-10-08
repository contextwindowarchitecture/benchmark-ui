// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { RunsIndexV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import {
  compareSuites,
  newestRunWithSuite,
  parseRunId,
  profilesOf,
  resolveAlias,
  runDurationMs,
  runsOfProfile,
} from "./runs"

async function index(): Promise<RunsIndexV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, "index.json"), "utf8")),
    "runs-index",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("runs index selectors", () => {
  it("lists the profiles the index names", async () => {
    expect(profilesOf(await index())).toEqual(["nightly"])
    const withLegacy: RunsIndexV1 = {
      ...(await index()),
      profiles: {},
      runs: (await index()).runs.map((run, i) => ({
        ...run,
        ci_profile: i === 1 ? "weekly" : run.ci_profile,
      })),
    }
    expect(profilesOf(withLegacy)).toEqual(["nightly", "weekly"])
  })

  it("resolves latest and a profile from the index, never from a path", async () => {
    const idx = await index()
    expect(resolveAlias(idx, "latest")?.run_id).toBe(FIXTURE_RUNS.nightly)
    expect(resolveAlias(idx, "nightly")?.run_id).toBe(FIXTURE_RUNS.nightly)
    expect(resolveAlias(idx, "weekly")).toBeUndefined()
    expect(resolveAlias({ ...idx, latest: null }, "latest")).toBeUndefined()
  })

  it("falls back to the newest finished run of a profile the index does not name", async () => {
    const idx = await index()
    const unnamed: RunsIndexV1 = {
      ...idx,
      profiles: {},
      runs: [
        {
          ...idx.runs[0]!,
          run_id: "20261009T000000Z-0000000",
          status: "running",
          finished_at: null,
        },
        ...idx.runs,
      ],
    }
    expect(resolveAlias(unnamed, "nightly")?.run_id).toBe(FIXTURE_RUNS.nightly)
  })

  it("finds the newest run that has a suite", async () => {
    const idx = await index()
    expect(newestRunWithSuite(idx, "S7")?.run_id).toBe(FIXTURE_RUNS.s7)
    expect(newestRunWithSuite(idx, "S11")?.run_id).toBe(FIXTURE_RUNS.nightly)
    expect(newestRunWithSuite(idx, "S3")).toBeUndefined()
  })

  it("groups runs by profile, null for ad-hoc runs", async () => {
    const idx = await index()
    expect(runsOfProfile(idx, "nightly").map((r) => r.run_id)).toEqual([FIXTURE_RUNS.nightly])
    expect(runsOfProfile(idx, null).map((r) => r.run_id)).toEqual([
      FIXTURE_RUNS.s7,
      FIXTURE_RUNS.failing,
    ])
  })

  it("computes a duration from the timestamps", async () => {
    const idx = await index()
    expect(runDurationMs(idx.runs[0]!)).toBe(
      Date.parse("2026-10-08T13:53:08.532Z") - Date.parse("2026-10-08T13:34:53.817Z"),
    )
    expect(runDurationMs({ started_at: "2026-10-08T13:34:53.817Z", finished_at: null })).toBeNull()
  })
})

describe("parseRunId", () => {
  it("reads the UTC start and the config hash", () => {
    const parts = parseRunId("20261008T133453Z-691b414")
    expect(parts?.startedAt.toISOString()).toBe("2026-10-08T13:34:53.000Z")
    expect(parts?.configHash).toBe("691b414")
    expect(parts?.sequence).toBeNull()
    expect(parseRunId("20261008T133453Z-691b414-2")?.sequence).toBe(2)
  })

  it("rejects what is not a run id", () => {
    expect(parseRunId("latest")).toBeNull()
    expect(parseRunId("20261399T133453Z-691b414")).toBeNull()
  })
})

describe("compareSuites", () => {
  it("orders suites numerically", () => {
    expect(["S12", "S2", "S10", "S0", "S1"].sort(compareSuites)).toEqual([
      "S0",
      "S1",
      "S2",
      "S10",
      "S12",
    ])
  })
})
