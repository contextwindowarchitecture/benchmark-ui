import { cn } from "cn"
import type { ReactNode } from "react"

/**
 * A labelled, keyboard-focusable horizontal scroll region for a table (DESIGN.md 4.2, 10). The
 * generated Table wraps itself in a scrolling container nobody can focus; this region takes the
 * scrolling over by letting that container overflow, so the page never scrolls sideways and a
 * keyboard user can reach the scroll.
 */
export function TableRegion({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "overflow-x-auto rounded-lg border focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [&>[data-slot=table-container]]:overflow-visible",
        className,
      )}
    >
      {children}
    </div>
  )
}
