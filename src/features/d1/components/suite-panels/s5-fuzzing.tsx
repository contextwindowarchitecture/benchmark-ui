import { PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import { MetricCards } from "@/features/d1/components/metric-card"
import { formatCount } from "@/lib/format"

import { OpenBlockNote } from "./open-block-note"
import { metricsNamed, type SuitePanelProps } from "./types"

const CROSS = [
  "s5.agreement",
  "s5.rejection_agreement",
  "s5.tag_coverage",
  "s5.generator_errors",
  "s5.findings_minimized",
]

/** S5 (ui-plan.md 8.4): the generated corpora and the agreement across adapters. */
export function S5Fuzzing({ runId, summary, index }: SuitePanelProps) {
  return (
    <PageSection
      title="Generative fuzzing"
      id="panel"
      description="Generated snapshots every adapter answered alike, and mutants every adapter rejected."
    >
      <MetricCards metrics={metricsNamed(summary, CROSS)} />
      <div className="grid gap-4 md:grid-cols-2">
        {summary.corpora.map((corpus) => (
          <CorpusCard
            key={corpus.id}
            runId={runId}
            id={corpus.id}
            count={corpus.count}
            listed={index.files.some((file) => file.path === `corpora/${corpus.id}/index.json`)}
          />
        ))}
      </div>
      <OpenBlockNote
        what="The steering rounds, the family weights and the mutants rejected per operator"
        ask="Section 14 asks the harness to type the summary's generated block and the corpus index's rounds."
      />
    </PageSection>
  )
}

function CorpusCard({
  runId,
  id,
  count,
  listed,
}: {
  runId: string
  id: string
  count: number
  listed: boolean
}) {
  const path = `corpora/${id}/index.json`
  const corpus = useRunDocument(runId, path, "corpus-index", { enabled: listed })
  return (
    <Card className="min-w-0" data-corpus={id}>
      <CardHeader>
        <CardTitle>
          <span className="font-mono">{id}</span> · {formatCount(count)} snapshots
        </CardTitle>
      </CardHeader>
      <CardContent>
        {listed ? (
          <DataRegion
            state={regionOfDocument(corpus, `${runId}/${path}`, `The ${id} corpus index`)}
            label="the corpus index"
            skeleton={<Skeleton className="h-16 w-full" />}
          >
            {(document) => (
              <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Generator</dt>
                <dd className="font-mono text-xs">{document.generator.module}</dd>
                <dt className="text-muted-foreground">Seed</dt>
                <dd className="font-mono text-xs">{String(document.generator.seed)}</dd>
                <dt className="text-muted-foreground">Rounds</dt>
                <dd className="tabular text-xs">{formatCount(document.rounds.length)}</dd>
                <dt className="text-muted-foreground">Indexed</dt>
                <dd className="tabular text-xs">
                  {formatCount(document.snapshots.length)} of {formatCount(document.count)}{" "}
                  snapshots
                </dd>
              </dl>
            )}
          </DataRegion>
        ) : (
          <p className="text-sm text-muted-foreground">No corpus index in this run.</p>
        )}
      </CardContent>
    </Card>
  )
}
