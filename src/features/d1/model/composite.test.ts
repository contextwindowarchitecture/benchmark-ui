// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { RunsIndexV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { nightlyCandidates, resolveComposite, s7Candidates } from "./composite"

async function index(): Promise<RunsIndexV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, "index.json"), "utf8")),
    "runs-index",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("the composite latest", () => {
  it("takes the nightly profile's run and the newest finished run with S7 from the index", async () => {
    const composite = resolveComposite(await index(), {})
    expect(composite.nightly?.run.run_id).toBe(FIXTURE_RUNS.nightly)
    expect(composite.nightly?.from).toBe("index")
    expect(composite.s7?.run.run_id).toBe(FIXTURE_RUNS.s7)
    expect(composite.s7?.from).toBe("index")
    expect(composite.unknown).toEqual({})
  })

  it("takes a listed run from the URL and says when the URL names an unknown one", async () => {
    const doc = await index()
    const named = resolveComposite(doc, { nightly: FIXTURE_RUNS.failing, s7: "nope" })
    expect(named.nightly?.run.run_id).toBe(FIXTURE_RUNS.failing)
    expect(named.nightly?.from).toBe("url")
    expect(named.s7?.run.run_id).toBe(FIXTURE_RUNS.s7)
    expect(named.unknown).toEqual({ s7: "nope" })
  })

  it("leaves a part undefined when no run has it", async () => {
    const doc = await index()
    const withoutS7: RunsIndexV1 = {
      ...doc,
      runs: doc.runs.filter((run) => !run.suites.includes("S7")),
    }
    expect(resolveComposite(withoutS7, {}).s7).toBeUndefined()
    const noNightly: RunsIndexV1 = {
      ...doc,
      profiles: {},
      runs: doc.runs.map((run) => ({ ...run, ci_profile: null })),
    }
    expect(resolveComposite(noNightly, {}).nightly).toBeUndefined()
  })

  it("offers the finished nightly runs and the finished S7 runs as candidates", async () => {
    const doc = await index()
    expect(nightlyCandidates(doc).map((run) => run.run_id)).toEqual([FIXTURE_RUNS.nightly])
    expect(s7Candidates(doc).map((run) => run.run_id)).toEqual([FIXTURE_RUNS.s7])
    // Without a profile, every finished run may stand in for the nightly.
    const noProfile: RunsIndexV1 = {
      ...doc,
      profiles: {},
      runs: doc.runs.map((run) => ({ ...run, ci_profile: null })),
    }
    expect(nightlyCandidates(noProfile)).toHaveLength(3)
  })
})
