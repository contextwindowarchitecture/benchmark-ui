import type { D2Metric } from "@/features/d2/model/metrics"
import { intervalLevel, metricIntervalText, metricValueText } from "@/features/d2/model/metric-text"
import { useArmVocabulary } from "@/features/shared/vocabulary"
import { formatCount, formatPercent } from "@/lib/format"

/**
 * A Domain 2 metric's value as the producer measured it: a rate as a percentage with its fraction
 * beneath, an interval beneath that when the harness computed one, its level named. A metric with
 * no value is "not measured", never a zero.
 */
export function MetricValue({ metric, compact = false }: { metric: D2Metric; compact?: boolean }) {
  const { points, intervalWords } = useArmVocabulary()
  if (metric.value === null) return <span className="text-muted-foreground">not measured</span>
  const main =
    metric.unit === "rate" ? formatPercent(metric.value) : metricValueText(metric, points)
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
          title={`${intervalWords(metric) ?? `${intervalLevel(interval.level)} interval`}, ${formatCount(interval.resamples)} resamples`}
        >
          {metricIntervalText(metric.unit, interval.low, interval.high, points)}
        </span>
      ) : null}
    </span>
  )
}
