import { cn } from "cn"

import { armGroup, armWords, type ArmGroup } from "@/content/d2/vocabulary"

/** A literal class per group, so the CWA arms read as one family wherever arms are listed. */
const GROUP_MARK: Record<ArmGroup, string> = {
  control: "border-muted-foreground/60 bg-transparent",
  conventional: "border-muted-foreground/60 bg-muted-foreground/40",
  cwa: "border-primary bg-primary",
}

const GROUP_NAME: Record<ArmGroup, string> = {
  control: "upper bound",
  conventional: "conventional",
  cwa: "CWA",
}

/**
 * An arm by its id, marked by its group (an outline for an upper bound, grey for a conventional
 * baseline, the accent for a CWA arm) with the group in text for assistive technology, and what
 * it sends as its title. Arms are categories, not series: no hue of their own.
 */
export function ArmLabel({
  arm,
  showPayload = false,
  className,
}: {
  arm: string
  /** Show what the arm sends beneath its id. */
  showPayload?: boolean
  className?: string
}) {
  const group = armGroup(arm)
  const words = armWords(arm)
  return (
    <span className={cn("inline-flex min-w-0 flex-col", className)} title={words?.payload}>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn("size-2.5 shrink-0 rounded-full border", GROUP_MARK[group])}
        />
        <span className="font-mono text-xs">{arm}</span>
        <span className="sr-only"> ({GROUP_NAME[group]})</span>
        {words?.role ? <span className="text-xs text-muted-foreground">· {words.role}</span> : null}
      </span>
      {showPayload && words ? (
        <span className="mt-0.5 max-w-prose text-xs text-muted-foreground">{words.payload}</span>
      ) : null}
    </span>
  )
}

/** The legend of the arm marks, once per page that lists arms. */
export function ArmLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["control", "conventional", "cwa"] as const).map((group) => (
        <span key={group} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-full border", GROUP_MARK[group])}
          />
          {group === "control"
            ? "upper bound, no budget"
            : group === "conventional"
              ? "conventional baseline"
              : "CWA arm"}
        </span>
      ))}
    </p>
  )
}
