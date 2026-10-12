// How far to trust Domain 2's evidence (ui-plan.md 7.1, item 3): the checks the evidence itself
// passed, as the harness judged them, then the write-up's words on how it judges an answer, what
// it does not show, its limits and what the run corrected on the way.

import { Link } from "react-router"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { sourceUrl, type Citation } from "@/content"
import {
  CORRECTIONS,
  CORRECTIONS_CITATION,
  CORRECTIONS_INTRO,
  JUDGING,
  JUDGING_CITATION,
  SCOPE,
  TRUST,
  TRUST_CITATION,
  type Note,
} from "@/content/d2/trust"
import type { D2Metric } from "@/features/d2/model/metrics"
import { formatTarget } from "@/lib/format"

import { MetricValue } from "../metric-value"

export function ChecksGrid({ checks }: { checks: { runId: string; metric: D2Metric }[] }) {
  if (checks.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        No run in the index measured the checks yet.
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3" data-checks>
      {checks.map(({ runId, metric }) => (
        <li key={metric.id}>
          <Card className="h-full gap-2 py-4" data-metric={metric.id}>
            <CardHeader className="px-4">
              <CardTitle className="flex items-start justify-between gap-2 text-sm font-medium">
                <span>{metric.label}</span>
                <StatusBadge status={metric.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-4">
              <div className="text-2xl font-semibold tabular [&_span]:items-start">
                <MetricValue metric={metric} />
              </div>
              <p className="text-xs text-muted-foreground">
                target {formatTarget(metric.unit, metric.target)} ·{" "}
                <Link
                  to={`/d2/runs/${runId}/suites/${metric.suite ?? ""}`}
                  className="font-mono underline underline-offset-3"
                >
                  {metric.id}
                </Link>
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

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

export function TrustNotes() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <section aria-labelledby="judging-heading" className="space-y-3">
        <h3 id="judging-heading" className="text-sm font-medium">
          How it judges an answer
        </h3>
        <Notes notes={JUDGING} label="How it judges an answer" />
        <Cited citation={JUDGING_CITATION} />
      </section>
      <section aria-labelledby="scope-heading" className="space-y-3">
        <h3 id="scope-heading" className="text-sm font-medium">
          What it measures, and what it does not show
        </h3>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {SCOPE.measures.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {SCOPE.doesNot.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <Cited citation={SCOPE.citation} />
      </section>
      <section aria-labelledby="limits-heading" className="space-y-3">
        <h3 id="limits-heading" className="text-sm font-medium">
          Its limits
        </h3>
        <Notes notes={TRUST} label="Its limits" />
        <Cited citation={TRUST_CITATION} />
      </section>
      <section aria-labelledby="corrections-heading" className="space-y-3">
        <h3 id="corrections-heading" className="text-sm font-medium">
          What the run corrected along the way
        </h3>
        <p className="text-sm text-muted-foreground">{CORRECTIONS_INTRO}</p>
        <Notes notes={CORRECTIONS} label="What the run corrected along the way" />
        <Cited citation={CORRECTIONS_CITATION} />
      </section>
    </div>
  )
}
