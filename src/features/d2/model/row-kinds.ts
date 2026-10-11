// What each of Domain 2's row kinds calls its case, its arm, its family, its tier and its judgment
// (the UI-D2 plan), so the rows store, its filters and its worker serve Domain 2's files as they
// serve Domain 1's. Nothing here reads a field the schema does not promise.

import type { RowFields } from "@/data/row-fields"
import type { DocumentByKind } from "@/data/schema/generated"

export const D2_ROW_KINDS = [
  "d2/self-check",
  "d2/turn-row",
  "d2/baseline-row",
  "d2/lq-gate-row",
  "d2/lq-baseline-row",
  "d2/grade-row",
  "d2/lq-grade-row",
  "d2/chain-row",
  "d2/drift-row",
  "d2/call-row",
  "d2/producer-row",
  "d2/finding",
  "d2/blob",
] as const

export type D2RowKind = (typeof D2_ROW_KINDS)[number]

export type D2RowOf<K extends D2RowKind> = DocumentByKind[K]

export function isD2RowKind(kind: string): kind is D2RowKind {
  return (D2_ROW_KINDS as readonly string[]).includes(kind)
}

/** What a kind calls its judgment column. */
export const D2_VERDICT_LABELS: Record<D2RowKind, string> = {
  "d2/self-check": "Status",
  "d2/turn-row": "Verdict",
  "d2/baseline-row": "Outcome",
  "d2/lq-gate-row": "Verdict",
  "d2/lq-baseline-row": "Outcome",
  "d2/grade-row": "Grade",
  "d2/lq-grade-row": "Grade",
  "d2/chain-row": "Outcome",
  "d2/drift-row": "Drift",
  "d2/call-row": "Cache",
  "d2/producer-row": "Cache",
  "d2/finding": "Severity",
  "d2/blob": "Media type",
}

const isBlobRef = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.startsWith("sha256:")

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

const cache = (hit: boolean) => (hit ? "hit" : "miss")

const NONE = {
  adapters: [],
  outcomes: [],
  tags: [],
  hasBlobs: false,
  findings: [],
  oracle: null,
  arm: null,
  family: null,
  tier: null,
} as const satisfies Partial<RowFields>

export function d2RowFields(kind: D2RowKind, row: D2RowOf<D2RowKind>): RowFields {
  switch (kind) {
    case "d2/self-check": {
      const r = row as D2RowOf<"d2/self-check">
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.check} ${r.subject} ${r.conversation ?? ""}`,
        verdict: r.status,
        tags: [r.check],
        suite: r.suite,
      }
    }
    case "d2/turn-row":
    case "d2/lq-gate-row": {
      const r = row as D2RowOf<"d2/turn-row"> | D2RowOf<"d2/lq-gate-row">
      const where = "conversation" in r ? r.conversation : r.corpus
      const point = "point" in r ? r.point : "question"
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.case_id} ${where} ${point}`,
        adapters: unique(r.answers.map((answer) => answer.adapter)),
        verdict: r.verdict,
        outcomes: unique(r.answers.map((answer) => answer.outcome)),
        tags: [point],
        hasBlobs: isBlobRef(r.snapshot),
        findings: r.findings,
        suite: r.suite,
        arm: r.arm,
        family: r.family,
        tier: r.tier,
      }
    }
    case "d2/baseline-row":
    case "d2/lq-baseline-row": {
      const r = row as D2RowOf<"d2/baseline-row"> | D2RowOf<"d2/lq-baseline-row">
      const where = "conversation" in r ? r.conversation : r.corpus
      const point = "point" in r ? r.point : "question"
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.case_id} ${where} ${point}`,
        verdict: r.outcome,
        outcomes: [r.outcome],
        tags: [point],
        suite: r.suite,
        arm: r.arm,
        family: r.family,
        tier: r.tier,
      }
    }
    case "d2/grade-row": {
      const r = row as D2RowOf<"d2/grade-row">
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.conversation} ${r.task} ${r.reply ?? ""}`,
        verdict: r.verdict,
        tags: [r.task, ...(r.rule ? [r.rule] : [])],
        suite: r.suite,
        arm: r.arm,
        family: r.family,
        tier: r.tier,
      }
    }
    case "d2/lq-grade-row": {
      const r = row as D2RowOf<"d2/lq-grade-row">
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.corpus} ${r.attribute} ${r.reply ?? ""}`,
        verdict: r.verdict,
        tags: [r.kind, r.format],
        suite: r.suite,
        arm: r.arm,
        family: r.family,
        tier: r.tier,
      }
    }
    case "d2/chain-row": {
      const r = row as D2RowOf<"d2/chain-row">
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.chain} ${r.reply ?? ""}`,
        verdict: r.outcome,
        outcomes: [r.outcome],
        suite: r.suite,
        arm: r.arm,
        family: r.family,
        tier: r.tier,
      }
    }
    case "d2/drift-row": {
      const r = row as D2RowOf<"d2/drift-row">
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.case_id} ${r.fields.join(" ")}`,
        adapters: [r.adapter],
        verdict: r.drift,
        outcomes: unique([r.actual.outcome, ...(r.golden ? [r.golden.outcome] : [])]),
        hasBlobs: isBlobRef(r.snapshot),
        findings: r.finding ? [r.finding] : [],
        suite: r.suite,
      }
    }
    case "d2/call-row": {
      const r = row as D2RowOf<"d2/call-row">
      return {
        ...NONE,
        caseId: r.key,
        searchText: `${r.key} ${r.suite}`,
        verdict: cache(r.cache_hit),
        suite: r.suite,
      }
    }
    case "d2/producer-row": {
      const r = row as D2RowOf<"d2/producer-row">
      return {
        ...NONE,
        caseId: r.key,
        searchText: `${r.key} ${r.conversation} ${r.producer}`,
        verdict: cache(r.cache_hit),
        tags: [r.producer],
        suite: null,
      }
    }
    case "d2/finding": {
      const r = row as D2RowOf<"d2/finding">
      return {
        ...NONE,
        caseId: r.case_id,
        searchText: `${r.finding_id} ${r.case_id} ${r.summary} ${r.suite} ${r.checks.join(" ")}`,
        adapters: r.adapter ? [r.adapter] : (r.adapters ?? []),
        verdict: r.severity,
        tags: r.requirements,
        hasBlobs: r.reproducer !== null,
        findings: [r.finding_id],
        suite: r.suite,
        oracle: r.oracle,
      }
    }
    case "d2/blob": {
      const r = row as D2RowOf<"d2/blob">
      return {
        ...NONE,
        caseId: r.digest,
        searchText: `${r.digest} ${r.path}`,
        verdict: r.media_type,
        suite: null,
      }
    }
  }
}

/** An open value ("any JSON value") as the text it is: a string as written, the rest as JSON. */
export function jsonText(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "string") return value
  return JSON.stringify(value)
}
