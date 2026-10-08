// What each row kind calls its case, its adapters, its judgment and its outcomes (ui-plan.md 4.2,
// 8.4), so one rows table, one set of filters and one worker serve the eight kinds. Nothing here
// reads a field the schema does not promise, and the worker imports it too, so the main thread and
// the worker agree on what a filter means.

import type { DocumentByKind } from "@/data/schema/generated"

export const ROW_KINDS = [
  "result-row",
  "determinism-row",
  "relation-row",
  "fuzz-row",
  "scale-row",
  "summarizer-row",
  "drift-row",
  "self-check",
] as const

export type RowKind = (typeof ROW_KINDS)[number]

export type RowOf<K extends RowKind> = DocumentByKind[K]

export function isRowKind(kind: string): kind is RowKind {
  return (ROW_KINDS as readonly string[]).includes(kind)
}

/** The fields the filters, the facets, the search and the explorer link key on. */
export type RowFields = {
  /** The case the row judges, for the search and the answer explorer's address. */
  caseId: string
  /** What the search matches besides the case id: a relation, an operator, a check, a cell. */
  searchText: string
  /** The adapters the row names: one for a per-adapter row, every answering adapter otherwise. */
  adapters: string[]
  /** The row's judgment, as its kind calls it: a verdict, a status or a drift kind. */
  verdict: string
  /** The outcomes the row records, one per answer, de-duplicated. */
  outcomes: string[]
  tags: string[]
  /** A snapshot, payload or trace blob is referenced, so the answer explorer has something to show. */
  hasBlobs: boolean
  /** The findings the row names. */
  findings: string[]
}

/** What a kind calls its judgment column. */
export const VERDICT_LABELS: Record<RowKind, string> = {
  "result-row": "Verdict",
  "determinism-row": "Outcome",
  "relation-row": "Verdict",
  "fuzz-row": "Verdict",
  "scale-row": "Verdict",
  "summarizer-row": "Verdict",
  "drift-row": "Drift",
  "self-check": "Status",
}

const isBlobRef = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.startsWith("sha256:")

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

type Answer = { adapter: string; outcome: string; payload: string | null; trace: string | null }

function answersFields(answers: readonly Answer[]): Pick<RowFields, "adapters" | "outcomes"> & {
  blobs: boolean
} {
  return {
    adapters: unique(answers.map((answer) => answer.adapter)),
    outcomes: unique(answers.map((answer) => answer.outcome)),
    blobs: answers.some((answer) => isBlobRef(answer.payload) || isBlobRef(answer.trace)),
  }
}

export function rowFields(kind: RowKind, row: RowOf<RowKind>): RowFields {
  switch (kind) {
    case "result-row": {
      const r = row as RowOf<"result-row">
      return {
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.corpus} ${r.env_cell}`,
        adapters: [r.adapter],
        verdict: r.verdict,
        outcomes: [r.outcome],
        tags: r.coverage_tags,
        hasBlobs: isBlobRef(r.snapshot) || isBlobRef(r.payload) || isBlobRef(r.trace),
        findings: r.finding ? [r.finding] : [],
      }
    }
    case "determinism-row": {
      const r = row as RowOf<"determinism-row">
      return {
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.corpus} ${r.env_cell} ${r.platform}`,
        adapters: [r.adapter],
        // A determinism row has no verdict of its own: the cell's fractions judge it (the summary's
        // `cells[]`); its outcome is what a reader filters by.
        verdict: r.outcome,
        outcomes: [r.outcome],
        tags: [],
        hasBlobs: isBlobRef(r.payload) || isBlobRef(r.trace),
        findings: r.finding ? [r.finding] : [],
      }
    }
    case "relation-row": {
      const r = row as RowOf<"relation-row">
      const sides = r.judgments.flatMap((j) => [j.base, j.variant])
      return {
        caseId: r.seed.case_id,
        searchText: `${r.seed.case_id} ${r.relation} ${r.kind} ${r.title} ${r.seed.corpus}`,
        adapters: unique(r.judgments.map((j) => j.adapter)),
        verdict: r.verdict,
        outcomes: unique(sides.map((side) => side.outcome)),
        tags: [],
        hasBlobs:
          isBlobRef(r.base) ||
          isBlobRef(r.variant) ||
          sides.some((side) => isBlobRef(side.payload) || isBlobRef(side.trace)),
        findings: r.findings,
      }
    }
    case "fuzz-row": {
      const r = row as RowOf<"fuzz-row">
      const answers = answersFields(r.answers)
      return {
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.corpus} ${r.mutation?.operator ?? ""} ${r.intents.join(" ")}`,
        adapters: answers.adapters,
        verdict: r.verdict,
        outcomes: answers.outcomes,
        tags: r.coverage_tags,
        hasBlobs: isBlobRef(r.snapshot) || answers.blobs,
        findings: r.findings,
      }
    }
    case "scale-row": {
      const r = row as RowOf<"scale-row">
      const answers = answersFields(r.answers)
      return {
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.cell.shape} ${r.label} ${r.cell.tokenizer} ${r.cell.renderer}`,
        adapters: answers.adapters,
        verdict: r.verdict,
        outcomes: answers.outcomes,
        tags: r.coverage_tags,
        hasBlobs: answers.blobs,
        findings: r.findings,
      }
    }
    case "summarizer-row": {
      const r = row as RowOf<"summarizer-row">
      const answers = answersFields(r.answers)
      return {
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.arm} ${r.purposes.join(" ")}`,
        adapters: answers.adapters,
        verdict: r.verdict,
        outcomes: answers.outcomes,
        tags: [],
        hasBlobs: isBlobRef(r.frozen) || answers.blobs,
        findings: r.findings,
      }
    }
    case "drift-row": {
      const r = row as RowOf<"drift-row">
      return {
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.fields.join(" ")}`,
        adapters: [r.adapter],
        verdict: r.drift,
        outcomes: unique([r.actual.outcome, ...(r.golden ? [r.golden.outcome] : [])]),
        tags: [],
        hasBlobs: isBlobRef(r.snapshot),
        findings: r.finding ? [r.finding] : [],
      }
    }
    case "self-check": {
      const r = row as RowOf<"self-check">
      return {
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.check} ${r.operator ?? ""} ${r.position ?? ""}`,
        adapters: [],
        verdict: r.status,
        outcomes: [],
        tags: [],
        hasBlobs: isBlobRef(r.payload) || isBlobRef(r.trace),
        findings: [],
      }
    }
  }
}
