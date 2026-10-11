// A Domain 2 metric in words, for accessible names and summaries beside a chart or a cell: its
// value, its interval named by its own level and method, and what reached no model.

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

/** The methods the harness names its intervals by, in words; another method is named by its id. */
const METHOD_WORDS: Record<string, string> = {
  "cluster-bootstrap/conversation": "cluster-bootstrap interval over conversations",
}

/**
 * An interval as its record names it, for a chart's summary or legend: "95% cluster-bootstrap
 * interval over conversations". Null when there is no interval to name.
 */
export function intervalWords(
  interval: { level: number; method: string } | null | undefined,
): string | null {
  if (!interval) return null
  const method = METHOD_WORDS[interval.method] ?? `interval (${interval.method})`
  return `${intervalLevel(interval.level)} ${method}`
}

/** Answers that reached no model: overflows, and refusals where the shape counts them. */
export function unsentAnswers(verdicts: { overflow: number; refused?: number }): number {
  return verdicts.overflow + (verdicts.refused ?? 0)
}
