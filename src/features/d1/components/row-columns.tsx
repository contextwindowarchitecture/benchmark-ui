import type { ReactNode } from "react"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { Outcome } from "@/components/dashboard/outcome"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { IndexedRow } from "@/data/row-store"
import type { RowKind } from "@/features/d1/model/row-kinds"
import { formatCount, formatMs } from "@/lib/format"

import { Answers, CaseCell, Dash, Expected, Findings, Tags, YesNo } from "./row-cells"

export type ColumnContext = { runId: string; suite: string }

export type Column<K extends RowKind> = {
  id: string
  label: string
  className?: string
  cell: (row: IndexedRow<K>, context: ColumnContext) => ReactNode
}

export const COLUMNS: { [K in RowKind]: Column<K>[] } = {
  "result-row": [
    {
      id: "case",
      label: "Case",
      cell: (row, context) => <CaseCell row={row} context={context} detail={row.document.corpus} />,
    },
    {
      id: "kind",
      label: "Kind",
      cell: (row) => <span className="text-xs">{row.document.case_kind}</span>,
    },
    {
      id: "adapter",
      label: "Adapter",
      cell: (row) => <AdapterMark adapter={row.document.adapter} />,
    },
    {
      id: "outcome",
      label: "Expected → outcome",
      cell: (row) => (
        <span className="inline-flex items-center gap-1">
          <Expected value={row.document.expected_outcome} />
          <span aria-hidden="true" className="text-muted-foreground">
            →
          </span>
          <Outcome value={row.document.outcome} />
        </span>
      ),
    },
    {
      id: "verdict",
      label: "Verdict",
      cell: (row) => <StatusBadge status={row.document.verdict} />,
    },
    {
      id: "audit",
      label: "Audit",
      cell: (row) =>
        row.document.audit ? (
          row.document.audit.status === "pass" ? (
            <span className="text-xs">pass</span>
          ) : (
            <span className="text-xs text-failure">
              fail: {row.document.audit.failed.join(", ") || "unspecified"}
            </span>
          )
        ) : (
          <Dash />
        ),
    },
    {
      id: "checks",
      label: "Checks",
      cell: (row) => {
        const counts = { pass: 0, fail: 0, skipped: 0, not_run: 0 }
        for (const check of row.document.checks) counts[check.status] += 1
        const parts = (["pass", "fail", "skipped", "not_run"] as const)
          .filter((status) => counts[status] > 0)
          .map((status) => `${counts[status]} ${status === "not_run" ? "not run" : status}`)
        return parts.length === 0 ? (
          <Dash />
        ) : (
          <span className={counts.fail > 0 ? "text-xs text-failure" : "text-xs"}>
            {parts.join(" · ")}
          </span>
        )
      },
    },
    {
      id: "wall",
      label: "Wall",
      className: "text-right",
      cell: (row) => <span className="tabular text-xs">{formatMs(row.document.wall_ms)}</span>,
    },
    {
      id: "tags",
      label: "Tags",
      className: "text-right",
      cell: (row) => <Tags tags={row.document.coverage_tags} />,
    },
    {
      id: "finding",
      label: "Finding",
      cell: (row, context) => <Findings ids={row.fields.findings} context={context} />,
    },
  ],
  "determinism-row": [
    {
      id: "case",
      label: "Case",
      cell: (row, context) => <CaseCell row={row} context={context} detail={row.document.corpus} />,
    },
    {
      id: "adapter",
      label: "Adapter",
      cell: (row) => <AdapterMark adapter={row.document.adapter} />,
    },
    {
      id: "cell",
      label: "Cell",
      cell: (row) => (
        <div className="font-mono text-xs">
          {row.document.env_cell}
          <div className="text-muted-foreground">{row.document.platform}</div>
        </div>
      ),
    },
    {
      id: "applied",
      label: "Applied",
      cell: (row) =>
        row.document.applied ? (
          <span className="text-xs">yes</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            no{row.document.not_applied_reason ? `: ${row.document.not_applied_reason}` : ""}
          </span>
        ),
    },
    { id: "outcome", label: "Outcome", cell: (row) => <Outcome value={row.document.outcome} /> },
    {
      id: "matches",
      label: "Matches reference",
      cell: (row) => {
        const m = row.document.matches_reference
        if (!m) return <Dash />
        const part = (label: string, value: boolean | null) => (
          <span key={label} className="inline-flex items-center gap-1">
            <span className="text-muted-foreground">{label}</span>
            <YesNo value={value} />
          </span>
        )
        return (
          <span className="flex flex-wrap gap-2 text-xs">
            {part("decision", m.decision)}
            {part("payload", m.payload)}
            {part("trace", m.trace)}
          </span>
        )
      },
    },
    {
      id: "wall",
      label: "Wall",
      className: "text-right",
      cell: (row) => <span className="tabular text-xs">{formatMs(row.document.wall_ms)}</span>,
    },
    {
      id: "finding",
      label: "Finding",
      cell: (row, context) => <Findings ids={row.fields.findings} context={context} />,
    },
  ],
  "relation-row": [
    {
      id: "relation",
      label: "Relation",
      cell: (row) => (
        <div className="min-w-0">
          <span className="font-mono text-xs">{row.document.relation}</span>
          {row.document.kind !== row.document.relation ? (
            <span className="ml-1 font-mono text-xs text-muted-foreground">
              {row.document.kind}
            </span>
          ) : null}
          <div className="text-xs">{row.document.title}</div>
        </div>
      ),
    },
    {
      id: "seed",
      label: "Seed",
      cell: (row, context) => (
        <CaseCell row={row} context={context} detail={row.document.seed.corpus} />
      ),
    },
    {
      id: "judgments",
      label: "Judgments",
      cell: (row) => (
        <ul className="space-y-0.5">
          {row.document.judgments.map((judgment) => (
            <li key={judgment.adapter} className="flex flex-wrap items-center gap-1.5">
              <AdapterMark adapter={judgment.adapter} symbolOnly />
              <StatusBadge status={judgment.status} />
              {judgment.detail ? (
                <span className="text-xs text-muted-foreground">{judgment.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "agree",
      label: "Variants agree",
      cell: (row) => <YesNo value={row.document.variant_agree} />,
    },
    {
      id: "verdict",
      label: "Verdict",
      cell: (row) => <StatusBadge status={row.document.verdict} />,
    },
    {
      id: "findings",
      label: "Findings",
      cell: (row, context) => <Findings ids={row.document.findings} context={context} />,
    },
  ],
  "fuzz-row": [
    {
      id: "case",
      label: "Case",
      cell: (row, context) => <CaseCell row={row} context={context} detail={row.document.corpus} />,
    },
    {
      id: "round",
      label: "Round",
      className: "text-right",
      cell: (row) => <span className="tabular text-xs">{formatCount(row.document.round)}</span>,
    },
    {
      id: "expected",
      label: "Expected",
      cell: (row) => <span className="text-xs">{row.document.expected}</span>,
    },
    {
      id: "mutation",
      label: "Mutation",
      cell: (row) =>
        row.document.mutation ? (
          <span className="font-mono text-xs">
            {row.document.mutation.operator}
            <span className="text-muted-foreground"> ({row.document.mutation.check})</span>
          </span>
        ) : (
          <Dash />
        ),
    },
    { id: "answers", label: "Answers", cell: (row) => <Answers answers={row.document.answers} /> },
    { id: "agree", label: "Agree", cell: (row) => <YesNo value={row.document.agree} /> },
    {
      id: "verdict",
      label: "Verdict",
      cell: (row) => <StatusBadge status={row.document.verdict} />,
    },
    {
      id: "problems",
      label: "Problems",
      cell: (row, context) => (
        <div className="space-y-0.5">
          {row.document.problems.length > 0 ? (
            <span className="text-xs text-failure" title={row.document.problems.join("\n")}>
              {formatCount(row.document.problems.length)}{" "}
              {row.document.problems.length === 1 ? "problem" : "problems"}
            </span>
          ) : null}
          <Findings ids={row.document.findings} context={context} />
        </div>
      ),
    },
  ],
  "scale-row": [
    {
      id: "case",
      label: "Case",
      cell: (row, context) => <CaseCell row={row} context={context} detail={row.document.label} />,
    },
    {
      id: "cell",
      label: "Cell",
      cell: (row) => (
        <div className="text-xs">
          <span className="font-mono">{row.document.cell.shape}</span>
          <div className="tabular text-muted-foreground">
            {formatCount(row.document.cell.candidates)} ×{" "}
            {formatCount(row.document.cell.candidate_tokens)} tokens
          </div>
        </div>
      ),
    },
    {
      id: "budget",
      label: "Budget",
      className: "text-right",
      cell: (row) =>
        row.document.budget_input === null ? (
          <Dash />
        ) : (
          <span className="tabular text-xs">{formatCount(row.document.budget_input)}</span>
        ),
    },
    {
      id: "expected",
      label: "Expected",
      cell: (row) => (
        <span className="text-xs">
          <Expected value={row.document.expected.outcome} />
          {row.document.expected.refusal_reason ? (
            <span className="ml-1 font-mono text-muted-foreground">
              {row.document.expected.refusal_reason}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "answers",
      label: "Answers",
      cell: (row) => (
        <div className="space-y-1">
          <Answers
            answers={row.document.answers.map((answer) => ({
              adapter: answer.adapter,
              outcome: answer.outcome,
              prediction: answer.prediction,
              detail: formatMs(answer.wall_ms),
            }))}
          />
          {row.document.skipped.length > 0 ? (
            <div className="text-xs text-muted-foreground">
              skipped: {row.document.skipped.map((s) => `${s.adapter} (${s.reason})`).join(", ")}
            </div>
          ) : null}
        </div>
      ),
    },
    { id: "agree", label: "Agree", cell: (row) => <YesNo value={row.document.agree} /> },
    {
      id: "verdict",
      label: "Verdict",
      cell: (row) => <StatusBadge status={row.document.verdict} />,
    },
    {
      id: "findings",
      label: "Findings",
      cell: (row, context) => <Findings ids={row.document.findings} context={context} />,
    },
  ],
  "summarizer-row": [
    { id: "case", label: "Case", cell: (row, context) => <CaseCell row={row} context={context} /> },
    {
      id: "arm",
      label: "Arm",
      cell: (row) => <span className="font-mono text-xs">{row.document.arm}</span>,
    },
    {
      id: "sample",
      label: "Sample",
      className: "text-right",
      cell: (row) => <span className="tabular text-xs">{formatCount(row.document.sample)}</span>,
    },
    {
      id: "budget",
      label: "Budget",
      className: "text-right",
      cell: (row) => (
        <span className="tabular text-xs">{formatCount(row.document.budget_input)}</span>
      ),
    },
    {
      id: "purposes",
      label: "Purposes",
      cell: (row) => <span className="text-xs">{row.document.purposes.join(", ")}</span>,
    },
    {
      id: "expected",
      label: "Expected",
      cell: (row) => <Expected value={row.document.expected.outcome} />,
    },
    {
      id: "answers",
      label: "Answers",
      cell: (row) => (
        <Answers
          answers={row.document.answers.map((answer) => ({
            adapter: answer.adapter,
            outcome: answer.outcome,
            prediction: answer.prediction,
            detail: answer.retained
              ? `${formatCount(answer.retained.whole)} whole · ${formatCount(answer.retained.variant)} variant · ${formatCount(answer.retained.omitted)} omitted`
              : null,
          }))}
        />
      ),
    },
    { id: "agree", label: "Agree", cell: (row) => <YesNo value={row.document.agree} /> },
    {
      id: "verdict",
      label: "Verdict",
      cell: (row) => <StatusBadge status={row.document.verdict} />,
    },
  ],
  "drift-row": [
    { id: "case", label: "Case", cell: (row, context) => <CaseCell row={row} context={context} /> },
    {
      id: "adapter",
      label: "Adapter",
      cell: (row) => <AdapterMark adapter={row.document.adapter} />,
    },
    { id: "drift", label: "Drift", cell: (row) => <StatusBadge status={row.document.drift} /> },
    {
      id: "fields",
      label: "Fields",
      cell: (row) =>
        row.document.fields.length === 0 ? (
          <Dash />
        ) : (
          <span className="font-mono text-xs">{row.document.fields.join(", ")}</span>
        ),
    },
    {
      id: "outcomes",
      label: "Golden → actual",
      cell: (row) => (
        <span className="inline-flex items-center gap-1">
          <Expected value={row.document.golden?.outcome} />
          <span aria-hidden="true" className="text-muted-foreground">
            →
          </span>
          <Outcome value={row.document.actual.outcome} />
        </span>
      ),
    },
    {
      id: "commit",
      label: "Adapter commit changed",
      cell: (row) => <YesNo value={row.document.adapter_commit_changed} />,
    },
    {
      id: "finding",
      label: "Finding",
      cell: (row, context) => <Findings ids={row.fields.findings} context={context} />,
    },
  ],
  finding: [
    {
      id: "severity",
      label: "Severity",
      cell: (row) => <StatusBadge status={row.document.severity} />,
    },
    {
      id: "suite",
      label: "Suite",
      cell: (row) => <span className="font-mono text-xs">{row.document.suite}</span>,
    },
    {
      id: "adapter",
      label: "Adapter",
      cell: (row) =>
        row.fields.adapters.length === 0 ? (
          <span className="text-xs text-muted-foreground">all</span>
        ) : (
          <span className="flex flex-wrap gap-2">
            {row.fields.adapters.map((adapter) => (
              <AdapterMark key={adapter} adapter={adapter} />
            ))}
          </span>
        ),
    },
    {
      id: "oracle",
      label: "Oracle",
      cell: (row) => (
        <span className="text-xs">
          {row.document.oracle}
          {row.document.checks.length > 0 ? (
            <span className="block font-mono text-muted-foreground">
              {row.document.checks.join(", ")}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "summary",
      label: "Summary",
      cell: (row, context) => (
        <div className="max-w-md">
          <Link
            to={`/d1/runs/${context.runId}/findings/${row.document.finding_id}`}
            className="underline-offset-3 hover:underline"
          >
            {row.document.summary}
          </Link>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
            {row.document.finding_id} · {row.document.case_id}
          </div>
        </div>
      ),
    },
    {
      id: "occurrences",
      label: "Occurrences",
      className: "text-right",
      cell: (row) => (
        <span className="tabular text-xs">{formatCount(row.document.occurrences)}</span>
      ),
    },
    {
      id: "minimized",
      label: "Minimized",
      cell: (row) =>
        row.document.minimized ? (
          <span className={row.document.minimized.reproduces ? "text-xs" : "text-xs text-warning"}>
            {row.document.minimized.items_before} → {row.document.minimized.items_after} items
            {row.document.minimized.reproduces ? "" : " (does not reproduce)"}
          </span>
        ) : (
          <Dash />
        ),
    },
    {
      id: "upstream",
      label: "Upstream",
      cell: (row) =>
        row.document.upstream ? (
          <a
            href={row.document.upstream.url}
            className="inline-flex items-center gap-1 text-xs underline underline-offset-3"
            rel="noreferrer"
          >
            {row.document.upstream.state}
          </a>
        ) : (
          <Dash />
        ),
    },
  ],
  blob: [
    {
      id: "digest",
      label: "Digest",
      cell: (row) => <span className="font-mono text-xs break-all">{row.document.digest}</span>,
    },
    {
      id: "path",
      label: "Path",
      cell: (row) => <span className="font-mono text-xs break-all">{row.document.path}</span>,
    },
    {
      id: "media",
      label: "Media type",
      cell: (row) => <span className="text-xs">{row.document.media_type}</span>,
    },
    {
      id: "bytes",
      label: "Bytes",
      className: "text-right",
      cell: (row) => <span className="tabular text-xs">{formatCount(row.document.bytes)}</span>,
    },
  ],
  "self-check": [
    { id: "case", label: "Case", cell: (row, context) => <CaseCell row={row} context={context} /> },
    {
      id: "check",
      label: "Check",
      cell: (row) => <span className="font-mono text-xs">{row.document.check}</span>,
    },
    {
      id: "operator",
      label: "Operator",
      cell: (row) =>
        row.document.operator ? (
          <span className="font-mono text-xs">{row.document.operator}</span>
        ) : (
          <Dash />
        ),
    },
    {
      id: "position",
      label: "Position",
      cell: (row) =>
        row.document.position ? (
          <span className="font-mono text-xs break-all">{row.document.position}</span>
        ) : (
          <Dash />
        ),
    },
    { id: "status", label: "Status", cell: (row) => <StatusBadge status={row.document.status} /> },
    {
      id: "killed-by",
      label: "Killed by",
      cell: (row) =>
        row.document.killed_by.length === 0 ? (
          <Dash />
        ) : (
          <span className="font-mono text-xs">{row.document.killed_by.join(", ")}</span>
        ),
    },
    {
      id: "detail",
      label: "Detail",
      cell: (row) =>
        row.document.detail ? (
          <span className="block max-w-md text-xs text-muted-foreground">
            {row.document.detail}
          </span>
        ) : (
          <Dash />
        ),
    },
  ],
}

export function columnsOf(kind: RowKind): Column<RowKind>[] {
  return COLUMNS[kind] as unknown as Column<RowKind>[]
}
