import { Link, useParams } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useDomainRunsIndex, useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { D2RunIndexV1 } from "@/data/schema/generated"
import { RunDrift } from "@/features/d1/components/run-drift"
import { RunFiles } from "@/features/d1/components/run-files"
import { RunFindings } from "@/features/d1/components/run-findings"
import { RunProvenance } from "@/features/d1/components/run-provenance"
import { fileByPath } from "@/features/d1/model/run"
import { parseRunId, runById, runDurationMs } from "@/features/d1/model/runs"
import { formatDuration, formatUtc, isoUtc } from "@/lib/format"

import { D2RunMetrics } from "./run-metrics"
import { D2RunScripts } from "./run-scripts"
import { D2RunSuites } from "./run-suites"

/**
 * One run of Domain 2 (ui-plan.md 8.3, the UI-D2 plan): what it was made from, what it generated
 * and what it measured. The run's own index.json is the gate, as on Domain 1's run page: a 404 is
 * the pruned state, and its file list decides what is not in this run.
 */
export function D2RunPage() {
  const { runId = "" } = useParams()
  const parts = parseRunId(runId)
  const runsIndex = useDomainRunsIndex("d2")
  const index = useRunDocument(parts ? runId : undefined, "index.json", "d2/run-index")
  const indexRegion: RegionState<D2RunIndexV1> = parts
    ? regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
    : { status: "empty", message: `${runId} is not a run id.` }
  const listed = runsIndex.data?.ok ? runById(runsIndex.data.document, runId) : undefined
  const summary = useRunDocument(parts ? runId : undefined, "summary.json", "d2/summary", {
    enabled: index.data?.ok === true,
  })
  const summaryRegion = regionOfDocument(summary, `${runId}/summary.json`, "the summary")

  const started = listed?.started_at ?? parts?.startedAt.toISOString()
  const finished =
    listed?.finished_at ?? (summary.data?.ok ? summary.data.document.finished_at : null)
  const status = listed?.status ?? (index.data?.ok ? index.data.document.status : undefined)

  return (
    <DashboardPage
      title={runId}
      width="wide"
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {status ? <StatusBadge status={status} /> : null}
          {listed?.ci_profile ? <Badge variant="outline">{listed.ci_profile}</Badge> : null}
          {started ? (
            <span>
              Started <time dateTime={isoUtc(started)}>{formatUtc(started)}</time>
            </span>
          ) : null}
          {started && finished ? (
            <span>
              Finished <time dateTime={isoUtc(finished)}>{formatUtc(finished)}</time> ·{" "}
              {formatDuration(runDurationMs({ started_at: started, finished_at: finished }))}
            </span>
          ) : null}
        </span>
      }
      status={
        index.data?.ok && index.data.document.fixture ? (
          <Alert>
            <AlertTitle>A fixture, not a whole run</AlertTitle>
            <AlertDescription>
              Cut by <code>cwabench fixture</code> from {index.data.document.fixture.of}: every
              document, with {index.data.document.fixture.rows} rows per file kept.
            </AlertDescription>
          </Alert>
        ) : null
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(runIndex) => (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
            <PageSection
              title="Provenance"
              id="provenance"
              description="What this run was made from, from its manifest."
            >
              <RunProvenance runId={runId} />
            </PageSection>
            <PageSection
              title="Suites"
              id="suites"
              description="Each suite's status and what it is for, from the run's summary. A suite opens its page."
            >
              <DataRegion
                state={summaryRegion}
                label="the suites"
                skeleton={<Skeleton className="h-48 w-full" />}
              >
                {(document) => <D2RunSuites runId={runId} summary={document} />}
              </DataRegion>
            </PageSection>
            <PageSection
              title="Scripts"
              id="scripts"
              description="The conversations and corpora this run generated, from their indexes."
            >
              <D2RunScripts runId={runId} index={runIndex} />
            </PageSection>
            <PageSection
              title="Metrics"
              id="metrics"
              description="Every metric the harness measured or judged, by suite, with the arm and tier it measures."
            >
              <DataRegion
                state={summaryRegion}
                label="the metrics"
                skeleton={<Skeleton className="h-64 w-full" />}
              >
                {(document) => <D2RunMetrics summary={document} />}
              </DataRegion>
            </PageSection>
            <PageSection
              title="Findings"
              id="findings"
              description="Every distinct failure, by suite and severity."
            >
              <RunFindings
                runId={runId}
                summary={summary}
                findingsFile={fileByPath(runIndex, "findings.jsonl")}
              />
            </PageSection>
            <PageSection
              title="Drift"
              id="drift"
              description="How this run compares with the previous run of its CI profile, from the harness's own report."
            >
              <RunDrift runId={runId} listed={fileByPath(runIndex, "ci.json") !== undefined} />
            </PageSection>
            <PageSection
              title="Files"
              id="files"
              description="Everything in the run directory, with its schema and whether this viewer reads it."
            >
              <RunFiles runId={runId} index={runIndex} />
            </PageSection>
            <p className="text-sm text-muted-foreground">
              <Link to="/d2/runs" className="underline underline-offset-3">
                All runs
              </Link>
              {" · "}
              <Link to="/d2" className="underline underline-offset-3">
                Domain 2 overview
              </Link>
            </p>
          </div>
        )}
      </DataRegion>
    </DashboardPage>
  )
}
