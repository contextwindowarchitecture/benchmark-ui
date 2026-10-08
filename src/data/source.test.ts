// @vitest-environment node
import { describe, expect, it } from "vitest"

import { FIXTURE_ROOT, FIXTURE_RUNS, fixtureFetch } from "@/test/fixture-fetch"

import { createResultsSource, parseJsonl, SourceError } from "./source"

const source = () => createResultsSource(FIXTURE_ROOT, fixtureFetch())

describe("ResultsSource", () => {
  it("reads the runs index from <root>/d1/index.json", async () => {
    const requests: string[] = []
    const index = await createResultsSource(
      `${FIXTURE_ROOT}/`,
      fixtureFetch({ onRequest: (u) => requests.push(u) }),
    ).index()
    expect(requests).toEqual(["/results/d1/index.json"])
    expect(index).toMatchObject({ $schema: "cwa-bench-d1/runs-index/v1" })
  })

  it("reads a document of a run by path", async () => {
    const manifest = await source().document(FIXTURE_RUNS.nightly, "manifest.json")
    expect(manifest).toMatchObject({
      $schema: "cwa-bench-d1/manifest/v1",
      run_id: FIXTURE_RUNS.nightly,
    })
  })

  it("throws a not-found SourceError for a pruned run or a missing file", async () => {
    await expect(source().document("20260101T000000Z-0000000", "index.json")).rejects.toMatchObject(
      {
        name: "SourceError",
        kind: "not-found",
        status: 404,
      },
    )
    await expect(
      source().document(FIXTURE_RUNS.nightly, "perf/summary.json"),
    ).rejects.toBeInstanceOf(SourceError)
  })

  it("distinguishes other HTTP errors and non-JSON answers", async () => {
    const fetchFn = fixtureFetch({
      overrides: {
        "/results/d1/x/index.json": { status: 503 },
        "/results/d1/y/index.json": { status: 200, body: "<html>", contentType: "text/html" },
      },
    })
    const src = createResultsSource(FIXTURE_ROOT, fetchFn)
    await expect(src.document("x", "index.json")).rejects.toMatchObject({
      kind: "http",
      status: 503,
    })
    await expect(src.document("y", "index.json")).rejects.toMatchObject({ kind: "parse" })
  })

  it("streams a JSONL file into rows with line numbers", async () => {
    const result = await source().rows(FIXTURE_RUNS.failing, "findings.jsonl")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(19)
    expect(result.rows[0]).toMatchObject({ line: 1, json: { $schema: "cwa-bench-d1/finding/v1" } })
    expect(result.rows[18]?.line).toBe(19)
    expect(result.errors).toEqual([])
    expect(result.bytes).toBeGreaterThan(0)
  })

  it("reports a bad line by number and keeps the others", async () => {
    const body = ['{"a":1}', "not json", "", '{"b":2}'].join("\n")
    const result = await parseJsonl(new Response(body), 100, "x")
    expect(result).toEqual({
      ok: true,
      rows: [
        { line: 1, json: { a: 1 } },
        { line: 4, json: { b: 2 } },
      ],
      errors: [{ line: 2, message: expect.stringContaining("JSON") }],
      bytes: body.length,
    })
  })

  it("refuses a file the run index says is above the row budget before fetching it", async () => {
    const requests: string[] = []
    const src = createResultsSource(
      FIXTURE_ROOT,
      fixtureFetch({ onRequest: (u) => requests.push(u) }),
    )
    const result = await src.rows(FIXTURE_RUNS.nightly, "blobs/index.jsonl", {
      expectedRows: 12_000,
    })
    expect(result).toEqual({ ok: false, reason: "over-budget", rows: 12_000, budget: 5_000 })
    expect(requests).toEqual([])
  })

  it("stops at the budget while streaming when the index promised fewer rows", async () => {
    const result = await source().rows(FIXTURE_RUNS.nightly, "blobs/index.jsonl", { budget: 10 })
    expect(result).toMatchObject({ ok: false, reason: "over-budget", budget: 10 })
  })

  it("reads a blob by its indexed path and gives download URLs", async () => {
    const src = source()
    const rows = await src.rows(FIXTURE_RUNS.nightly, "blobs/index.jsonl")
    if (!rows.ok) throw new Error("blob index over budget")
    const first = rows.rows[0]?.json as { digest: string; path: string }
    const blob = await src.blob(FIXTURE_RUNS.nightly, first)
    expect(blob).toBeTypeOf("object")
    expect(src.url(FIXTURE_RUNS.nightly, "summary.json")).toBe(
      `/results/d1/${FIXTURE_RUNS.nightly}/summary.json`,
    )
  })
})
