import { Download } from "lucide-react"

import { PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useResultsSource, useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import { MetricCards } from "@/features/d1/components/metric-card"
import { formatPercent } from "@/lib/format"

import { OpenBlockNote } from "./open-block-note"
import { crossMetrics, type SuitePanelProps } from "./types"

const SUMMARY_PATH = "summarizer/summary.json"

/** S11 (ui-plan.md 8.4): the summarizer's mode, arms and judgments; the curves wait on types. */
export function S11Summarizer({ runId, summary, index }: SuitePanelProps) {
  const source = useResultsSource()
  const listed = index.files.some((file) => file.path === SUMMARY_PATH)
  const document = useRunDocument(runId, SUMMARY_PATH, "summarizer-summary", { enabled: listed })
  return (
    <PageSection
      title="Producer pipeline and the summarizer"
      id="panel"
      description="The three arms (off, stub, llm), how the summarizer was run, and what the harness judged of it."
    >
      <MetricCards metrics={crossMetrics(summary)} />
      {listed ? (
        <DataRegion
          state={regionOfDocument(document, `${runId}/${SUMMARY_PATH}`, "The summarizer summary")}
          label="the summarizer summary"
          skeleton={<Skeleton className="h-32 w-full" />}
        >
          {(doc) => (
            <Card>
              <CardHeader>
                <CardTitle>How the summarizer was run</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                  <dt className="text-muted-foreground">Mode</dt>
                  <dd className="font-mono text-xs">{doc.mode}</dd>
                  <dt className="text-muted-foreground">Arms</dt>
                  <dd className="font-mono text-xs">{doc.arms.join(", ")}</dd>
                  <dt className="text-muted-foreground">Fidelity band</dt>
                  <dd className="tabular text-xs">
                    {formatPercent(doc.fidelity_band[0])} to {formatPercent(doc.fidelity_band[1])}
                  </dd>
                  <dt className="text-muted-foreground">Errors</dt>
                  <dd className="text-xs">
                    {doc.errors.length === 0 ? "none" : doc.errors.join("; ")}
                  </dd>
                  <dt className="text-muted-foreground">Files</dt>
                  <dd className="flex flex-wrap gap-3 text-xs">
                    {[doc.files.variants, doc.files.calls].map((path) => (
                      <a
                        key={path}
                        href={source.url(runId, path)}
                        download
                        className="inline-flex items-center gap-1 underline underline-offset-3"
                      >
                        <Download aria-hidden="true" className="size-3" /> {path}
                      </a>
                    ))}
                  </dd>
                </dl>
              </CardContent>
            </Card>
          )}
        </DataRegion>
      ) : (
        <DataRegion state={{ status: "absent", what: SUMMARY_PATH }} label="the summarizer summary">
          {() => null}
        </DataRegion>
      )}
      <OpenBlockNote
        what="The fidelity matrix, the repeat stability, the flip rates and the fit-utility curves"
        ask="Section 14 asks the harness to type the summarizer summary's by_arm block."
      />
    </PageSection>
  )
}
