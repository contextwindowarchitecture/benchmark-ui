// The answer explorer's view of one case (ui-plan.md 8.9): the rows of a suite that judge one
// snapshot, shaped by their kind into one answer per adapter, each with its parts (a base and a
// variant for a relation, one per cell for determinism) and the blobs it references.

import type { IndexedRow } from "@/data/row-store"
import { orderAdapters } from "@/lib/adapters"

import type { RowKind } from "./row-kinds"

export type BlobSlot = { label: string; digest: string | null }

export type HashEntry = { label: string; value: string | null }

export type AnswerPart = {
  /** What the part is, when an answer has several: "base", "variant", a cell, a check. */
  label: string | null
  outcome: string
  refusalReason: string | null
  exitCode: number | null
  inputTokens: number | null
  chargedTokens: number | null
  budgetInput: number | null
  wallMs: number | null
  auditFailed: string[]
  problem: string | null
  prediction: string | null
  blobs: BlobSlot[]
  hashes: HashEntry[]
  /** Determinism: whether the answer matched the reference, per aspect. */
  matches: { decision: boolean; payload: boolean | null; trace: boolean | null } | null
  applied: boolean | null
}

export type Check = { oracle: string; id: string; status: string; detail: string | null }

export type AnswerView = {
  adapter: string
  /** The row's judgment of this adapter's answer, as the kind calls it. */
  verdict: string | null
  checks: Check[]
  parts: AnswerPart[]
  /** The trace against the expected trace, when both are referenced. */
  diff: { actual: string; expected: string } | null
}

export type CaseView = {
  caseId: string
  kind: RowKind
  suite: string
  /** The snapshot's hex digest, for the timelines directory; null when the rows carry none. */
  snapshotHex: string | null
  blobs: BlobSlot[]
  hashes: HashEntry[]
  expected: { outcome: string; refusalReason: string | null } | null
  answers: AnswerView[]
  groups: string[][] | null
  agree: boolean | null
  verdict: string | null
  /** Rows the case has in the file; more than the answers when a kind has several per adapter. */
  rows: number
  /** The kind's note on what it keeps: hashes only, or blobs for failures. */
  note: string | null
}

const hexOf = (digest: string | null | undefined): string | null => {
  if (!digest) return null
  const hex = digest.startsWith("sha256:") ? digest.slice("sha256:".length) : digest
  return /^[0-9a-f]{64}$/.test(hex) ? hex : null
}

type RawAnswer = {
  adapter: string
  outcome: string
  exit_code: number | null
  refusal_reason: string | null
  payload_hash: string | null
  trace_hash: string | null
  input_tokens: number | null
  charged_tokens?: number | null
  audit_failed: string[]
  wall_ms: number
  problem: string | null
  trace: string | null
  payload: string | null
  prediction?: string
}

function partOfAnswer(answer: RawAnswer, label: string | null, budget: number | null): AnswerPart {
  return {
    label,
    outcome: answer.outcome,
    refusalReason: answer.refusal_reason,
    exitCode: answer.exit_code,
    inputTokens: answer.input_tokens,
    chargedTokens: answer.charged_tokens ?? null,
    budgetInput: budget,
    wallMs: answer.wall_ms,
    auditFailed: answer.audit_failed,
    problem: answer.problem,
    prediction: answer.prediction ?? null,
    blobs: [
      { label: "payload", digest: answer.payload },
      { label: "trace", digest: answer.trace },
    ],
    hashes: [
      { label: "payload hash", value: answer.payload_hash },
      { label: "trace hash", value: answer.trace_hash },
    ],
    matches: null,
    applied: null,
  }
}

const HASHES_NOTE =
  "Hashes only: the harness keeps blobs for the conformance and labeled suites and for failures."

function ordered(answers: Map<string, AnswerView>): AnswerView[] {
  return orderAdapters([...answers.keys()]).flatMap((id) => {
    const answer = answers.get(id)
    return answer ? [answer] : []
  })
}

