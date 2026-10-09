// Pure selectors for the findings pages (ui-plan.md 8.6): where a finding's files are, and the
// open records (signature, sizes) shown as the key-value lists they are, never interpreted.

import type { FindingV1, MinimizationV1, RunIndexV1 } from "@/data/schema/generated"

export function findingsFile(index: RunIndexV1): RunIndexV1["files"][number] | undefined {
  return index.files.find((file) => file.path === "findings.jsonl")
}

/** The minimization record of a finding, when the harness minimized it. */
export function minimizationPath(finding: FindingV1): string | null {
  return finding.minimized ? `${finding.minimized.path}/minimization.json` : null
}

export type DraftFile = {
  name: string
  path: string
  /** Whether the run index lists it (a fixture may have trimmed it). */
  listed: boolean
  /** The schema the run index records for it, the spec's own, never one this viewer reads. */
  schema: string | null
}

/** The draft's files as the minimization record names them, with what the run index says of each. */
export function draftFiles(index: RunIndexV1, minimization: MinimizationV1): DraftFile[] {
  return minimization.draft.files.map((name) => {
    const path = `${minimization.draft.path}/${name}`
    const entry = index.files.find((file) => file.path === path)
    return { name, path, listed: entry !== undefined, schema: entry?.schema ?? null }
  })
}

export type Entry = { key: string; value: string }

/** An open record as text, key by key, for the signature and the sizes; nothing is read by name. */
export function entriesOf(record: { [k: string]: unknown } | undefined): Entry[] {
  if (!record) return []
  return Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : (JSON.stringify(value) ?? ""),
    }))
}

export type SizeRow = { key: string; before: string | null; after: string | null }

/** The before and after sizes side by side, over the union of their keys. */
export function sizeRows(minimization: MinimizationV1): SizeRow[] {
  const before = new Map(entriesOf(minimization.before).map((e) => [e.key, e.value]))
  const after = new Map(entriesOf(minimization.after).map((e) => [e.key, e.value]))
  const keys = [...new Set([...before.keys(), ...after.keys()])]
  return keys.map((key) => ({
    key,
    before: before.get(key) ?? null,
    after: after.get(key) ?? null,
  }))
}

/** The suite page's rows filtered to those carrying the finding. */
export function findingRowsPath(runId: string, finding: FindingV1): string {
  return `/d1/runs/${runId}/suites/${finding.suite}?finding=${encodeURIComponent(finding.finding_id)}`
}
