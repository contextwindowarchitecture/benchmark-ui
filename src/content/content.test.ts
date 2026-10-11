// @vitest-environment node
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  CONTENT_SOURCE,
  DEFECTS,
  DOMAINS,
  filterGlossary,
  GLOSSARY,
  glossaryEntry,
  LANES,
  PLANES,
  sourceUrl,
  TRUST,
  WHAT_CWA_IS,
} from "./index"
import {
  CONCLUSION as D2_CONCLUSION,
  CONCLUSIONS as D2_CONCLUSIONS,
  CORRECTIONS as D2_CORRECTIONS,
  JUDGING as D2_JUDGING,
  QUESTION as D2_QUESTION,
  SCOPE as D2_SCOPE,
  TRUST as D2_TRUST,
} from "./d2/trust"
import {
  armGroup,
  ARMS,
  armWords,
  compareArms,
  FAMILIES,
  familyWords,
  SUITES,
  suiteWords,
} from "./d2/vocabulary"

const root = resolve(import.meta.dirname, "../..")

describe("the content files", () => {
  it("cite the benchmark commit the vendor lock pins, so a moved pin forces a re-read", async () => {
    const lock = JSON.parse(
      await readFile(resolve(root, "vendor/cwa-bench.lock.json"), "utf8"),
    ) as {
      repository: string
      commit: string
    }
    expect(CONTENT_SOURCE.repository).toBe(lock.repository)
    expect(CONTENT_SOURCE.commit).toBe(lock.commit)
    expect(sourceUrl("docs/domain1.md")).toBe(
      `https://github.com/${lock.repository}/blob/${lock.commit}/docs/domain1.md`,
    )
  })

  it("quote files the vendored copy holds", async () => {
    const files = new Set([
      ...DOMAINS.map((domain) => domain.citation.file),
      ...DOMAINS.flatMap((domain) => (domain.writeUp ? [domain.writeUp.file] : [])),
    ])
    for (const file of files) {
      await expect(readFile(resolve(root, "vendor/cwa-bench", file), "utf8")).resolves.toBeTruthy()
    }
  })

  it("hold words, not values: one claim per domain, three sentences on CWA", () => {
    expect(WHAT_CWA_IS).toHaveLength(3)
    expect(DOMAINS.map((domain) => domain.id)).toEqual(["d1", "d2", "d3", "d4", "d5"])
    for (const domain of DOMAINS) {
      expect(domain.claim.endsWith(".")).toBe(true)
      expect(domain.design.length).toBeGreaterThan(0)
    }
    // Domains 1 and 2 have write-ups.
    expect(DOMAINS.filter((domain) => domain.writeUp).map((domain) => domain.id)).toEqual([
      "d1",
      "d2",
    ])
  })

  it("name the eight lanes of the timeline schema, in its order", async () => {
    const schema = JSON.parse(
      await readFile(
        resolve(root, "vendor/cwa-bench/domain1/schemas/timeline.v1.schema.json"),
        "utf8",
      ),
    ) as { properties: { events: { items: { properties: { stage: { enum: string[] } } } } } }
    expect(LANES.map((lane) => lane.lane)).toEqual(
      schema.properties.events.items.properties.stage.enum,
    )
    expect(PLANES.map((plane) => plane.id)).toEqual([
      "governance",
      "state",
      "evidence",
      "interaction",
    ])
  })

  it("point each defect at an https issue and at findings of the run that recorded it", async () => {
    expect(DEFECTS).toHaveLength(5)
    const findings = new Map<string, Set<string>>()
    for (const defect of DEFECTS) {
      expect(defect.issue.url.startsWith("https://")).toBe(true)
      for (const pointer of defect.findings) {
        const set = findings.get(pointer.run) ?? new Set<string>()
        set.add(pointer.finding)
        findings.set(pointer.run, set)
      }
    }
    // The pointers are ids of the failing fixture run's findings, each naming the same issue.
    for (const [run, ids] of findings) {
      const lines = (
        await readFile(
          resolve(root, "vendor/cwa-bench/domain1/fixtures/runs", run, "findings.jsonl"),
          "utf8",
        )
      )
        .trim()
        .split("\n")
        .map(
          (line) => JSON.parse(line) as { finding_id: string; upstream?: { url: string } | null },
        )
      for (const id of ids) {
        const row = lines.find((line) => line.finding_id === id)
        expect(row, `${id} in ${run}`).toBeDefined()
        const defect = DEFECTS.find((d) => d.findings.some((p) => p.finding === id))
        expect(row?.upstream?.url).toBe(defect?.issue.url)
      }
    }
    expect(TRUST.length).toBeGreaterThanOrEqual(6)
  })

  it("define each glossary term once, link only to terms that exist, and quote vendored files", async () => {
    const ids = GLOSSARY.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(GLOSSARY.map((entry) => entry.term.toLowerCase())).size).toBe(ids.length)
    // The terms the glossary was asked for.
    for (const id of ["oracle", "metamorphic-relation", "generative-fuzzing", "golden"]) {
      expect(glossaryEntry(id)?.group).toBe("benchmark")
    }
    // An id is the term's anchor on the page, beside the shell's and the page's own ids.
    for (const taken of ["page", "page-title", "main-content", "architecture", "benchmark"]) {
      expect(ids).not.toContain(taken)
    }
    for (const entry of GLOSSARY) {
      expect(entry.id).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(entry.text.endsWith("."), entry.id).toBe(true)
      for (const id of entry.see ?? []) {
        expect(glossaryEntry(id), `${entry.id} sees ${id}`).toBeDefined()
        expect(id).not.toBe(entry.id)
      }
      await expect(
        readFile(resolve(root, "vendor/cwa-bench", entry.citation.file), "utf8"),
      ).resolves.toBeTruthy()
    }
  })

  it("keep numbers out of the glossary's words: identifiers only", () => {
    // Domain, requirement, auditor-check, relation and suite ids name things, as do the study's
    // metric names (A90, U90−10) and the percentiles that define them; any other digit is a value.
    const identifiers = /\b(?:Domain |R-|A|MR|S)\d+\b|\bU\d+−\d+|\b\d+th\b/g
    for (const entry of GLOSSARY) {
      expect(entry.text.replace(identifiers, ""), entry.id).not.toMatch(/\d/)
    }
  })

  it("filter the glossary by term, other names and words, ignoring case", () => {
    expect(filterGlossary(GLOSSARY, "")).toBe(GLOSSARY)
    expect(filterGlossary(GLOSSARY, "  GOLDENS ").map((entry) => entry.id)).toContain("golden")
    expect(filterGlossary(GLOSSARY, "cwabench").map((entry) => entry.id)).toContain("harness")
    expect(filterGlossary(GLOSSARY, "no such word")).toHaveLength(0)
  })

  it("name every arm, family and suite Domain 2's fixture records, in words without values", async () => {
    const run = resolve(root, "vendor/cwa-bench/domain2/fixtures/runs", "20261011T161204Z-9c870cd")
    const summary = JSON.parse(await readFile(resolve(run, "summary.json"), "utf8")) as {
      suites: { id: string }[]
      metrics: { arm: string | null; family: string | null }[]
    }
    const arms = new Set(summary.metrics.flatMap((m) => (m.arm ? [m.arm] : [])))
    expect(arms.size).toBeGreaterThan(10)
    for (const arm of arms) expect(armWords(arm), arm).toBeDefined()
    for (const family of ["vt", "fr", "cc", "ip", "lq"]) {
      expect(familyWords(family), family).toBeDefined()
    }
    for (const suite of summary.suites) expect(suiteWords(suite.id), suite.id).toBeDefined()
    expect(new Set(ARMS.map((arm) => arm.id)).size).toBe(ARMS.length)
    expect([...ARMS].sort((a, b) => compareArms(a.id, b.id))).toEqual(ARMS)
    expect(armGroup("cwa-something-new")).toBe("cwa")

    const identifiers = /\b(?:Domain |S|R-)\d+\b/g
    const words = [
      ...ARMS.map((arm) => `${arm.payload} ${arm.role ?? ""}`),
      ...FAMILIES.map((family) => `${family.does} ${family.asks}`),
      ...SUITES.map((suite) => suite.text),
      ...[...D2_CONCLUSIONS, ...D2_TRUST, ...D2_JUDGING, ...D2_CORRECTIONS].map(
        (note) => `${note.title} ${note.text}`,
      ),
      D2_CONCLUSION,
      D2_QUESTION.question,
      D2_QUESTION.heldEqual,
      ...D2_SCOPE.measures,
      ...D2_SCOPE.doesNot,
    ]
    for (const text of words) expect(text.replace(identifiers, ""), text).not.toMatch(/\d/)
  })
})
