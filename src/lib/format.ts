// The central formatters (ui-plan.md 11; DESIGN.md 2.1): every page formats through here, with
// the browser's locale for numbers and UTC for every time, as the harness writes them.

const locale: string | undefined = undefined // the browser's

const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const twoDecimals = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** A count with grouped thousands: 1,616. */
export function formatCount(value: number): string {
  return integer.format(value)
}

/**
 * A rate as a percentage with one decimal, except that 100% is written only when the value is
 * exactly 1: 99.96% is not rounded up, it gets the decimals it needs to stay under 100.
 */
export function formatPercent(value: number): string {
  if (value === 1) return "100%"
  if (value === 0) return "0%"
  let digits = 1
  let text = percentWith(value, digits)
  while (value < 1 && (text === "100%" || text.startsWith("100.")) && digits < 6) {
    digits += 1
    text = percentWith(value, digits)
  }
  return text
}

function percentWith(value: number, digits: number): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** A rate with its fraction beside it, so 1/1 and 1,000/1,000 read differently. */
export function formatRate(
  value: number | null,
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): string {
  if (value === null) return "not measured"
  const percent = formatPercent(value)
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined
  ) {
    return percent
  }
  return `${percent} (${formatCount(numerator)} / ${formatCount(denominator)})`
}

/** Milliseconds with one decimal under a second; seconds with one decimal above. */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "not available"
  if (Math.abs(ms) < 1000) return `${oneDecimal.format(ms)} ms`
  return `${oneDecimal.format(ms / 1000)} s`
}

/** Bytes as kB, MB or GB with one decimal; small sizes stay in bytes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "not available"
  const abs = Math.abs(bytes)
  if (abs < 1024) return `${integer.format(bytes)} B`
  if (abs < 1024 * 1024) return `${oneDecimal.format(bytes / 1024)} kB`
  if (abs < 1024 * 1024 * 1024) return `${oneDecimal.format(bytes / (1024 * 1024))} MB`
  return `${oneDecimal.format(bytes / (1024 * 1024 * 1024))} GB`
}

/** A fitted exponent with its standard error: 1.87 ± 0.05. */
export function formatExponent(value: number, standardError?: number | null): string {
  const base = twoDecimals.format(value)
  return standardError === undefined || standardError === null
    ? base
    : `${base} ± ${twoDecimals.format(standardError)}`
}

/** A metric's value in its unit, for cards and tables (DESIGN.md 4.4). */
export function formatMetricValue(
  unit: "rate" | "count" | "ms" | "exponent",
  value: number | null,
  numerator?: number | null,
  denominator?: number | null,
): string {
  if (value === null) return "not measured"
  switch (unit) {
    case "rate":
      return formatRate(value, numerator, denominator)
    case "count":
      return formatCount(value)
    case "ms":
      return formatMs(value)
    case "exponent":
      return formatExponent(value)
  }
}

/** A target in a metric's unit: "≥ 99%" for a rate floor, "≤ 0" for a count ceiling. */
export function formatTarget(
  unit: "rate" | "count" | "ms" | "exponent",
  target: number | null,
): string {
  if (target === null) return "ungated"
  switch (unit) {
    case "rate":
      return formatPercent(target)
    case "count":
      return formatCount(target)
    case "ms":
      return formatMs(target)
    case "exponent":
      return formatExponent(target)
  }
}

/** The first seven hex characters of a digest, with or without a `sha256:` prefix. */
export function shortDigest(digest: string): string {
  const hex = digest.startsWith("sha256:") ? digest.slice("sha256:".length) : digest
  return hex.slice(0, 7)
}

const utcDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

/** A time as the harness writes it: UTC, with the zone visible: 2026-10-08 13:34:53 UTC. */
export function formatUtc(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "invalid time"
  const parts = utcDateTime.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} UTC`
}

/** The ISO form of a time for `<time dateTime>`; the input when it does not parse. */
export function isoUtc(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

/** A duration: 18 min 15 s, 1 h 18 min, 2.5 s, 850 ms. */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "not available"
  if (ms < 0) return "negative"
  if (ms < 1000) return `${integer.format(ms)} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${oneDecimal.format(seconds)} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ${integer.format(Math.round(seconds - minutes * 60))} s`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes - hours * 60} min`
}
