import { Link, useParams } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { documentOf, useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunIndexV1, SuiteSummaryV1 } from "@/data/schema/generated"
import { groupMetricsBySuite } from "@/features/d1/model/run"
import { isRowKind } from "@/features/d1/model/row-kinds"
import { newestRunWithSuite, parseRunId } from "@/features/d1/model/runs"
import {
  isSuiteId,
  runHasSuite,
  suiteDurationMs,
  suiteEntry,
  suiteFile,
  suiteFindingsCount,
  suiteSummaryPath,
  unavailableAdapters,
} from "@/features/d1/model/suite"
import { formatDuration, formatUtc, isoUtc } from "@/lib/format"

import { MetricsTable } from "./metrics-table"
import { SuiteHeader } from "./suite-header"
import { SuitePanel } from "./suite-panels"
import { SuiteRows } from "./suite-rows"

/**
 * One suite of one run (ui-plan.md 8.4): the common header, the metrics, the suite's own panel and
 * its rows. The run's index.json is the gate, as on the run page; its suite list decides "not in
 * this run" before the suite summary is fetched.
 */
export function SuitePage() {
  const { runId = "", suite = "" } = useParams()
  const parts = parseRunId(runId)
  const validSuite = isSuiteId(suite)
  const runsIndex = useRunsIndex()
  const index = useRunDocument(parts && validSuite ? runId : undefined, "index.json", "run-index")
  const runIndex = documentOf(index.data)
  const included = runIndex ? runHasSuite(runIndex, suite) : false
  const summary = useRunDocument(runId, "summary.json", "summary", { enabled: included })
  const runSummary = documentOf(summary.data)
  const entry = runSummary ? suiteEntry(runSummary, suite) : undefined
  const detail = useRunDocument(runId, entry?.summary ?? suiteSummaryPath(suite), "suite-summary", {
    enabled: included,
  })
  const contract = useRunDocument(runId, "contract.json", "contract", { enabled: included })

  const indexRegion: RegionState<RunIndexV1> = !parts
    ? { status: "empty", message: `${runId} is not a run id.` }
    : !validSuite
      ? { status: "empty", message: `${suite} is not a suite id.` }
      : regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)

  const suiteSummary = documentOf(detail.data)
  const title = suiteSummary?.title ?? entry?.title
  const status = suiteSummary?.status ?? entry?.status

  return (
    <DashboardPage
      title={title ? `${suite} · ${title}` : suite}
      width="wide"
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {status ? <StatusBadge status={status} /> : null}
          <span>
            In run{" "}
            <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
              {runId}
            </Link>
          </span>
          {suiteSummary ? (
            <span>
              Started{" "}
              <time dateTime={isoUtc(suiteSummary.started_at)}>
                {formatUtc(suiteSummary.started_at)}
              </time>
              {" · "}
              {formatDuration(suiteDurationMs(suiteSummary))}
            </span>
          ) : null}
        </span>
      }
      status={
        suiteSummary && runSummary && suiteSummary.status === "partial" ? (
          <PartialNote summary={suiteSummary} unavailable={unavailableAdapters(runSummary)} />
        ) : null
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(run) => {
          if (!runHasSuite(run, suite)) {
            const newest = runsIndex.data?.ok
              ? newestRunWithSuite(runsIndex.data.document, suite)
              : undefined
            const absent: RegionState<never> = {
              status: "absent",
              what: `Suite ${suite}`,
              newest: newest
                ? { runId: newest.run_id, to: `/d1/runs/${newest.run_id}/suites/${suite}` }
                : undefined,
            }
            return (
              <DataRegion state={absent} label="the suite">
                {() => null}
              </DataRegion>
            )
          }
          const detailRegion = regionOfDocument(
            detail,
            `${runId}/${suiteSummaryPath(suite)}`,
            `Suite ${suite}`,
          )
          const results = suiteFile(run, suite, "results.jsonl")
          const kind = results?.kind && isRowKind(results.kind) ? results.kind : null
          return (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
              <DataRegion
                state={detailRegion}
                label="the suite summary"
                skeleton={<Skeleton className="h-64 w-full" />}
              >
                {(document) => (
                  <>
                    <PageSection
                      title="Overview"
                      id="overview"
                      description="What the suite covered, from its summary and the contract."
                    >
                      <SuiteHeader
                        runId={runId}
                        suite={suite}
                        summary={document}
                        contract={documentOf(contract.data)}
                        index={run}
                        findings={runSummary ? suiteFindingsCount(runSummary, suite) : 0}
                      />
                    </PageSection>
                    <PageSection
                      title="Metrics"
                      id="metrics"
                      description="Every metric the suite judged, with the harness's target and judgment."
                    >
                      {document.metrics.length === 0 ? (
                        <p
                          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                          data-state="empty"
                        >
                          This suite judged no metrics.
                        </p>
                      ) : (
                        <MetricsTable
                          groups={groupMetricsBySuite(document.metrics)}
                          titles={new Map([[suite, document.title]])}
                          grouped={false}
                          caption={`Metrics of ${suite}, with the producer's judgment and target.`}
                          label="Suite metrics table"
                        />
                      )}
                    </PageSection>
                    <SuitePanel runId={runId} suite={suite} summary={document} index={run} />
                  </>
                )}
              </DataRegion>
              <PageSection
                title="Rows"
                id="rows"
                description="Every judged row of the suite, filterable; a case opens in the answer explorer where its blobs exist."
              >
                {results && kind ? (
                  <SuiteRows runId={runId} suite={suite} kind={kind} file={results} />
                ) : results ? (
                  <DataRegion
                    state={{ status: "unsupported", schema: results.schema, path: results.path }}
                    label="the rows"
                  >
                    {() => null}
                  </DataRegion>
                ) : (
                  <DataRegion
                    state={{ status: "absent", what: `suites/${suite}/results.jsonl` }}
                    label="the rows"
                  >
                    {() => null}
                  </DataRegion>
                )}
              </PageSection>
            </div>
          )
        }}
      </DataRegion>
    </DashboardPage>
  )
}

function PartialNote({
  summary,
  unavailable,
}: {
  summary: SuiteSummaryV1
  unavailable: { adapter: string; error: string | null }[]
}) {
  const suiteUnavailable = summary.adapters.filter((a) => a.status === "unavailable")
  const named =
    suiteUnavailable.length > 0
      ? suiteUnavailable.map((a) => ({ adapter: a.adapter, error: a.error }))
      : unavailable
  return (
    <Alert data-state="partial">
      <AlertTitle>A partial suite</AlertTitle>
      <AlertDescription>
        {named.length > 0 ? (
          <ul className="list-disc pl-4">
            {named.map((a) => (
              <li key={a.adapter}>
                {a.adapter} was unavailable{a.error ? `: ${a.error}` : "."}
              </li>
            ))}
          </ul>
        ) : (
          <p>Some of what the suite set out to judge was not available; its findings say which.</p>
        )}
      </AlertDescription>
    </Alert>
  )
}