/** The rows of one case as the explorer shows them; null when there is no row. */
export function caseView(kind: RowKind, rows: readonly IndexedRow<RowKind>[]): CaseView | null {
  const first = rows[0]
  if (!first) return null
  const caseId = first.fields.caseId
  const suite = first.fields.suite ?? ""
  const base: CaseView = {
    caseId,
    kind,
    suite,
    snapshotHex: null,
    blobs: [],
    hashes: [],
    expected: null,
    answers: [],
    groups: null,
    agree: null,
    verdict: null,
    rows: rows.length,
    note: null,
  }
  switch (kind) {
    case "result-row": {
      const answers = new Map<string, AnswerView>()
      let snapshot: string | null = null
      let expected: CaseView["expected"] = null
      for (const { document } of rows as IndexedRow<"result-row">[]) {
        snapshot ??= document.snapshot
        expected ??= document.expected_outcome
          ? { outcome: document.expected_outcome, refusalReason: null }
          : null
        const label =
          document.env_cell !== "baseline" || document.repetition > 0
            ? `${document.env_cell} · repetition ${document.repetition}`
            : null
        const part: AnswerPart = {
          label,
          outcome: document.outcome,
          refusalReason: document.refusal_reason,
          exitCode: document.exit_code,
          inputTokens: document.input_tokens,
          chargedTokens: document.charged_tokens,
          budgetInput: document.budget_input,
          wallMs: document.wall_ms,
          auditFailed: document.audit?.failed ?? [],
          problem: document.detail,
          prediction: null,
          blobs: [
            { label: "payload", digest: document.payload },
            { label: "trace", digest: document.trace },
            { label: "normalized trace", digest: document.trace_normalized },
            { label: "expected trace", digest: document.expected_trace },
            { label: "expected payload", digest: document.expected_payload },
            { label: "stderr", digest: document.stderr },
          ],
          hashes: [{ label: "payload hash", value: document.payload_hash }],
          matches: null,
          applied: null,
        }
        const answer = answers.get(document.adapter) ?? {
          adapter: document.adapter,
          verdict: document.verdict,
          checks: document.checks.map((check) => ({
            oracle: check.oracle,
            id: check.id,
            status: check.status,
            detail: check.detail ?? null,
          })),
          parts: [],
          diff:
            document.trace && document.expected_trace && document.trace !== document.expected_trace
              ? { actual: document.trace, expected: document.expected_trace }
              : null,
        }
        answer.parts.push(part)
        answers.set(document.adapter, answer)
      }
      return {
        ...base,
        snapshotHex: hexOf(snapshot),
        blobs: [{ label: "snapshot", digest: snapshot }],
        expected,
        answers: ordered(answers),
      }
    }
    case "determinism-row": {
      const answers = new Map<string, AnswerView>()
      for (const { document } of rows as IndexedRow<"determinism-row">[]) {
        const part: AnswerPart = {
          label: `${document.env_cell} · ${document.platform} · repetition ${document.repetition}`,
          outcome: document.outcome,
          refusalReason: document.refusal_reason,
          exitCode: document.exit_code,
          inputTokens: null,
          chargedTokens: null,
          budgetInput: null,
          wallMs: document.wall_ms,
          auditFailed: [],
          problem: document.not_applied_reason,
          prediction: null,
          blobs: [
            { label: "payload", digest: document.payload },
            { label: "trace", digest: document.trace },
          ],
          hashes: [
            { label: "payload hash", value: document.payload_hash },
            { label: "trace hash", value: document.trace_hash },
          ],
          matches: document.matches_reference,
          applied: document.applied,
        }
        const answer = answers.get(document.adapter) ?? {
          adapter: document.adapter,
          verdict: null,
          checks: [],
          parts: [],
          diff: null,
        }
        answer.parts.push(part)
        answers.set(document.adapter, answer)
      }
      const snapshot = (rows[0] as IndexedRow<"determinism-row">).document.snapshot
      return {
        ...base,
        snapshotHex: hexOf(snapshot),
        blobs: [{ label: "snapshot", digest: snapshot }],
        answers: ordered(answers),
        note: HASHES_NOTE,
      }
    }
    case "relation-row": {
      const document = (rows[0] as IndexedRow<"relation-row">).document
      const answers = new Map<string, AnswerView>()
      for (const judgment of document.judgments) {
        answers.set(judgment.adapter, {
          adapter: judgment.adapter,
          verdict: judgment.status,
          checks: [],
          parts: [
            partOfAnswer(judgment.base, "base", null),
            partOfAnswer(judgment.variant, "variant", null),
          ],
          diff: null,
        })
        const last = answers.get(judgment.adapter)
        if (last && judgment.detail) last.parts[1]!.problem = judgment.detail
      }
      return {
        ...base,
        caseId: document.seed.case_id,
        snapshotHex: hexOf(document.seed.snapshot_sha256),
        blobs: [
          { label: "base snapshot", digest: document.base },
          { label: "variant snapshot", digest: document.variant },
        ],
        hashes: [
          { label: "base sha256", value: document.base_sha256 },
          { label: "variant sha256", value: document.variant_sha256 },
        ],
        answers: ordered(answers),
        agree: document.variant_agree,
        verdict: document.verdict,
        note:
          rows.length > 1
            ? `${rows.length} relation instances share this seed; the first is shown.`
            : null,
      }
    }
    case "fuzz-row": {
      const document = (rows[0] as IndexedRow<"fuzz-row">).document
      return {
        ...base,
        snapshotHex: hexOf(document.snapshot_sha256),
        blobs: [{ label: "snapshot", digest: document.snapshot }],
        hashes: [{ label: "snapshot sha256", value: document.snapshot_sha256 }],
        expected: { outcome: document.expected, refusalReason: null },
        answers: ordered(
          new Map(
            document.answers.map((answer) => [
              answer.adapter,
              {
                adapter: answer.adapter,
                verdict: null,
                checks: [],
                parts: [partOfAnswer(answer, null, null)],
                diff: null,
              },
            ]),
          ),
        ),
        groups: document.groups,
        agree: document.agree,
        verdict: document.verdict,
        note: document.problems.length > 0 ? document.problems.join("; ") : null,
      }
    }
    case "scale-row": {
      const document = (rows[0] as IndexedRow<"scale-row">).document
      return {
        ...base,
        snapshotHex: hexOf(document.snapshot_sha256),
        hashes: [{ label: "snapshot sha256", value: document.snapshot_sha256 }],
        expected: document.expected.outcome
          ? { outcome: document.expected.outcome, refusalReason: document.expected.refusal_reason }
          : null,
        answers: ordered(
          new Map(
            document.answers.map((answer) => [
              answer.adapter,
              {
                adapter: answer.adapter,
                verdict: answer.prediction,
                checks: [],
                parts: [partOfAnswer(answer, null, document.budget_input)],
                diff: null,
              },
            ]),
          ),
        ),
        groups: document.groups,
        agree: document.agree,
        verdict: document.verdict,
        note:
          document.not_constructible ??
          (document.problems.length > 0 ? document.problems.join("; ") : null),
      }
    }
    case "summarizer-row": {
      const document = (rows[0] as IndexedRow<"summarizer-row">).document
      return {
        ...base,
        snapshotHex: hexOf(document.snapshot_sha256),
        blobs: [{ label: "frozen snapshot", digest: document.frozen }],
        hashes: [{ label: "snapshot sha256", value: document.snapshot_sha256 }],
        expected: {
          outcome: document.expected.outcome,
          refusalReason: document.expected.refusal_reason,
        },
        answers: ordered(
          new Map(
            document.answers.map((answer) => [
              answer.adapter,
              {
                adapter: answer.adapter,
                verdict: answer.prediction,
                checks: [],
                parts: [partOfAnswer(answer, null, document.budget_input)],
                diff: null,
              },
            ]),
          ),
        ),
        groups: document.groups,
        agree: document.agree,
        verdict: document.verdict,
      }
    }
    case "drift-row": {
      const answers = new Map<string, AnswerView>()
      for (const { document } of rows as IndexedRow<"drift-row">[]) {
        const side = (
          label: string,
          value: {
            outcome: string
            refusal_reason: string | null
            payload_hash: string | null
            trace_hash: string | null
          },
        ): AnswerPart => ({
          label,
          outcome: value.outcome,
          refusalReason: value.refusal_reason,
          exitCode: null,
          inputTokens: null,
          chargedTokens: null,
          budgetInput: null,
          wallMs: null,
          auditFailed: [],
          problem: null,
          prediction: null,
          blobs: [],
          hashes: [
            { label: "payload hash", value: value.payload_hash },
            { label: "trace hash", value: value.trace_hash },
          ],
          matches: null,
          applied: null,
        })
        answers.set(document.adapter, {
          adapter: document.adapter,
          verdict: document.drift,
          checks: [],
          parts: [
            ...(document.golden ? [side("golden", document.golden)] : []),
            side("actual", document.actual),
          ],
          diff: null,
        })
      }
      const snapshot = (rows[0] as IndexedRow<"drift-row">).document.snapshot
      return {
        ...base,
        snapshotHex: hexOf(snapshot),
        blobs: [{ label: "snapshot", digest: snapshot }],
        answers: ordered(answers),
        note: HASHES_NOTE,
      }
    }
    case "self-check": {
      const parts: AnswerPart[] = (rows as IndexedRow<"self-check">[]).map(({ document }) => ({
        label: `${document.check}${document.operator ? ` · ${document.operator}` : ""}${document.position ? ` · ${document.position}` : ""}`,
        outcome: document.status,
        refusalReason: null,
        exitCode: null,
        inputTokens: null,
        chargedTokens: null,
        budgetInput: null,
        wallMs: null,
        auditFailed: document.killed_by,
        problem: document.detail,
        prediction: null,
        blobs: [
          { label: "payload", digest: document.payload },
          { label: "trace", digest: document.trace },
        ],
        hashes: [],
        matches: null,
        applied: null,
      }))
      return {
        ...base,
        answers: [{ adapter: "harness", verdict: null, checks: [], parts, diff: null }],
        note: "S0 checks the harness itself: there is no adapter, each part is one check of the case.",
      }
    }
    case "finding":
    case "blob":
      return null
  }
}

/** Where the timeline of this snapshot for an adapter would be (ui-plan.md 4.2). */
export function timelinePath(snapshotHex: string, adapter: string): string {
  return `timelines/${snapshotHex}/${adapter}.json`
}
