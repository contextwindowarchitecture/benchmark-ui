// What a Domain 2 evidence page shows around its panels (the UI-D2 plan; UI-D2c): the run picker,
// each panel's source, the composite's notices (a pinned run the index does not list, a run read
// past because it is gone, a summary that cannot be read), and a suite's panel in every state.

import type { ReactNode } from "react"
import { Link } from "react-router"

import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { D2RunsIndexV1, D2SuiteSummaryV1 } from "@/data/schema/generated"
import { isFinished } from "@/features/d1/model/runs"
import type { ArmBlocks } from "@/features/d2/model/blocks"
import type { Composite } from "@/features/d2/model/composite"

import type { Evidence, PanelSource, SuiteEvidence } from "./use-evidence"

export function SourceNote({ source }: { source: PanelSource }) {
  return (
    <p className="text-xs text-muted-foreground" data-source={source.suite}>
      {source.suite} of run{" "}
      <Link
        to={`/d2/runs/${source.runId}/suites/${source.suite}`}
        className="font-mono underline underline-offset-3"
      >
        {source.runId}
      </Link>
      {source.size ? `, ${source.size} size` : ""}
      {source.insteadOf ? (
        <>
          , read instead of{" "}
          <Link
            to={`/d2/runs/${source.insteadOf}`}
            className="font-mono underline underline-offset-3"
          >
            {source.insteadOf}
          </Link>
          , which the index lists but the volume no longer holds
        </>
      ) : null}
      .
    </p>
  )
}

const BY_SUITE = "by-suite"

/** The runs the page reads: each suite's newest reported run, or one run pinned. */
export function RunPin({
  index,
  pinned,
  onChange,
}: {
  index: D2RunsIndexV1
  pinned: string | undefined
  onChange: (run: string | undefined) => void
}) {
  const runs = index.runs.filter(isFinished)
  return (
    <div
      className="flex max-w-full min-w-0 flex-wrap items-center gap-3"
      role="group"
      aria-label="Runs read"
    >
      <label className="flex max-w-full min-w-0 items-center gap-2 text-sm">
        <span className="text-muted-foreground">Read</span>
        <Select
          value={pinned && runs.some((run) => run.run_id === pinned) ? pinned : BY_SUITE}
          onValueChange={(value) => onChange(value === BY_SUITE ? undefined : value)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Run to read"
            className="w-80 max-w-full min-w-0 font-mono text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BY_SUITE} className="text-xs">
              each suite's newest reported run
            </SelectItem>
            {runs.map((run) => (
              <SelectItem key={run.run_id} value={run.run_id} className="font-mono text-xs">
                {run.run_id}
                {run.ci_profile ? ` · ${run.ci_profile}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {pinned ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
          Reset
        </Button>
      ) : null}
    </div>
  )
}

export function UnknownPinNotice({ view }: { view: Composite }) {
  if (!view.unknownPin) return null
  return (
    <Alert data-state="unknown-run">
      <AlertTitle>The address names a run the index does not list</AlertTitle>
      <AlertDescription>
        <span className="font-mono">{view.unknownPin}</span> is not in Domain 2's index; each suite
        is read from its newest reported run instead.
      </AlertDescription>
    </Alert>
  )
}

export function NoRunsNotice() {
  return (
    <Alert data-state="no-runs">
      <AlertTitle>No finished run yet</AlertTitle>
      <AlertDescription>
        Domain 2's index lists no finished run, so there is no evidence to show.{" "}
        <Link to="/d2/runs" className="underline underline-offset-3">
          The runs list
        </Link>{" "}
        has what exists.
      </AlertDescription>
    </Alert>
  )
}

export function PassedOverNotice({ view }: { view: Composite }) {
  if (view.passedOver.length === 0) return null
  return (
    <Alert data-state="passed-over">
      <AlertTitle>A run the index lists is no longer on the volume</AlertTitle>
      <AlertDescription>
        <p>
          {view.passedOver.map((run) => (
            <Link
              key={run.run_id}
              to={`/d2/runs/${run.run_id}`}
              className="mr-2 font-mono underline underline-offset-3"
            >
              {run.run_id}
            </Link>
          ))}
          {view.passedOver.length === 1 ? "was" : "were"} pruned, so each suite it would have been
          read for is read from the next run that has it; the table says which.
        </p>
      </AlertDescription>
    </Alert>
  )
}

export function UnreadableNotice({ failed }: { failed: readonly string[] }) {
  if (failed.length === 0) return null
  return (
    <Alert variant="destructive" data-state="unreadable">
      <AlertTitle>A run's summary could not be read</AlertTitle>
      <AlertDescription>
        {failed.map((runId) => (
          <Link
            key={runId}
            to={`/d2/runs/${runId}`}
            className="mr-2 font-mono underline underline-offset-3"
          >
            {runId}
          </Link>
        ))}
      </AlertDescription>
    </Alert>
  )
}

/**
 * One suite's panel in every state: drawn from its metrics, loading while its run's summary
 * loads, not in any run, or unreadable.
 */
export function SuitePanel({
  evidence,
  suite,
  children,
}: {
  evidence: Evidence
  suite: string
  children: (entry: SuiteEvidence) => ReactNode
}) {
  const entry = evidence.metricsOf(suite)
  if (entry) return children(entry)
  const has = evidence.has(suite)
  if (has && evidence.pending) return <Skeleton className="h-64 w-full" />
  const state: RegionState<never> = has
    ? { status: "empty", message: `${suite}'s run could not be read; its run page says why.` }
    : { status: "absent", what: suite }
  return (
    <DataRegion state={state} label={suite}>
      {() => null}
    </DataRegion>
  )
}

/** A panel drawn from a suite's own summary: loading, unreadable, or its typed blocks. */
export function BlocksPanel({
  evidence,
  suite,
  children,
}: {
  evidence: Evidence
  suite: string
  children: (blocks: ArmBlocks, summary: D2SuiteSummaryV1) => ReactNode
}) {
  const state = evidence.blocksOf(suite)
  if (state.status === "pending") return <Skeleton className="h-40 w-full" />
  if (state.status === "failed") {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        {suite}'s own summary could not be read; its suite page says why.
      </p>
    )
  }
  return children(state.blocks, state.summary)
}
