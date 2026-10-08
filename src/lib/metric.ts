// DESIGN.md 4.4's metric contract, as the baseline writes it. The producer judges every metric;
// the UI carries `status` and `target` and never recomputes them.

export type MetricStatus = "pass" | "fail" | "info" | "na"

export type MetricDefinition = {
  id: string
  label: string
  unit: string
  value: number | null
  formattedValue: string
  numerator?: number | null
  denominator?: number | null
  target?: number | null
  status?: MetricStatus
  comparison?: {
    label: string
    formattedChange: string
    direction: "up" | "down" | "flat"
    sentiment: "positive" | "negative" | "neutral"
  }
  helpText?: string
}
