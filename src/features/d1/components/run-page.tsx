import { Link, useParams } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunIndexV1 } from "@/data/schema/generated"
import { fileByPath } from "@/features/d1/model/run"
import { parseRunId, runById, runDurationMs } from "@/features/d1/model/runs"
import { formatDuration, formatUtc, isoUtc } from "@/lib/format"

import { RunDrift } from "./run-drift"
import { RunFiles } from "./run-files"
import { RunFindings } from "./run-findings"
import { RunMatrix } from "./run-matrix"
import { RunMetrics } from "./run-metrics"
import { RunProvenance } from "./run-provenance"

/**
 * One run (ui-plan.md 8.3): what it was made from and what it concluded. The run's own
 * index.json is the gate: a 404 is the pruned state, and its file list decides which regions
 * are "not in this run" before anything else is fetched.
 */
export function RunPage() {
  const { runId = "" } = useParams()
  const parts = parseRunId(runId)
  const runsIndex = useRunsIndex()
  const index = useRunDocument(parts ? runId : undefined, "index.json", "run-index")
  const indexRegion: RegionState<RunIndexV1> = parts
    ? regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
    : { status: "empty", message: `${runId} is not a run id.` }
  const listed = runsIndex.data?.ok ? runById(runsIndex.data.document, runId) : undefined
  const summary = useRunDocument(parts ? runId : undefined, "summary.json", "summary", {
    enabled: index.data?.ok === true,
  })

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
              document, with {index.data.document.fixture.rows} rows per file and{" "}
              {index.data.document.fixture.frames} frames per sweep kept.
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
          <div className="grid gap-8">
            <PageSection
              title="Provenance"
              id="provenance"
              description="What this run was made from, from its manifest."
            >
              <RunProvenance runId={runId} />
            </PageSection>
            <PageSection
              title="Suites and adapters"
              id="matrix"
              description="Each suite's status for each adapter, from the suite summaries. A cell opens the suite."
            >
              <RunMatrix runId={runId} summary={summary} />
            </PageSection>
            <PageSection
              title="Metrics"
              id="metrics"
              description="Every metric the harness judged, grouped by suite."
            >
              <RunMetrics runId={runId} summary={summary} />
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
              <Link to="/d1/runs" className="underline underline-offset-3">
                All runs
              </Link>
            </p>
          </div>
        )}
      </DataRegion>
    </DashboardPage>
  )
}
