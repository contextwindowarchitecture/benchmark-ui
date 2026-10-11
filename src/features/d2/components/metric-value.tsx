import type { D2Metric } from "@/features/d2/model/metrics"
import { intervalLevel } from "@/features/d2/model/metric-text"
import { formatCount, formatInterval, formatMetricValue, formatPercent } from "@/lib/format"

/**
 * A Domain 2 metric's value as the producer measured it: a rate as a percentage with its fraction
 * beneath, an interval beneath that when the harness computed one, its level named. A metric with
 * no value is "not measured", never a zero.
 */
export function MetricValue({ metric, compact = false }: { metric: D2Metric; compact?: boolean }) {
  if (metric.value === null) return <span className="text-muted-foreground">not measured</span>
  const main =
    metric.unit === "rate"
      ? formatPercent(metric.value)
      : formatMetricValue(metric.unit, metric.value)
  const fraction =
    metric.unit === "rate" && metric.numerator != null && metric.denominator != null
      ? `${formatCount(metric.numerator)} / ${formatCount(metric.denominator)}`
      : null
  const interval = metric.interval
  return (
    <span className="inline-flex flex-col items-end">
      <span>{main}</span>
      {fraction && !compact ? (
        <span className="text-xs font-light text-muted-foreground">{fraction}</span>
      ) : null}
      {interval ? (
        <span
          className="text-xs text-muted-foreground"
          title={`${intervalLevel(interval.level)} interval, ${interval.method}, ${formatCount(interval.resamples)} resamples`}
        >
          {formatInterval(metric.unit, interval.low, interval.high)}
        </span>
      ) : null}
    </span>
  )
}
