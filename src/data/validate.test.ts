// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS, D2_FIXTURES_DIR, FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import {
  domainOfKind,
  parseDocument,
  parseDocumentAs,
  parseRows,
  parseSchemaString,
  schemaStringOf,
} from "./validate"

async function fixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(FIXTURES_DIR, path), "utf8"))
}

async function d2Fixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(D2_FIXTURES_DIR, path), "utf8"))
}

describe("parseSchemaString", () => {
  it("reads the producer's domain, the kind and the major version", () => {
    expect(parseSchemaString("cwa-bench-d1/runs-index/v1")).toEqual({
      domain: "d1",
      kind: "runs-index",
      version: 1,
    })
    expect(parseSchemaString("cwa-bench-d1/summary/v12")).toEqual({
      domain: "d1",
      kind: "summary",
      version: 12,
    })
  })

  it("keys a later domain's kinds behind the domain", () => {
    expect(parseSchemaString("cwa-bench-d2/summary/v1")).toEqual({
      domain: "d2",
      kind: "d2/summary",
      version: 1,
    })
    expect(parseSchemaString("cwa-bench-d5/trace/v3")).toEqual({
      domain: "d5",
      kind: "d5/trace",
      version: 3,
    })
  })

  it("rejects anything else", () => {
    expect(parseSchemaString("https://json-schema.org/draft/2020-12/schema")).toBeNull()
    expect(parseSchemaString("cwa-bench-d1/summary/v0")).toBeNull()
    expect(parseSchemaString("cwa-bench-d0/summary/v1")).toBeNull()
    expect(parseSchemaString("cwa-bench/summary/v1")).toBeNull()
    expect(parseSchemaString(42)).toBeNull()
    expect(parseSchemaString(undefined)).toBeNull()
  })
})

describe("parseDocument", () => {
  it("parses a known kind at a known version", async () => {
    const result = parseDocument(await fixture("index.json"))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.kind).toBe("runs-index")
    expect(result.version).toBe(1)
    expect(result.document.$schema).toBe("cwa-bench-d1/runs-index/v1")
  })

  it("parses every document the fixture runs open first", async () => {
    for (const run of Object.values(FIXTURE_RUNS)) {
      for (const path of [
        "index.json",
        "manifest.json",
        "summary.json",
        "contract.json",
        "coverage.json",
      ]) {
        const result = parseDocument(await fixture(`${run}/${path}`))
        expect(result, `${run}/${path}`).toMatchObject({ ok: true })
      }
    }
    expect(parseDocument(await fixture(`${FIXTURE_RUNS.nightly}/ci.json`))).toMatchObject({
      ok: true,
      kind: "ci-report",
    })
    expect(parseDocument(await fixture(`${FIXTURE_RUNS.s7}/perf/summary.json`))).toMatchObject({
      ok: true,
      kind: "perf-summary",
    })
  })

  it("yields UnsupportedSchema for an unknown kind", () => {
    expect(parseDocument({ $schema: "cwa-bench-d1/trend/v1", rows: [] })).toEqual({
      ok: false,
      reason: "unsupported-schema",
      schema: "cwa-bench-d1/trend/v1",
      kind: "trend",
      version: 1,
    })
  })

  it("yields UnsupportedSchema for an unknown major version of a known kind", () => {
    expect(parseDocument({ $schema: "cwa-bench-d1/summary/v2" })).toEqual({
      ok: false,
      reason: "unsupported-schema",
      schema: "cwa-bench-d1/summary/v2",
      kind: "summary",
      version: 2,
    })
  })

  it("yields UnsupportedSchema when there is no usable $schema", () => {
    expect(parseDocument({ run_id: "x" })).toMatchObject({
      ok: false,
      reason: "unsupported-schema",
      schema: null,
    })
    expect(parseDocument(null)).toMatchObject({
      ok: false,
      reason: "unsupported-schema",
      schema: null,
    })
    expect(parseDocument({ $schema: "something else" })).toMatchObject({
      ok: false,
      reason: "unsupported-schema",
      schema: "something else",
      kind: null,
    })
  })

  it("reports a known kind that does not validate, with the paths that fail", () => {
    const result = parseDocument({
      $schema: "cwa-bench-d1/runs-index/v1",
      latest: null,
      runs: [{ run_id: "nope" }],
    })
    expect(result).toMatchObject({ ok: false, reason: "invalid", kind: "runs-index" })
    if (result.ok || result.reason !== "invalid") return
    expect(result.issues.some((issue) => issue.path.startsWith("/runs/0"))).toBe(true)
  })

  it("checks the kind the caller expects", async () => {
    const result = parseDocumentAs(await fixture("index.json"), "manifest")
    expect(result).toEqual({
      ok: false,
      reason: "wrong-kind",
      expected: "manifest",
      actual: "runs-index",
    })
  })
})

