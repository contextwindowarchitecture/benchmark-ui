// A metric in words (Domain 2's shape, which Domain 5's shares), for accessible names and summaries beside a chart or a cell: its
// value, its interval named by its own level and method, and what reached no model.

import { formatInterval, formatMetricValue } from "@/lib/format"

import type { D2Metric } from "./metrics"

/** How a domain writes a value in points, and an interval of it. */
export type PointsFormat = {
  value(value: number): string
  interval(low: number, high: number): string
}

/** Domain 2's points: points out of 100 (unreliability), the default. */
export const POINTS_OUT_OF_100: PointsFormat = {
  value: (value) => formatMetricValue("points", value),
  interval: (low, high) => formatInterval("points", low, high),
}

/** A metric's value in its unit, points as the domain writes them. */
export function metricValueText(
  metric: Pick<D2Metric, "unit" | "value" | "numerator" | "denominator">,
  points: PointsFormat = POINTS_OUT_OF_100,
): string {
  if (metric.value === null) return "not measured"
  if (metric.unit === "rate") {
    return formatMetricValue("rate", metric.value, metric.numerator, metric.denominator)
  }
  return metric.unit === "points"
    ? points.value(metric.value)
    : formatMetricValue(metric.unit, metric.value)
}

/** An interval's bounds in the metric's unit, points as the domain writes them. */
export function metricIntervalText(
  unit: D2Metric["unit"],
  low: number,
  high: number,
  points: PointsFormat = POINTS_OUT_OF_100,
): string {
  return unit === "points" ? points.interval(low, high) : formatInterval(unit, low, high)
}

/** The words for a value and its interval, for an accessible name or a summary. */
export function metricText(metric: D2Metric, points: PointsFormat = POINTS_OUT_OF_100): string {
  if (metric.value === null) return "not measured"
  const main = metricValueText(metric, points)
  const interval = metric.interval
  return interval
    ? `${main}, ${intervalLevel(interval.level)} interval ${metricIntervalText(metric.unit, interval.low, interval.high, points)}`
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

/**
 * The answers that reached no model yet sit under "facts sent", as far as the summary shows: the
 * unsent answers beyond the "facts not sent" tally. A harness before `95ee813` filed an overflow by
 * whether S1 found the facts in the payload the arm would have sent; from it on, every unsent
 * answer is filed as not sent and this is null. `atLeast` when the tally of facts not sent holds
 * some answers too, so the count is a floor.
 */
export function unsentFiledAsSent(
  verdicts: { overflow: number; refused?: number },
  given: { absent: { n: number } },
): { count: number; atLeast: boolean } | null {
  const count = unsentAnswers(verdicts) - given.absent.n
  return count > 0 ? { count, atLeast: given.absent.n > 0 } : null
}
