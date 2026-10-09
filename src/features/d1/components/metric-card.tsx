import { StatusBadge } from "@/components/dashboard/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formattedTarget, metricDefinition, type SummaryMetric } from "@/features/d1/model/run"
import { formatCount } from "@/lib/format"

/**
 * One metric as a card (DESIGN.md 4.4; ui-plan.md 10): the value large, its fraction beside it,
 * the target and the producer's judgment. Nothing is recomputed.
 */
export function MetricCard({ metric }: { metric: SummaryMetric }) {
  const definition = metricDefinition(metric)
  const fraction =
    metric.unit === "rate" &&
    metric.numerator !== null &&
    metric.denominator !== null &&
    metric.value !== null
      ? `${formatCount(metric.numerator)} / ${formatCount(metric.denominator)}`
      : null
  const value =
    metric.value === null
      ? definition.formattedValue
      : fraction
        ? definition.formattedValue.replace(/ \(.*\)$/, "")
        : definition.formattedValue
  return (
    <Card data-metric={metric.id} className="min-w-0 gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-medium">{definition.label}</CardTitle>
        <CardDescription className="font-mono text-xs">{definition.id}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={
              metric.value === null
                ? "text-lg text-muted-foreground"
                : "tabular text-2xl font-semibold tracking-tight"
            }
          >
            {value}
          </span>
          {fraction ? (
            <span className="tabular text-sm text-muted-foreground">{fraction}</span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge status={metric.status} />
          <span>target {formattedTarget(metric)}</span>
        </div>
        {definition.helpText ? (
          <p className="mt-2 text-xs text-muted-foreground">{definition.helpText}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

/** A responsive row of metric cards. */
export function MetricCards({ metrics }: { metrics: SummaryMetric[] }) {
  if (metrics.length === 0) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {metrics.map((metric, i) => (
        <MetricCard key={`${metric.id}:${metric.adapter ?? ""}:${i}`} metric={metric} />
      ))}
    </div>
  )
}
