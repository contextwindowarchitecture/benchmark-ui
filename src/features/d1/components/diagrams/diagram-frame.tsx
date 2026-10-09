import type { ReactNode } from "react"

import { sourceUrl, type Citation } from "@/content"

/**
 * A diagram's frame (ui-plan.md 7.3; DESIGN.md 4.5): the picture, hidden from assistive
 * technology, beside its text equivalent, which carries every word the picture does. The
 * equivalent is real content, not a caption: a reader without the picture loses nothing.
 */
export function DiagramFrame({
  id,
  title,
  description,
  figure,
  equivalent,
  equivalentTitle = "In words",
  note,
  citation,
}: {
  id: string
  title: string
  description?: ReactNode
  figure: ReactNode
  equivalent: ReactNode
  equivalentTitle?: string
  /** What the picture leaves out, and why. */
  note?: ReactNode
  /** Where the words that are not in the record come from. */
  citation?: Citation
}) {
  return (
    <figure
      id={id}
      className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      aria-labelledby={`${id}-caption`}
      data-diagram={id}
    >
      <div className="min-w-0 space-y-2">
        <figcaption id={`${id}-caption`} className="space-y-1">
          <span className="block text-base font-medium">{title}</span>
          {description ? (
            <span className="block text-sm text-muted-foreground">{description}</span>
          ) : null}
        </figcaption>
        <div aria-hidden="true" className="min-w-0 overflow-x-auto">
          {figure}
        </div>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <div className="min-w-0 space-y-2 text-sm">
        <h3 className="text-sm font-medium text-muted-foreground">{equivalentTitle}</h3>
        {equivalent}
        {citation ? (
          <p className="text-xs text-muted-foreground">
            Words from{" "}
            <a
              href={sourceUrl(citation.file)}
              className="underline underline-offset-3"
              rel="noreferrer"
            >
              {citation.file}
            </a>
            {citation.section ? `, ${citation.section}` : ""}.
          </p>
        ) : null}
      </div>
    </figure>
  )
}
