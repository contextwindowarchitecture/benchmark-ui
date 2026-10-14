// How far to trust Domain 5's evidence (the UI-D5 plan; DESIGN.md 4.5, item 3): the write-up's
// words on what it does not claim, where the viability document promises more than the
// specification has, how it judges an answer, its limits and what the run corrected.

import { sourceUrl, type Citation } from "@/content"
import {
  CORRECTIONS,
  CORRECTIONS_CITATION,
  CORRECTIONS_TO_VIABILITY,
  JUDGING,
  JUDGING_CITATION,
  SCOPE,
  TRUST,
  TRUST_CITATION,
  type Note,
} from "@/content/d5/trust"
import { VIABILITY_DOCUMENT } from "@/content/source"

function Cited({ citation }: { citation: Citation }) {
  return (
    <p className="text-xs text-muted-foreground">
      Words from{" "}
      <a href={sourceUrl(citation.file)} rel="noreferrer" className="underline underline-offset-3">
        {citation.file}
      </a>
      {citation.section ? `, ${citation.section}` : ""}.
    </p>
  )
}

function Notes({ notes, label }: { notes: readonly Note[]; label: string }) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2" aria-label={label}>
      {notes.map((note) => (
        <li key={note.id} className="rounded-lg border p-4 text-sm" data-note={note.id}>
          <h4 className="font-medium">{note.title}</h4>
          <p className="mt-1 text-muted-foreground">{note.text}</p>
        </li>
      ))}
    </ul>
  )
}

export function D5TrustNotes() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <section aria-labelledby="scope-heading" className="space-y-3">
        <h3 id="scope-heading" className="text-sm font-medium">
          What it does not claim
        </h3>
        <ul className="max-w-prose list-disc space-y-1 pl-5 text-sm">
          {SCOPE.doesNot.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <Cited citation={SCOPE.citation} />
      </section>
      <section aria-labelledby="viability-heading" className="space-y-3">
        <h3 id="viability-heading" className="text-sm font-medium">
          Where the viability document promises more than the specification has
        </h3>
        <Notes notes={CORRECTIONS_TO_VIABILITY} label="Corrections to the viability document" />
        <p className="text-xs text-muted-foreground">
          The viability document is{" "}
          <a
            href={sourceUrl(VIABILITY_DOCUMENT)}
            rel="noreferrer"
            className="underline underline-offset-3"
          >
            {VIABILITY_DOCUMENT}
          </a>
          ; what the specification has is the write-up's.
        </p>
      </section>
      <section aria-labelledby="judging-heading" className="space-y-3">
        <h3 id="judging-heading" className="text-sm font-medium">
          How it judges an answer
        </h3>
        <Notes notes={JUDGING} label="How it judges" />
        <Cited citation={JUDGING_CITATION} />
      </section>
      <section aria-labelledby="limits-heading" className="space-y-3">
        <h3 id="limits-heading" className="text-sm font-medium">
          Its own limits
        </h3>
        <Notes notes={TRUST} label="Limits" />
        <Cited citation={TRUST_CITATION} />
      </section>
      <section aria-labelledby="corrections-heading" className="space-y-3">
        <h3 id="corrections-heading" className="text-sm font-medium">
          What the run corrected along the way
        </h3>
        <Notes notes={CORRECTIONS} label="Corrections" />
        <Cited citation={CORRECTIONS_CITATION} />
      </section>
    </div>
  )
}
