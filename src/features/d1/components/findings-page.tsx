import { PartyPopper } from "lucide-react"
import { Link, useParams } from "react-router"

import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { documentOf, useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunIndexV1 } from "@/data/schema/generated"
import { findingsFile } from "@/features/d1/model/findings"
import { parseRunId } from "@/features/d1/model/runs"
import { formatCount } from "@/lib/format"

import { SuiteRows } from "./suite-rows"

/** Every distinct failure of a run (ui-plan.md 8.6), filterable by adapter, suite, severity and oracle. */
export function FindingsPage() {
  const { runId = "" } = useParams()
  const parts = parseRunId(runId)
  const index = useRunDocument(parts ? runId : undefined, "index.json", "run-index")
  const summary = useRunDocument(runId, "summary.json", "summary", {
    enabled: index.data?.ok === true,
  })
  const totals = documentOf(summary.data)?.findings
  const indexRegion: RegionState<RunIndexV1> = parts
    ? regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
    : { status: "empty", message: `${runId} is not a run id.` }
  return (
    <DashboardPage
      title="Findings"
      width="wide"
      description={
        <span>
          Every distinct failure of run{" "}
          <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
            {runId}
          </Link>
          , errors first; a finding opens with its reproducer and its minimized draft.
        </span>
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(run) => {
          const file = findingsFile(run)
          if (totals && totals.total === 0) {
            return (
              <Alert data-state="none">
                <PartyPopper className="text-success" />
                <AlertTitle>No findings in this run</AlertTitle>
                <AlertDescription>
                  Every answer passed every oracle. The summary counts zero findings across{" "}
                  {formatCount(Object.keys(totals.by_suite).length)} suites.
                </AlertDescription>
              </Alert>
            )
          }
          if (!file) {
            return (
              <DataRegion state={{ status: "absent", what: "findings.jsonl" }} label="findings">
                {() => null}
              </DataRegion>
            )
          }
          return <SuiteRows runId={runId} suite="findings" kind="finding" file={file} autoOpen />
        }}
      </DataRegion>
    </DashboardPage>
  )
}
