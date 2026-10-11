import { Link, useParams } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Skeleton } from "@/components/ui/skeleton"
import { documentOf, useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunIndexV1 } from "@/data/schema/generated"
import { newestRunWithSuite, parseRunId } from "@/features/d1/model/runs"
import { sweepRows } from "@/features/d1/model/scale"
import { runHasSuite, suiteSummaryPath } from "@/features/d1/model/suite"

import { SweepsTable } from "./sweeps-table"

const S7_SUMMARY = suiteSummaryPath("S7")

/**
 * A run's budget sweeps (ui-plan.md 8.8): the list from S7's summary, each row opening the viewer.
 * The run's index is the gate; a run without S7 points at the newest run that has it.
 */
export function SweepsPage() {
  const { runId = "" } = useParams()
  const parts = parseRunId(runId)
  const runsIndex = useRunsIndex()
  const index = useRunDocument(parts ? runId : undefined, "index.json", "run-index")
  const runIndex = documentOf(index.data)
  const hasS7 = runIndex ? runHasSuite(runIndex, "S7") : false
  const summary = useRunDocument(runId, S7_SUMMARY, "suite-summary", { enabled: hasS7 })

  const indexRegion: RegionState<RunIndexV1> = parts
    ? regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
    : { status: "empty", message: `${runId} is not a run id.` }

  return (
    <DashboardPage
      title="Shedding"
      width="wide"
      description={
        <span>
          The budget sweeps of run{" "}
          <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
            {runId}
          </Link>
          : one snapshot per shape assembled at every budget from its full size down to refusal, on
          every adapter, with the frames refined to single-token boundaries where the answer
          changes. Open one to replay it.
        </span>
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-64 w-full" />}
      >
        {(run) => {
          if (!runHasSuite(run, "S7")) {
            const newest = runsIndex.data?.ok
              ? newestRunWithSuite(runsIndex.data.document, "S7")
              : undefined
            return (
              <DataRegion
                state={{
                  status: "absent",
                  what: "S7's sweeps",
                  newest: newest
                    ? { runId: newest.run_id, to: `/d1/runs/${newest.run_id}/sweeps` }
                    : undefined,
                }}
                label="the sweeps"
              >
                {() => null}
              </DataRegion>
            )
          }
          return (
            <DataRegion
              state={regionOfDocument(summary, `${runId}/${S7_SUMMARY}`, "S7's summary")}
              label="S7's summary"
              skeleton={<Skeleton className="h-64 w-full" />}
            >
              {(document) =>
                document.scale ? (
                  <PageSection
                    title="Sweeps"
                    id="sweeps"
                    description={
                      <span>
                        From S7&apos;s summary; the{" "}
                        <Link
                          to={`/d1/runs/${runId}/suites/S7`}
                          className="underline underline-offset-3"
                        >
                          suite page
                        </Link>{" "}
                        has the grid and the threshold searches, and{" "}
                        <Link
                          to={`/d1/runs/${runId}/perf`}
                          className="underline underline-offset-3"
                        >
                          performance
                        </Link>{" "}
                        the timings.
                      </span>
                    }
                  >
                    <SweepsTable
                      runId={runId}
                      rows={sweepRows(document.scale, run)}
                      shapes={document.scale.shapes}
                    />
                  </PageSection>
                ) : (
                  <DataRegion
                    state={{
                      status: "empty",
                      message: "S7's summary in this run has no scale block, so no sweeps to list.",
                    }}
                    label="the sweeps"
                  >
                    {() => null}
                  </DataRegion>
                )
              }
            </DataRegion>
          )
        }}
      </DataRegion>
    </DashboardPage>
  )
}
