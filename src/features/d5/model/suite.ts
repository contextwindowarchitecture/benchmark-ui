// A Domain 5 suite's row files (the UI-D5 plan): every JSONL file the run index lists under the
// suite's directory, with its row count, the suite summary's results file first.

import type { D5RunIndexV1 } from "@/data/schema/generated"

export type SuiteRowFile = { path: string; kind: string; description: string; rows: number | null }

export function suiteRowFiles(
  index: D5RunIndexV1,
  suite: string,
  results?: string,
): SuiteRowFile[] {
  const files = index.files
    .filter((file) => file.path.startsWith(`suites/${suite}/`) && file.path.endsWith(".jsonl"))
    .map((file) => ({
      path: file.path,
      kind: file.kind,
      description: file.description,
      rows: file.rows ?? null,
    }))
  return files.sort((a, b) =>
    a.path === results ? -1 : b.path === results ? 1 : a.path.localeCompare(b.path),
  )
}
