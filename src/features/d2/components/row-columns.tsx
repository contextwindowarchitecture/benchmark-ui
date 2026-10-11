// The columns of each of Domain 2's row kinds (the UI-D2 plan): enough to read one judged thing
// per row, the arm and tier it was measured at, and the judgment, with the rest of the row in the
// file to download. Typed fields only; a field the schema leaves open ("any JSON value") is shown
// as the text it is, never read by name.

import type { ReactNode } from "react"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { IndexedRow } from "@/data/row-store"
import type { D2RowKind, D2RowOf } from "@/features/d2/model/row-kinds"
import { tierLabel } from "@/features/d2/model/metrics"
import { jsonText } from "@/features/d2/model/row-kinds"
import { formatCount, formatMs, shortDigest } from "@/lib/format"

import { ArmLabel } from "./arm-label"
import { Fact, Text } from "./row-cells"

export type D2Column = {
  id: string
  label: string
  className?: string
  cell: (row: IndexedRow<D2RowKind>) => ReactNode
}

const doc = <K extends D2RowKind>(row: IndexedRow<D2RowKind>) => row.document as D2RowOf<K>

const caseColumn: D2Column = {
  id: "case",
  label: "Case",
  cell: (row) => <span className="font-mono text-xs break-all">{row.fields.caseId}</span>,
}

const armColumn: D2Column = {
  id: "arm",
  label: "Arm",
  cell: (row) => (row.fields.arm ? <ArmLabel arm={row.fields.arm} /> : "—"),
}

const tierColumn: D2Column = {
  id: "tier",
  label: "Tier",
  className: "text-xs whitespace-nowrap",
  cell: (row) => (row.fields.tier ? tierLabel(row.fields.tier) : "—"),
}

const verdictColumn = (label: string): D2Column => ({
  id: "verdict",
  label,
  cell: (row) => <StatusBadge status={row.fields.verdict} />,
})

const tokens = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : formatCount(value)

