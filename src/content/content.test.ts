// @vitest-environment node
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  CONTENT_SOURCE,
  DEFECTS,
  DOMAINS,
  LANES,
  PLANES,
  sourceUrl,
  TRUST,
  WHAT_CWA_IS,
} from "./index"

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
    // Only Domain 1 has a write-up.
    expect(DOMAINS.filter((domain) => domain.writeUp).map((domain) => domain.id)).toEqual(["d1"])
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
})
