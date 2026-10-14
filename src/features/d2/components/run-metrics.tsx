import { Fragment } from "react"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { D2SummaryV1 } from "@/data/schema/generated"
import { compareSuites } from "@/features/d1/model/runs"
import { filterD2Metrics } from "@/features/d2/model/metrics"
import { d2RunPageParams } from "@/features/d2/model/url"
import { formatCount, formatTarget } from "@/lib/format"
import { useArmVocabulary } from "@/features/shared/vocabulary"
import { useUrlState } from "@/lib/url-state"

import { ArmLabel } from "./arm-label"
import { MetricValue } from "./metric-value"

const ALL = "all"
const METRIC_STATUSES = ["pass", "fail", "info", "na"] as const

/**
 * Every metric of a Domain 2 run, grouped by suite (DESIGN.md 4.4 rows): the producer's value,
 * interval, target and judgment, with the arm, family and tier it measures. Filters in the URL.
 */
export function D2RunMetrics({ summary }: { summary: Pick<D2SummaryV1, "suites" | "metrics"> }) {
  const [state, setState] = useUrlState(d2RunPageParams)
  const vocabulary = useArmVocabulary()
  const suites = [...summary.suites].sort((a, b) => compareSuites(a.id, b.id))
  const arms = [
    ...new Set(summary.metrics.flatMap((metric) => (metric.arm ? [metric.arm] : []))),
  ].sort(vocabulary.compare)
  const shown = filterD2Metrics(summary.metrics, {
    suite: state.suite,
    status: state.metric,
    arm: state.arm,
    q: state.q,
  })
  const groups = suites
    .map((suite) => ({ suite, metrics: shown.filter((metric) => metric.suite === suite.id) }))
    .filter((group) => group.metrics.length > 0)
  const filtering = state.suite || state.metric || state.arm || state.q
  if (summary.metrics.length === 0) {
    return (
      <p className="border border-dashed p-4 text-sm text-muted-foreground" data-state="empty">
        This run measured no metrics.
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
          <span className="text-muted-foreground">Arm</span>
          <Select
            value={state.arm ?? ALL}
            onValueChange={(value) => setState({ arm: value === ALL ? undefined : value })}
          >
            <SelectTrigger size="sm" className="w-44" aria-label="Filter metrics by arm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All arms</SelectItem>
              {arms.map((arm) => (
                <SelectItem key={arm} value={arm}>
                  {arm}
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
            placeholder="id, label, arm or tier"
            className="h-8 w-56"
            aria-label="Search metrics"
          />
        </label>
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setState({ suite: undefined, metric: undefined, arm: undefined, q: undefined })
            }
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
          className="border border-dashed p-4 text-sm text-muted-foreground"
          data-state="no-results"
        >
          No metrics match these filters.
        </p>
      ) : (
        <TableRegion label="Metrics table">
          <Table>
            <TableCaption className="sr-only">
              Metrics by suite, with the arm and tier each measures, the producer's judgment and
              target.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Metric</TableHead>
                <TableHead scope="col">Arm</TableHead>
                <TableHead scope="col">Tier</TableHead>
                <TableHead scope="col" className="text-right">
                  Value
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Target
                </TableHead>
                <TableHead scope="col">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(({ suite, metrics }) => (
                <Fragment key={suite.id}>
                  <TableRow className="border-t-2 hover:bg-transparent">
                    <TableCell colSpan={6} className="font-medium" scope="rowgroup">
                      <span className="font-mono">{suite.id}</span> · {suite.title}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {formatCount(metrics.length)}
                      </span>
                    </TableCell>
                  </TableRow>
                  {metrics.map((metric, i) => (
                    <TableRow
                      key={`${metric.id}:${metric.arm ?? ""}:${metric.tier ?? ""}:${i}`}
                      data-metric={metric.id}
                    >
                      <TableCell className="align-top">
                        <div className="font-medium">{metric.label}</div>
                        <div className="font-mono text-xs text-muted-foreground">{metric.id}</div>
                        {metric.description ? (
                          <div className="mt-0.5 max-w-prose text-xs text-muted-foreground">
                            {metric.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        {metric.arm ? (
                          <ArmLabel arm={metric.arm} />
                        ) : (
                          <span className="text-xs text-muted-foreground">all</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {metric.tier ? (
                          vocabulary.tierLabel(metric.tier, metric.id)
                        ) : (
                          <span className="text-muted-foreground">all</span>
                        )}
                        {metric.family ? (
                          <div className="font-mono text-muted-foreground">{metric.family}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular text-right align-top">
                        <MetricValue metric={metric} />
                      </TableCell>
                      <TableCell className="tabular text-right align-top text-muted-foreground">
                        {formatTarget(metric.unit, metric.target)}
                      </TableCell>
                      <TableCell className="align-top">
                        <StatusBadge status={metric.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      )}
    </div>
  )
}
