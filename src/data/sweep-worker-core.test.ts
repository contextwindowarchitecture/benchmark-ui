// @vitest-environment node
import { describe, expect, it } from "vitest"

import { FIXTURE_ROOT, FIXTURE_RUNS, fixtureFetch } from "@/test/fixture-fetch"

import { WHOLE_FILE_BYTES } from "./budgets"
import { createSweepWorkerCore, fetchSweep, type SweepResponse } from "./sweep-worker-core"

const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"
const url = `${FIXTURE_ROOT}/d1/${FIXTURE_RUNS.s7}/suites/S7/sweeps/${SWEEP}.json`

describe("the sweep worker core", () => {
  it("fetches a sweep file whole and answers its compact summary", async () => {
    const posted: SweepResponse[] = []
    const handle = createSweepWorkerCore((response) => posted.push(response), fixtureFetch())
    await handle({ type: "load", url, budget: WHOLE_FILE_BYTES })
    expect(posted).toHaveLength(1)
    const result = posted[0]!.result
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.bytes).toBeGreaterThan(10_000)
    expect(result.summary.full).toBe(2104)
    expect(result.summary.curves).toHaveLength(4)
    expect(result.summary.curves[0]!.points).toHaveLength(16)
  })

  it("stops at the whole-file budget", async () => {
    const { result } = await fetchSweep(url, 1024, fixtureFetch())
    expect(result).toMatchObject({ ok: false, reason: "over-budget", budget: 1024 })
  })

  it("reports a missing file, a non-JSON body, another kind and an invalid document as states", async () => {
    const missing = await fetchSweep(
      url.replace(SWEEP, "0".repeat(64)),
      WHOLE_FILE_BYTES,
      fixtureFetch(),
    )
    expect(missing.result).toMatchObject({
      ok: false,
      reason: "error",
      error: { kind: "not-found", status: 404 },
    })
    const broken = await fetchSweep(
      url,
      WHOLE_FILE_BYTES,
      fixtureFetch({ overrides: { [url]: { status: 200, body: "{not json" } } }),
    )
    expect(broken.result).toMatchObject({ ok: false, reason: "error", error: { kind: "parse" } })
    const wrongKind = await fetchSweep(
      url,
      WHOLE_FILE_BYTES,
      fixtureFetch({
        overrides: {
          [url]: {
            status: 200,
            body: '{"$schema":"cwa-bench-d1/sweep/v2"}',
            contentType: "application/json",
          },
        },
      }),
    )
    expect(wrongKind.result).toMatchObject({
      ok: false,
      reason: "unsupported",
      schema: "cwa-bench-d1/sweep/v2",
    })
    const invalid = await fetchSweep(
      url,
      WHOLE_FILE_BYTES,
      fixtureFetch({
        overrides: {
          [url]: {
            status: 200,
            body: '{"$schema":"cwa-bench-d1/sweep/v1","run_id":"x"}',
            contentType: "application/json",
          },
        },
      }),
    )
    expect(invalid.result).toMatchObject({ ok: false, reason: "invalid" })
    if (invalid.result.ok || invalid.result.reason !== "invalid") return
    expect(invalid.result.issues.length).toBeGreaterThan(0)
    const failed = await fetchSweep(
      url,
      WHOLE_FILE_BYTES,
      fixtureFetch({ overrides: { [url]: { status: 503 } } }),
    )
    expect(failed.result).toMatchObject({ ok: false, reason: "error", error: { kind: "http" } })
  })
})
