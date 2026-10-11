// The shedding viewer's page (ui-plan.md 8.8, 9): the run's index is the gate, as on every run
// page; a run without S7 points at the newest run that has it, and a sweep the index does not list
// says so. The sweep loads whole in the worker under the whole-file budget, and every state of
// that load is its own; the viewer itself is sweep-viewer.tsx. Loaded lazily with GSAP and D3.

import { Download } from "lucide-react"
import { Link, useParams } from "react-router"

import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { documentOf, useResultsSource, useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunIndexV1 } from "@/data/schema/generated"
import { useSweep, useSweepFrames, type SweepHandle } from "@/data/use-sweep"
import { newestRunWithSuite, parseRunId } from "@/features/d1/model/runs"
import { runHasSuite } from "@/features/d1/model/suite"
import { sweepPath, type SweepSummary } from "@/features/d1/model/sweep-curve"
import { formatBytes, formatCount } from "@/lib/format"

import { SweepViewer } from "./sweep-viewer"

const DIGEST = /^[0-9a-f]{64}$/

export function ViewerPage() {
  const { runId = "", digest = "" } = useParams()
  const parts = parseRunId(runId)
  const validDigest = DIGEST.test(digest)
  const source = useResultsSource()
  const runsIndex = useRunsIndex()
  const index = useRunDocument(parts && validDigest ? runId : undefined, "index.json", "run-index")
  const runIndex = documentOf(index.data)
  const path = sweepPath(digest)
  const listed = runIndex?.files.some((file) => file.path === path) ?? false
  const sweep = useSweep(runId, path, { enabled: listed })
  const frames = useSweepFrames(runId, path, { enabled: sweep.status === "ready" })
  const summary = sweep.status === "ready" ? sweep.summary : undefined

  const indexRegion: RegionState<RunIndexV1> = !parts
    ? { status: "empty", message: `${runId} is not a run id.` }
    : !validDigest
      ? { status: "empty", message: `${digest} is not a sweep's digest.` }
      : regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)

  return (
    <DashboardPage
      title={summary ? `Shedding · ${summary.cell.shape}` : "Shedding viewer"}
      width="wide"
      description={
        <span>
          {summary ? (
            <>
              {formatCount(summary.cell.candidates)} candidates of{" "}
              {formatCount(summary.cell.candidate_tokens)} tokens ({summary.cell.tokenizer},{" "}
              {summary.cell.renderer}), assembled at every budget from {formatCount(summary.full)}{" "}
              down to refusal.{" "}
            </>
          ) : (
            "A budget sweep replayed frame by frame. "
          )}
          In run{" "}
          <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
            {runId}
          </Link>
          ;{" "}
          <Link to={`/d1/runs/${runId}/sweeps`} className="underline underline-offset-3">
            every sweep of the run
          </Link>
          .
        </span>
      }
      actions={
        listed ? (
          <a
            href={source.url(runId, path)}
            download
            className="inline-flex items-center gap-1 text-sm underline underline-offset-3"
          >
            <Download aria-hidden="true" className="size-4" /> The sweep file
          </a>
        ) : null
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-96 w-full" />}
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
                label="the sweep"
              >
                {() => null}
              </DataRegion>
            )
          }
          if (!listed) {
            return (
              <DataRegion
                state={{
                  status: "empty",
                  message: `This run lists no sweep ${digest.slice(0, 7)}. Its sweeps are on the run's shedding page.`,
                }}
                label="the sweep"
              >
                {() => null}
              </DataRegion>
            )
          }
          return <SweepRegion runId={runId} run={run} path={path} sweep={sweep} frames={frames} />
        }}
      </DataRegion>
    </DashboardPage>
  )
}

function SweepRegion({
  runId,
  run,
  path,
  sweep,
  frames,
}: {
  runId: string
  run: RunIndexV1
  path: string
  sweep: SweepHandle
  frames: ReturnType<typeof useSweepFrames>
}) {
  const source = useResultsSource()
  if (sweep.status === "over-budget") {
    return (
      <Alert data-state="over-budget">
        <Download />
        <AlertTitle>This sweep is too large to replay here</AlertTitle>
        <AlertDescription>
          {formatBytes(sweep.bytes)} exceeds the {formatBytes(sweep.budget)} this viewer loads
          whole.{" "}
          <a href={source.url(runId, path)} download className="underline underline-offset-3">
            Download {path}
          </a>
          .
        </AlertDescription>
      </Alert>
    )
  }
  const state: RegionState<SweepSummary> =
    sweep.status === "idle" || sweep.status === "loading"
      ? { status: "loading" }
      : sweep.status === "ready"
        ? { status: "ok", data: sweep.summary }
        : sweep.status === "error"
          ? { status: "error", error: sweep.error, retry: sweep.retry }
          : sweep.status === "not-found"
            ? { status: "not-found", what: `The sweep ${path}` }
            : sweep.status === "unsupported"
              ? { status: "unsupported", schema: sweep.schema, path: `${runId}/${path}` }
              : { status: "invalid", path: `${runId}/${path}`, issues: sweep.issues }
  return (
    <DataRegion state={state} label="the sweep" skeleton={<Skeleton className="h-96 w-full" />}>
      {(summary) => <SweepViewer runId={runId} summary={summary} frames={frames} runIndex={run} />}
    </DataRegion>
  )
}
