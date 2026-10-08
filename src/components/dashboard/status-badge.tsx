import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { isStatus, STATUS_STYLES, TONE_CLASSES, type Status } from "@/lib/status"

export type StatusBadgeProps = {
  status: Status | string
  /** Overrides the vocabulary's label, for a count or a qualifier ("pass · 4 of 4"). */
  label?: string
  /** Hides the text and leaves the icon with the label as its accessible name. */
  iconOnly?: boolean
  className?: string
}

/**
 * A status with its color, its icon and its text (DESIGN.md 5): never color alone. A status the
 * vocabulary does not know renders muted with its own text, so an unknown value is still visible.
 */
export function StatusBadge({ status, label, iconOnly = false, className }: StatusBadgeProps) {
  const style = isStatus(status) ? STATUS_STYLES[status] : null
  const Icon = style?.icon
  const text = label ?? style?.label ?? status
  const tone = style?.tone ?? "muted"
  return (
    <Badge
      variant="outline"
      data-status={status}
      data-tone={tone}
      className={cn("gap-1 font-medium", TONE_CLASSES[tone], className)}
      aria-label={iconOnly ? text : undefined}
      title={iconOnly ? text : undefined}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn(status === "running" && "motion-safe:animate-spin")}
        />
      ) : null}
      {iconOnly ? null : <span>{text}</span>}
    </Badge>
  )
}