const COLUMNS: Record<D2RowKind, D2Column[]> = {
  "d2/grade-row": [
    caseColumn,
    armColumn,
    tierColumn,
    {
      id: "expected",
      label: "Expected",
      cell: (row) => <Text value={jsonText(doc<"d2/grade-row">(row).expected)} mono />,
    },
    { id: "reply", label: "Reply", cell: (row) => <Text value={doc<"d2/grade-row">(row).reply} /> },
    verdictColumn("Grade"),
    {
      id: "fact",
      label: "Fact",
      cell: (row) => <Fact present={doc<"d2/grade-row">(row).fact_present} />,
    },
    {
      id: "rule",
      label: "Rule",
      className: "text-xs",
      cell: (row) => {
        const r = doc<"d2/grade-row">(row)
        if (!r.rule) return <span className="text-muted-foreground">—</span>
        return `${r.rule}: ${r.compliant === null ? "no reply" : r.compliant ? "followed" : "broken"}`
      },
    },
    {
      id: "tokens",
      label: "Input tokens",
      className: "tabular text-right",
      cell: (row) => tokens(doc<"d2/grade-row">(row).input_tokens),
    },
  ],
  "d2/lq-grade-row": [
    caseColumn,
    armColumn,
    tierColumn,
    {
      id: "question",
      label: "Question",
      className: "text-xs",
      cell: (row) => {
        const r = doc<"d2/lq-grade-row">(row)
        return `${r.kind}, ${r.format}: ${r.attribute}`
      },
    },
    {
      id: "expected",
      label: "Expected",
      cell: (row) => <Text value={jsonText(doc<"d2/lq-grade-row">(row).expected)} mono />,
    },
    {
      id: "reply",
      label: "Reply",
      cell: (row) => <Text value={doc<"d2/lq-grade-row">(row).reply} />,
    },
    verdictColumn("Grade"),
    {
      id: "fact",
      label: "Fact",
      cell: (row) => <Fact present={doc<"d2/lq-grade-row">(row).fact_present} />,
    },
    {
      id: "tokens",
      label: "Input tokens",
      className: "tabular text-right",
      cell: (row) => tokens(doc<"d2/lq-grade-row">(row).input_tokens),
    },
  ],
  "d2/turn-row": [
    caseColumn,
    armColumn,
    tierColumn,
    {
      id: "expected",
      label: "Predicted",
      className: "text-xs",
      cell: (row) => {
        const e = doc<"d2/turn-row">(row).expected
        return `${e.outcome}${e.input_tokens === null ? "" : `, ${formatCount(e.input_tokens)} tokens`}, ${formatCount(e.included)} items`
      },
    },
    {
      id: "agree",
      label: "Adapters",
      className: "text-xs",
      cell: (row) => {
        const r = doc<"d2/turn-row">(row)
        return `${r.answers.filter((a) => a.matches_prediction).length} of ${r.answers.length} as predicted${r.agree ? ", agree" : ", disagree"}`
      },
    },
    {
      id: "fact",
      label: "Fact",
      cell: (row) => <Fact present={doc<"d2/turn-row">(row).fact?.present} />,
    },
    verdictColumn("Verdict"),
  ],
  "d2/lq-gate-row": [
    caseColumn,
    armColumn,
    tierColumn,
    {
      id: "expected",
      label: "Predicted",
      className: "text-xs",
      cell: (row) => {
        const r = doc<"d2/lq-gate-row">(row)
        return `${r.expected.outcome}, ${formatCount(r.expected.included)} of ${formatCount(r.candidates)} candidates`
      },
    },
    {
      id: "agree",
      label: "Adapters",
      className: "text-xs",
      cell: (row) => {
        const r = doc<"d2/lq-gate-row">(row)
        return `${r.answers.filter((a) => a.matches_prediction).length} of ${r.answers.length} as predicted${r.agree ? ", agree" : ", disagree"}`
      },
    },
    {
      id: "fact",
      label: "Fact",
      cell: (row) => <Fact present={doc<"d2/lq-gate-row">(row).fact?.present} />,
    },
    verdictColumn("Verdict"),
  ],
  "d2/baseline-row": [
    caseColumn,
    armColumn,
    tierColumn,
    verdictColumn("Outcome"),
    {
      id: "kept",
      label: "History kept",
      className: "tabular text-right text-xs",
      cell: (row) => {
        const h = doc<"d2/baseline-row">(row).history
        return `${formatCount(h.kept)} of ${formatCount(h.total)}`
      },
    },
    {
      id: "system",
      label: "System prompt",
      className: "text-xs",
      cell: (row) => (doc<"d2/baseline-row">(row).system_survived ? "kept" : "dropped"),
    },
    {
      id: "fact",
      label: "Fact",
      cell: (row) => <Fact present={doc<"d2/baseline-row">(row).fact?.present} />,
    },
    {
      id: "tokens",
      label: "Input tokens",
      className: "tabular text-right",
      cell: (row) => tokens(doc<"d2/baseline-row">(row).input_tokens),
    },
  ],
  "d2/lq-baseline-row": [
    caseColumn,
    armColumn,
    tierColumn,
    verdictColumn("Outcome"),
    {
      id: "kept",
      label: "Chunks kept",
      className: "tabular text-right text-xs",
      cell: (row) => {
        const r = doc<"d2/lq-baseline-row">(row)
        return `${formatCount(r.kept)} of ${formatCount(r.offered)}`
      },
    },
    {
      id: "fact",
      label: "Fact",
      cell: (row) => <Fact present={doc<"d2/lq-baseline-row">(row).fact?.present} />,
    },
    {
      id: "tokens",
      label: "Input tokens",
      className: "tabular text-right",
      cell: (row) => tokens(doc<"d2/lq-baseline-row">(row).input_tokens),
    },
  ],
  "d2/chain-row": [
    caseColumn,
    armColumn,
    tierColumn,
    {
      id: "turn",
      label: "Turn",
      className: "tabular text-right",
      cell: (row) => formatCount(doc<"d2/chain-row">(row).turn),
    },
    verdictColumn("Outcome"),
    { id: "reply", label: "Reply", cell: (row) => <Text value={doc<"d2/chain-row">(row).reply} /> },
    {
      id: "tokens",
      label: "Input tokens",
      className: "tabular text-right",
      cell: (row) => tokens(doc<"d2/chain-row">(row).input_tokens),
    },
  ],
  "d2/self-check": [
    caseColumn,
    {
      id: "check",
      label: "Check",
      className: "font-mono text-xs",
      cell: (row) => doc<"d2/self-check">(row).check,
    },
    {
      id: "subject",
      label: "Subject",
      className: "text-xs",
      cell: (row) => doc<"d2/self-check">(row).subject,
    },
    verdictColumn("Status"),
    {
      id: "detail",
      label: "Detail",
      cell: (row) => <Text value={doc<"d2/self-check">(row).detail} />,
    },
  ],
  "d2/drift-row": [
    caseColumn,
    {
      id: "adapter",
      label: "Adapter",
      cell: (row) => <AdapterMark adapter={doc<"d2/drift-row">(row).adapter} />,
    },
    verdictColumn("Drift"),
    {
      id: "fields",
      label: "Fields",
      className: "font-mono text-xs",
      cell: (row) => doc<"d2/drift-row">(row).fields.join(", ") || "—",
    },
  ],
  "d2/call-row": [
    {
      id: "key",
      label: "Request",
      className: "font-mono text-xs",
      cell: (row) => shortDigest(doc<"d2/call-row">(row).key),
    },
    {
      id: "sample",
      label: "Sample",
      className: "tabular text-right",
      cell: (row) => formatCount(doc<"d2/call-row">(row).sample),
    },
    verdictColumn("Cache"),
    {
      id: "lookup",
      label: "Lookup",
      className: "tabular text-right",
      cell: (row) => formatMs(doc<"d2/call-row">(row).lookup_ms),
    },
  ],
  "d2/producer-row": [
    {
      id: "conversation",
      label: "Conversation",
      className: "font-mono text-xs",
      cell: (row) => doc<"d2/producer-row">(row).conversation,
    },
    {
      id: "producer",
      label: "Producer",
      className: "text-xs",
      cell: (row) => doc<"d2/producer-row">(row).producer,
    },
    {
      id: "turn",
      label: "Turn",
      className: "tabular text-right",
      cell: (row) => formatCount(doc<"d2/producer-row">(row).turn),
    },
    verdictColumn("Cache"),
    {
      id: "output",
      label: "Output",
      cell: (row) => <Text value={doc<"d2/producer-row">(row).output} mono />,
    },
  ],
  "d2/finding": [
    caseColumn,
    verdictColumn("Severity"),
    {
      id: "summary",
      label: "Summary",
      cell: (row) => <Text value={doc<"d2/finding">(row).summary} />,
    },
  ],
  "d2/blob": [
    {
      id: "digest",
      label: "Digest",
      className: "font-mono text-xs",
      cell: (row) => shortDigest(doc<"d2/blob">(row).digest),
    },
    verdictColumn("Media type"),
  ],
}

export function d2ColumnsOf(kind: D2RowKind): D2Column[] {
  return COLUMNS[kind]
}
