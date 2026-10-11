// A Domain 2 metric in words, for accessible names and summaries beside a chart or a cell.

import { formatInterval, formatMetricValue } from "@/lib/format"

import type { D2Metric } from "./metrics"

/** The words for a value and its interval, for an accessible name or a summary. */
export function metricText(metric: D2Metric): string {
  if (metric.value === null) return "not measured"
  const main =
    metric.unit === "rate"
      ? formatMetricValue("rate", metric.value, metric.numerator, metric.denominator)
      : formatMetricValue(metric.unit, metric.value)
  const interval = metric.interval
  return interval
    ? `${main}, ${intervalLevel(interval.level)} interval ${formatInterval(metric.unit, interval.low, interval.high)}`
    : main
}

/** An interval's level as it is named: a 95% interval, not a 95.0% one. */
export function intervalLevel(level: number): string {
  return `${Math.round(level * 1000) / 10}%`
}
