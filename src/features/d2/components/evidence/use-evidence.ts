// The runs a Domain 2 page reads its evidence from (the UI-D2 plan's composite; UI-D2c): the run
// each suite is read from, `?run=` pinning one, each run's summary, the scripts' size, and the
// suite summaries whose typed blocks a page asks for. The overview and the question pages read
// runs this one way. A run the index lists but the volume no longer holds is found gone when its
// summary is asked for; the composite then reads past it, and every source says which run stands in.

import { useState } from "react"

import { useDocumentsOfRuns } from "@/data/queries"
import type { D2RunsIndexV1, D2SuiteSummaryV1, D2SummaryV1 } from "@/data/schema/generated"
import { armBlocks, type ArmBlocks } from "@/features/d2/model/blocks"
import { composite, type Composite } from "@/features/d2/model/composite"
import type { D2Metric } from "@/features/d2/model/metrics"

/** Where a panel's numbers come from: its run, linked, and the scripts' size. */
export type PanelSource = {
  runId: string
  suite: string
  size: string | null
  /** The run the rule would read, passed over because the volume no longer holds it. */
  insteadOf?: string
}

/** One suite's typed metrics from the run the composite reads it from. */
export type SuiteEvidence = { source: PanelSource; metrics: D2Metric[] }

/** A suite summary's typed blocks: loading, unreadable, or read. */
export type BlocksState =
  | { status: "pending" }
  | { status: "failed" }
  | { status: "ok"; blocks: ArmBlocks; summary: D2SuiteSummaryV1 }

export type Evidence = {
  view: Composite
  /** The scripts' size per run, from one of its script indexes. */
  sizes: ReadonlyMap<string, string>
  /** Some run's summary is still loading. */
  pending: boolean
  /** Runs whose summary failed for a reason other than being gone: a defect to show. */
  failed: string[]
  /** Whether some finished run has the suite. */
  has(suite: string): boolean
  metricsOf(suite: string): SuiteEvidence | null
  /** The suite's own summary, for the suites the page asked for. */
  blocksOf(suite: string): BlocksState
}

/**
 * The evidence of the runs the composite reads, with the suite summaries of `blockSuites` (the
 * typed by_arm, cost and model blocks) from the run each of those suites is read from.
 */
export function useEvidence(
  index: D2RunsIndexV1,
  pin: string | undefined,
  blockSuites: readonly string[],
): Evidence {
  // The runs found gone from the volume so far: a summary asked for and not there. The set only
  // grows, so the composite settles on the newest runs that are actually there.
  const [pruned, setPruned] = useState<ReadonlySet<string>>(() => new Set())
  const view = composite(index, pin, pruned)
  const runIds = view.runs.map((run) => run.run_id)
  const summaries = useDocumentsOfRuns(
    runIds.map((runId) => ({ runId, path: "summary.json" })),
    "d2/summary",
  )
  const gone = runIds.filter(
    (_, i) => summaries[i]?.isError && summaries[i].error.kind === "not-found",
  )
  if (gone.some((runId) => !pruned.has(runId))) {
    // Derived from this render's queries, not synchronized in an effect: React re-renders at
    // once with the grown set, and the composite reads past the run.
    setPruned(new Set([...pruned, ...gone]))
  }
  // The scripts' size: the runs index gives it (benchmark ask 17); for an index written before
  // the field, one of the run's script indexes, which the run sets for every family.
  const unsized = view.runs.filter((run) => !run.size).map((run) => run.run_id)
  const indexes = useDocumentsOfRuns(
    unsized.map((runId) => ({ runId, path: "index.json" })),
    "d2/run-index",
  )
  const sizePaths = unsized.map((runId, i) => {
    const files = indexes[i]?.data?.ok ? indexes[i].data.document.files : []
    const file = files.find((f) => f.kind === "conversation-index" || f.kind === "lq-index")
    return file ? { runId, path: file.path } : null
  })
  const conversationIndexes = useDocumentsOfRuns(
    sizePaths.flatMap((entry) => (entry && !entry.path.includes("/lq/") ? [entry] : [])),
    "d2/conversation-index",
  )
  const lqIndexes = useDocumentsOfRuns(
    sizePaths.flatMap((entry) => (entry && entry.path.includes("/lq/") ? [entry] : [])),
    "d2/lq-index",
  )
  const sizes = new Map<string, string>(
    view.runs.flatMap((run) => (run.size ? [[run.run_id, run.size] as const] : [])),
  )
  for (const query of [...conversationIndexes, ...lqIndexes]) {
    if (query.data?.ok) sizes.set(query.data.document.run_id, query.data.document.size)
  }

  const summaryOf = new Map<string, D2SummaryV1>()
  runIds.forEach((runId, i) => {
    const query = summaries[i]
    if (query?.data?.ok) summaryOf.set(runId, query.data.document)
  })
  const pending = summaries.some((query) => query.isPending)

  // Each asked-for suite's own summary, in the run the composite reads the suite from.
  const blockPaths = blockSuites.flatMap((suite) => {
    const entry = view.suites.find((s) => s.suite === suite)
    const path = entry
      ? summaryOf.get(entry.run.run_id)?.suites.find((s) => s.id === suite)?.summary
      : undefined
    return entry && path ? [{ suite, runId: entry.run.run_id, path }] : []
  })
  const blockQueries = useDocumentsOfRuns(blockPaths, "d2/suite-summary")

  // A summary that failed for any reason but being gone: that is a defect to show, not to read past.
  const failed = summaries.flatMap((query, i) =>
    (query.isError && query.error.kind !== "not-found") || (query.data && !query.data.ok)
      ? [runIds[i] as string]
      : [],
  )

  return {
    view,
    sizes,
    pending,
    failed,
    has: (suite) => view.suites.some((s) => s.suite === suite),
    metricsOf: (suite) => {
      const entry = view.suites.find((s) => s.suite === suite)
      if (!entry) return null
      const summary = summaryOf.get(entry.run.run_id)
      if (!summary) return null
      return {
        source: {
          runId: entry.run.run_id,
          suite,
          size: sizes.get(entry.run.run_id) ?? null,
          ...(entry.insteadOf ? { insteadOf: entry.insteadOf.run_id } : {}),
        },
        metrics: summary.metrics.filter((metric) => metric.suite === suite),
      }
    },
    blocksOf: (suite) => {
      const i = blockPaths.findIndex((entry) => entry.suite === suite)
      if (i < 0) {
        // No path yet: the run's summary is loading, or it loaded (or failed) without the suite.
        const entry = view.suites.find((s) => s.suite === suite)
        const k = entry ? runIds.indexOf(entry.run.run_id) : -1
        return k >= 0 && summaries[k]?.isPending ? { status: "pending" } : { status: "failed" }
      }
      const query = blockQueries[i]
      if (!query || query.isPending) return { status: "pending" }
      if (query.isError || !query.data.ok) return { status: "failed" }
      return {
        status: "ok",
        blocks: armBlocks(query.data.document),
        summary: query.data.document,
      }
    },
  }
}
