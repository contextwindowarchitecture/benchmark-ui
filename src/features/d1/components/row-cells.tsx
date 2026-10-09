import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { Outcome } from "@/components/dashboard/outcome"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { IndexedRow } from "@/data/row-store"
import type { RowKind } from "@/features/d1/model/row-kinds"
import { answerPath } from "@/features/d1/model/suite"
import { formatCount } from "@/lib/format"

import type { ColumnContext } from "./row-columns"

export function Dash() {
  return <span className="text-muted-foreground">—</span>
}

/** The case id, linking to the answer explorer where the row references a blob (ui-plan.md 8.4). */
export function CaseCell({
  row,
  context,
  detail,
}: {
  row: IndexedRow<RowKind>
  context: ColumnContext
  detail?: string | null
}) {
  const { caseId, hasBlobs } = row.fields
  return (
    <div className="min-w-0">
      {hasBlobs ? (
        <Link
          to={answerPath(context.runId, context.suite, caseId)}
          className="font-mono text-xs break-all underline-offset-3 hover:underline"
        >
          {caseId}
        </Link>
      ) : (
        <span className="font-mono text-xs break-all" title="Hashes only: no blob to open">
          {caseId}
        </span>
      )}
      {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  )
}

export function YesNo({
  value,
  yes = "yes",
  no = "no",
}: {
  value: boolean | null
  yes?: string
  no?: string
}) {
  if (value === null) return <Dash />
  return <span className={value ? undefined : "text-failure"}>{value ? yes : no}</span>
}

export type Answer = {
  adapter: string
  outcome: string
  prediction?: string
  detail?: string | null
}

/** One line per adapter: its symbol, its outcome, and what else the row says about it. */
export function Answers({ answers }: { answers: readonly Answer[] }) {
  if (answers.length === 0) return <Dash />
  return (
    <ul className="space-y-0.5">
      {answers.map((answer) => (
        <li key={answer.adapter} className="flex flex-wrap items-center gap-1.5">
          <AdapterMark adapter={answer.adapter} symbolOnly />
          <Outcome value={answer.outcome} />
          {answer.prediction ? (
            <StatusBadge
              status={
                answer.prediction === "pass"
                  ? "pass"
                  : answer.prediction === "fail"
                    ? "fail"
                    : "skipped"
              }
              label={`prediction ${answer.prediction}`}
              iconOnly
            />
          ) : null}
          {answer.detail ? (
            <span className="text-xs text-muted-foreground">{answer.detail}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function Findings({ ids, context }: { ids: readonly string[]; context: ColumnContext }) {
  if (ids.length === 0) return <Dash />
  return (
    <ul className="space-y-0.5">
      {ids.map((id) => (
        <li key={id}>
          <Link
            to={`/d1/runs/${context.runId}/findings/${id}`}
            className="font-mono text-xs underline-offset-3 hover:underline"
          >
            {id}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function Tags({ tags }: { tags: readonly string[] }) {
  if (tags.length === 0) return <Dash />
  return (
    <span className="tabular text-xs" title={tags.join(", ")}>
      {formatCount(tags.length)}
    </span>
  )
}

export function Expected({ value }: { value: string | null | undefined }) {
  return value ? <Outcome value={value} /> : <Dash />
}
