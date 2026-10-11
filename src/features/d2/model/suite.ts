// Pure selectors for a Domain 2 suite page (the UI-D2 plan): which of the run's row files belong
// to the suite, as the run index lists them with their kind and row count, and which script
// indexes a run lists. The suite summary's typed blocks are read in blocks.ts.

import type { D2RunIndexV1 } from "@/data/schema/generated"
import { parseSchemaString } from "@/data/validate"

import { isD2RowKind, type D2RowKind } from "./row-kinds"

export type SuiteRowFile = {
  path: string
  kind: D2RowKind
  rows: number | undefined
  description: string
}

/**
 * The suite's row files, the one its summary names as its results first: those under `suites/<S>/`,
 * then the model calls it made (`model/calls.jsonl` is S2's, `model/s<n>-calls.jsonl` another
 * suite's) and, for S1, the producers' calls, whose output the CWA arms' state and the summary
 * baseline are built from.
 */
export function suiteRowFiles(
  index: D2RunIndexV1,
  suite: string,
  results?: string,
): SuiteRowFile[] {
  const callsPath =
    suite === "S2" ? "model/calls.jsonl" : `model/${suite.toLowerCase()}-calls.jsonl`
  const own = (path: string) => path.startsWith(`suites/${suite}/`)
  const belongs = (path: string) =>
    own(path) || path === callsPath || (suite === "S1" && path === "producers/calls.jsonl")
  const rank = (path: string) => (path === results ? 0 : own(path) ? 1 : 2)
  return index.files
    .flatMap((file): SuiteRowFile[] => {
      if (!belongs(file.path) || !file.path.endsWith(".jsonl")) return []
      const ref = parseSchemaString(file.schema)
      if (!ref || !isD2RowKind(ref.kind)) return []
      return [{ path: file.path, kind: ref.kind, rows: file.rows, description: file.description }]
    })
    .sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path))
}

/** The scripts and corpora a run's index lists, by the kind it names them with. */
export function scriptFiles(index: D2RunIndexV1): { conversations: string[]; corpora: string[] } {
  return {
    conversations: index.files.filter((f) => f.kind === "conversation-index").map((f) => f.path),
    corpora: index.files.filter((f) => f.kind === "lq-index").map((f) => f.path),
  }
}
