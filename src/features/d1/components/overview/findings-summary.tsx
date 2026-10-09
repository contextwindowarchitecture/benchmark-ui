import { PartyPopper } from "lucide-react"
import { Link } from "react-router"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunRows } from "@/data/queries"
import type { RunIndexV1, SummaryV1 } from "@/data/schema/generated"
import { countBySeverity, fileByPath } from "@/features/d1/model/run"
import { compareSuites } from "@/features/d1/model/runs"
import { formatCount } from "@/lib/format"

/**
 * One run's findings for the drill-down (ui-plan.md 8.1, item 4): the count by severity and by
 * suite, with "none" a valid and prominent state, linking to the findings page.
 */
export function FindingsSummary({
  runId,
  summary,
  index,
  label,
}: {
  runId: string
  summary: SummaryV1
  index: RunIndexV1
  label: string
}) {
  const totals = summary.findings
  const file = fileByPath(index, totals.file ?? "findings.jsonl")
  const rows = useRunRows(runId, file?.path ?? "findings.jsonl", "finding", {
    enabled: file !== undefined && totals.total > 0,
    expectedRows: file?.rows,
  })
  const bySuite = Object.entries(totals.by_suite)
    .filter((pair): pair is [string, number] => typeof pair[1] === "number" && pair[1] > 0)
    .sort(([a], [b]) => compareSuites(a, b))
  if (totals.total === 0) {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border p-4"
        data-state="none"
        data-findings-run={runId}
      >
        <PartyPopper aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="text-sm">
          <p className="font-medium">No findings in the {label} run</p>
          <p className="text-muted-foreground">
            Every answer of <span className="font-mono">{runId}</span> passed every oracle, across{" "}
            {formatCount(Object.keys(totals.by_suite).length)} suites.
          </p>
        </div>
      </div>
    )
  }
  const severities = rows.data?.ok
    ? countBySeverity(rows.data.rows.map((row) => row.document))
    : null
  return (
    <div className="space-y-2 rounded-lg border p-4 text-sm" data-findings-run={runId}>
      <p className="font-medium">
        {formatCount(totals.total)} {totals.total === 1 ? "finding" : "findings"} in the {label} run
      </p>
      <p className="flex flex-wrap items-center gap-2">
        {rows.isPending && file ? (
          <Skeleton className="h-5 w-40" aria-label="Loading the findings' severities" />
        ) : severities ? (
          (["error", "warning", "info"] as const)
            .filter((severity) => severities[severity] > 0)
            .map((severity) => (
              <StatusBadge
                key={severity}
                status={severity}
                label={`${formatCount(severities[severity])} ${severity}`}
              />
            ))
        ) : (
          <span className="text-muted-foreground">severities not loaded</span>
        )}
      </p>
      <p className="text-muted-foreground">
        By suite: {bySuite.map(([suite, count]) => `${suite} ${formatCount(count)}`).join(", ")}.
      </p>
      <p>
        <Link to={`/d1/runs/${runId}/findings`} className="underline underline-offset-3">
          Every finding of {runId}
        </Link>
      </p>
    </div>
  )
}
