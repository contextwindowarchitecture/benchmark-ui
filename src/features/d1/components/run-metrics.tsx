import type { UseQueryResult } from "@tanstack/react-query"

import { DataRegion } from "@/components/dashboard/data-region"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { regionOfDocument } from "@/data/region"
import type { SummaryV1 } from "@/data/schema/generated"
import type { SourceError } from "@/data/source"
import type { ParseResultOf } from "@/data/validate"
import { filterMetrics, groupMetricsBySuite, sortedSuites } from "@/features/d1/model/run"
import { runPageParams } from "@/features/d1/model/url"
import { formatCount } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { MetricsTable } from "./metrics-table"

const ALL = "all"
const METRIC_STATUSES = ["pass", "fail", "info", "na"] as const

export type RunMetricsProps = {
  runId: string
  summary: UseQueryResult<ParseResultOf<"summary">, SourceError>
}

/** Every metric of the run as a filterable table grouped by suite (DESIGN.md 4.4 rows). */
export function RunMetrics({ runId, summary }: RunMetricsProps) {
  const region = regionOfDocument(summary, `${runId}/summary.json`, "the summary")
  return (
    <DataRegion state={region} label="the metrics" skeleton={<Skeleton className="h-64 w-full" />}>
      {(document) => <RunMetricsTable summary={document} />}
    </DataRegion>
  )
}

function RunMetricsTable({ summary }: { summary: SummaryV1 }) {
  const [state, setState] = useUrlState(runPageParams)
  const suites = sortedSuites(summary)
  const shown = filterMetrics(summary.metrics, {
    suite: state.suite,
    status: state.metric,
    q: state.q,
  })
  const groups = groupMetricsBySuite(shown)
  const filtering = state.suite || state.metric || state.q
  if (summary.metrics.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        This run judged no metrics.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Suite</span>
          <Select
            value={state.suite ?? ALL}
            onValueChange={(value) => setState({ suite: value === ALL ? undefined : value })}
          >
            <SelectTrigger size="sm" className="w-28" aria-label="Filter metrics by suite">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All suites</SelectItem>
              {suites.map((suite) => (
                <SelectItem key={suite.id} value={suite.id}>
                  {suite.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <Select
            value={state.metric ?? ALL}
            onValueChange={(value) =>
              setState({
                metric: value === ALL ? undefined : (value as (typeof METRIC_STATUSES)[number]),
              })
            }
          >
            <SelectTrigger size="sm" className="w-36" aria-label="Filter metrics by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {METRIC_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "na" ? "not measured" : status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Search</span>
          <Input
            type="search"
            value={state.q ?? ""}
            onChange={(event) => setState({ q: event.target.value || undefined })}
            placeholder="id, label or adapter"
            className="h-8 w-56"
            aria-label="Search metrics"
          />
        </label>
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState({ suite: undefined, metric: undefined, q: undefined })}
          >
            Clear
          </Button>
        ) : null}
        <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
          {shown.length === summary.metrics.length
            ? `${formatCount(summary.metrics.length)} metrics`
            : `${formatCount(shown.length)} of ${formatCount(summary.metrics.length)} metrics match`}
        </p>
      </div>
      {shown.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="no-results"
        >
          No metrics match these filters.
        </p>
      ) : (
        <MetricsTable
          groups={groups}
          titles={new Map(suites.map((suite) => [suite.id, suite.title]))}
          caption="Metrics by suite, with the producer's judgment and target."
          label="Metrics table"
        />
      )}
    </div>
  )
}
