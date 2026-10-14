import { cn } from "cn"

import { useArmVocabulary, type ArmTone } from "@/features/shared/vocabulary"

/** A literal class per tone, so the CWA arms read as one family wherever arms are listed. */
const TONE_MARK: Record<ArmTone, string> = {
  outline: "border-muted-foreground/60 bg-transparent",
  muted: "border-muted-foreground/60 bg-muted-foreground/40",
  accent: "border-primary bg-primary",
}

/**
 * An arm by its id, marked by its group (the accent for a CWA arm, grey for a conventional one, an
 * outline for an upper bound or a control), as the current domain's vocabulary groups it, with
 * the group in text for assistive technology and what it sends as its title. Arms are categories,
 * not series: no hue of their own.
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
  const vocabulary = useArmVocabulary()
  const group = vocabulary.groups.find((candidate) => candidate.id === vocabulary.groupOf(arm))
  const words = vocabulary.words(arm)
  return (
    <span className={cn("inline-flex min-w-0 flex-col", className)} title={words?.payload}>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn("size-2.5 shrink-0 rounded-full border", group && TONE_MARK[group.tone])}
        />
        <span className="font-mono text-xs">{arm}</span>
        {group ? <span className="sr-only"> ({group.name})</span> : null}
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
  const { groups } = useArmVocabulary()
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {groups.map((group) => (
        <span key={group.id} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-full border", TONE_MARK[group.tone])}
          />
          {group.legend}
        </span>
      ))}
    </p>
  )
}
