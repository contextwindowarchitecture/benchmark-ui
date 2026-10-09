import { cn } from "cn"
import { useMemo } from "react"

import { formatCount } from "@/lib/format"
import { diffLines } from "@/lib/line-diff"

/** Two texts line by line (ui-plan.md 8.9): removed lines in the failure tint, added in success. */
export function DiffView({
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  before: string
  after: string
  beforeLabel: string
  afterLabel: string
}) {
  const diff = useMemo(() => diffLines(before, after), [before, after])
  if (!diff.ok) {
    return (
      <p className="text-sm text-muted-foreground" data-diff="too-large">
        The diff of {beforeLabel} against {afterLabel} is too large to compute here (
        {formatCount(diff.cells)} comparisons); open both viewers instead.
      </p>
    )
  }
  if (diff.added === 0 && diff.removed === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-diff="same">
        {beforeLabel} and {afterLabel} are the same text.
      </p>
    )
  }
  return (
    <div className="space-y-1" data-diff="changed">
      <p className="text-xs text-muted-foreground">
        {afterLabel} against {beforeLabel}: {formatCount(diff.removed)} lines removed,{" "}
        {formatCount(diff.added)} added.
      </p>
      <pre
        tabIndex={0}
        role="region"
        aria-label={`Diff of ${afterLabel} against ${beforeLabel}`}
        className="max-h-96 overflow-auto rounded-lg border font-mono text-xs leading-5 whitespace-pre focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {diff.lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "px-3",
              line.type === "removed" && "bg-failure/10 text-failure",
              line.type === "added" && "bg-success/10 text-success",
            )}
          >
            <span className="inline-block w-4 select-none text-muted-foreground" aria-hidden="true">
              {line.type === "removed" ? "−" : line.type === "added" ? "+" : " "}
            </span>
            <span className="sr-only">
              {line.type === "removed" ? "removed: " : line.type === "added" ? "added: " : ""}
            </span>
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  )
}
