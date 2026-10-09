import { cn } from "cn"

import { isFaultOutcome, outcomeLabel } from "@/lib/outcomes"

/**
 * An answer's outcome as text (DESIGN.md 5): not a status, so not a badge. A fault outcome takes
 * the failure hue and says so in its accessible name; the rest read as plain text.
 */
export function Outcome({ value, className }: { value: string; className?: string }) {
  const fault = isFaultOutcome(value)
  return (
    <span
      data-outcome={value}
      className={cn("font-mono text-xs", fault && "font-medium text-failure", className)}
    >
      {outcomeLabel(value)}
      {fault ? <span className="sr-only"> (a fault)</span> : null}
    </span>
  )
}