describe("Domain 2's documents", () => {
  const run = D2_FIXTURE_RUNS.nightly

  it("parse as their own kinds, behind the domain", async () => {
    const index = parseDocument(await d2Fixture("index.json"))
    expect(index).toMatchObject({ ok: true, kind: "d2/runs-index", version: 1 })
    for (const [path, kind] of [
      ["index.json", "d2/run-index"],
      ["manifest.json", "d2/manifest"],
      ["summary.json", "d2/summary"],
      ["contract.json", "d2/contract"],
      ["ci.json", "d2/ci-report"],
      ["conversations/vt/index.json", "d2/conversation-index"],
      ["conversations/lq/index.json", "d2/lq-index"],
      ["suites/S2/summary.json", "d2/suite-summary"],
      ["suites/S7/candidate-goldens.json", "d2/goldens"],
    ] as const) {
      const result = parseDocumentAs(await d2Fixture(`${run}/${path}`), kind)
      expect(result, path).toMatchObject({ ok: true, kind })
    }
  })

  it("are never read as Domain 1's kind of the same name", async () => {
    expect(parseDocumentAs(await d2Fixture(`${run}/summary.json`), "summary")).toEqual({
      ok: false,
      reason: "wrong-kind",
      expected: "summary",
      actual: "d2/summary",
    })
    expect(parseDocumentAs(await fixture("index.json"), "d2/runs-index")).toEqual({
      ok: false,
      reason: "wrong-kind",
      expected: "d2/runs-index",
      actual: "runs-index",
    })
  })

  it("of a domain this build does not read are unsupported", () => {
    expect(parseDocument({ $schema: "cwa-bench-d3/summary/v1" })).toEqual({
      ok: false,
      reason: "unsupported-schema",
      schema: "cwa-bench-d3/summary/v1",
      kind: "d3/summary",
      version: 1,
    })
  })

  it("name their domain", () => {
    expect(domainOfKind("summary")).toBe("d1")
    expect(domainOfKind("d2/grade-row")).toBe("d2")
  })
})

describe("parseRows", () => {
  it("validates each row and reports a bad row with its line number", () => {
    const good = {
      $schema: "cwa-bench-d1/blob/v1",
      digest: `sha256:${"a".repeat(64)}`,
      path: `blobs/sha256/aa/${"a".repeat(64)}.json`,
      media_type: "application/json",
      bytes: 1,
    }
    const result = parseRows(
      "blob",
      [
        { line: 1, json: good },
        { line: 2, json: { ...good, bytes: -1 } },
        { line: 4, json: { $schema: "cwa-bench-d1/finding/v9" } },
        { line: 5, json: good },
      ],
      [{ line: 3, message: "Unexpected token" }],
    )
    expect(result.rows.map((row) => row.line)).toEqual([1, 5])
    expect(result.errors.map((error) => error.line)).toEqual([2, 3])
    expect(result.errors[0]?.message).toContain("/bytes")
    expect(result.unsupported).toEqual([{ line: 4, schema: "cwa-bench-d1/finding/v9" }])
  })
})

describe("schemaStringOf", () => {
  it("names what this build reads, with each kind's producer", () => {
    expect(schemaStringOf("summary")).toBe("cwa-bench-d1/summary/v1")
    expect(schemaStringOf("d2/summary")).toBe("cwa-bench-d2/summary/v1")
  })
})
