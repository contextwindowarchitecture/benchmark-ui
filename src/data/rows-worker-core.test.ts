import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS, fixtureFetch } from "@/test/fixture-fetch"

import { createRowsWorkerCore, type WorkerResponse } from "./rows-worker-core"

const url = (path: string) => `/results/d1/${FIXTURE_RUNS.nightly}/${path}`

function core() {
  const posted: WorkerResponse[] = []
  const handle = createRowsWorkerCore((response) => posted.push(response), fixtureFetch())
  return { posted, handle }
}

describe("rows worker core", () => {
  it("refuses a query before a file is loaded", async () => {
    const { posted, handle } = core()
    await handle({ type: "query", id: 1, query: { filter: {}, page: 1 } })
    expect(posted).toEqual([{ type: "failed", id: 1, message: "no file is loaded in this worker" }])
  })

  it("loads, validates and pages a file", async () => {
    const { posted, handle } = core()
    await handle({
      type: "load",
      url: url("suites/S1/results.jsonl"),
      kind: "result-row",
      budget: 30_000,
    })
    const loaded = posted[0]
    expect(loaded?.type).toBe("loaded")
    if (loaded?.type !== "loaded" || !loaded.result.ok) throw new Error("not loaded")
    expect(loaded.result.total).toBe(12)
    expect(loaded.result.errors).toEqual([])
    expect(loaded.result.bytes).toBeGreaterThan(0)

    await handle({ type: "query", id: 7, query: { filter: {}, page: 2, pageSize: 5 } })
    const page = posted[1]
    if (page?.type !== "page") throw new Error("no page")
    expect(page.id).toBe(7)
    expect(page.page.rows).toHaveLength(5)
    expect(page.page.page).toBe(2)
    expect(page.page.matched).toBe(12)
    expect(page.page.facets.adapters.length).toBeGreaterThan(0)
  })

  it("reports a file over the budget without keeping it", async () => {
    const { posted, handle } = core()
    await handle({
      type: "load",
      url: url("suites/S1/results.jsonl"),
      kind: "result-row",
      budget: 2,
    })
    expect(posted[0]).toEqual({
      type: "loaded",
      result: { ok: false, reason: "over-budget", rows: 3, budget: 2 },
    })
    await handle({ type: "query", id: 2, query: { filter: {}, page: 1 } })
    expect(posted[1]?.type).toBe("failed")
  })

  it("reports a missing file as not found", async () => {
    const { posted, handle } = core()
    await handle({
      type: "load",
      url: url("suites/S99/results.jsonl"),
      kind: "result-row",
      budget: 30_000,
    })
    const loaded = posted[0]
    if (loaded?.type !== "loaded" || loaded.result.ok) throw new Error("unexpected")
    expect(loaded.result.reason).toBe("error")
    if (loaded.result.reason !== "error") throw new Error("unexpected")
    expect(loaded.result.error.kind).toBe("not-found")
    expect(loaded.result.error.status).toBe(404)
  })
})
