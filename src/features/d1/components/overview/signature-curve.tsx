import { Download } from "lucide-react"
import { Link } from "react-router"

import { SheddingCurve } from "@/components/charts/shedding-curve"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useResultsSource } from "@/data/queries"
import type { RunIndexV1 } from "@/data/schema/generated"
import type { SweepHandle } from "@/data/use-sweep"
import { sweepDigestOf, type SweepSummary } from "@/features/d1/model/sweep-curve"
import { formatBytes } from "@/lib/format"
import { useRevealOnce } from "@/lib/reveal-once"

/**
 * The overview's signature chart (ui-plan.md 8.1): the shedding curve of one sweep of the S7 run,
 * revealed once per session, linking to the viewer. Every state of the sweep's load is its own.
 */
export function SignatureCurve({
  runId,
  file,
  handle,
}: {
  runId: string
  file: RunIndexV1["files"][number]
  handle: SweepHandle
}) {
  const source = useResultsSource()
  const digest = sweepDigestOf(file.path) ?? file.path
  const download = source.url(runId, file.path)
  switch (handle.status) {
    case "idle":
    case "loading":
      return (
        <div role="status" aria-label="Loading the sweep" aria-busy="true">
          <Skeleton className="h-72 w-full" />
        </div>
      )
    case "over-budget":
      return (
        <Alert data-state="over-budget">
          <Download />
          <AlertTitle>This sweep is too large to draw here</AlertTitle>
          <AlertDescription>
            {formatBytes(handle.bytes)} exceeds the {formatBytes(handle.budget)} this viewer loads
            whole.{" "}
            <a href={download} download className="underline underline-offset-3">
              Download {file.path}
            </a>
            .
          </AlertDescription>
        </Alert>
      )
    default: {
      const state: RegionState<SweepSummary> =
        handle.status === "ready"
          ? { status: "ok", data: handle.summary }
          : handle.status === "error"
            ? { status: "error", error: handle.error, retry: handle.retry }
            : handle.status === "not-found"
              ? { status: "not-found", what: `The sweep ${file.path}` }
              : handle.status === "unsupported"
                ? { status: "unsupported", schema: handle.schema, path: `${runId}/${file.path}` }
                : { status: "invalid", path: `${runId}/${file.path}`, issues: handle.issues }
      return (
        <DataRegion state={state} label="the sweep">
          {(summary) => <Revealed runId={runId} digest={digest} summary={summary} />}
        </DataRegion>
      )
    }
  }
}

function Revealed({
  runId,
  digest,
  summary,
}: {
  runId: string
  digest: string
  summary: SweepSummary
}) {
  const { reveal, done } = useRevealOnce(`shedding:${runId}:${digest}`)
  return (
    <div className="space-y-2" data-reveal={reveal ? "pending" : "done"}>
      <SheddingCurve summary={summary} reveal={reveal} onRevealed={done} />
      <p className="text-sm">
        <Link to={`/d1/runs/${runId}/sweeps/${digest}`} className="underline underline-offset-3">
          Replay this sweep frame by frame
        </Link>{" "}
        <span className="text-muted-foreground">
          · or see{" "}
          <Link to={`/d1/runs/${runId}/sweeps`} className="underline underline-offset-3">
            every sweep of the run
          </Link>
        </span>
      </p>
    </div>
  )
}
