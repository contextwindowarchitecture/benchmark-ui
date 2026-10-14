// The runs a domain's evidence pages read (the UI-D2 plan's composite; UI-D2c; UI-D5): over that
// domain's own runs index, the run each suite is read from, `?run=` pinning one, each run's
// summary, and the suite summaries a page asks for. The overview and the question pages of every
// domain with model-side results read runs this one way. A run the index lists but the volume no
// longer holds is found gone when its summary is asked for; the composite then reads past it, and
// every source says which run stands in.

import { useState } from "react"

import { kindIn, type KindIn } from "@/data/kinds"
import { useDocumentsOfRuns } from "@/data/queries"
import type { DocumentByKind } from "@/data/schema/generated"
import type { RunsIndexV1 } from "@/features/d1/model/runs"
import { composite, type Composite } from "@/features/shared/model/composite"

/** The domains whose pages read evidence through the composite. */
export type EvidenceDomain = "d2" | "d5"

export type SummaryOf<D extends EvidenceDomain> = DocumentByKind[KindIn<D, "summary">]
export type SuiteSummaryOf<D extends EvidenceDomain> = DocumentByKind[KindIn<D, "suite-summary">]
export type MetricOf<D extends EvidenceDomain> = SummaryOf<D>["metrics"][number]

/** Where a panel's numbers come from: its run, linked, and its size as the runs index gives it. */
export type PanelSource = {
  runId: string
  suite: string
  size: string | null
  /** The run the rule would read, passed over because the volume no longer holds it. */
  insteadOf?: string
}

/** One suite's typed metrics from the run the composite reads it from. */
export type SuiteEvidence<M> = { source: PanelSource; metrics: M[] }

/** A suite's own summary: loading, unreadable, or read. */
export type SuiteSummaryState<S> =
  { status: "pending" } | { status: "failed" } | { status: "ok"; summary: S }

export type Evidence<D extends EvidenceDomain> = {
  view: Composite
  /** Each run's size, as the runs index gives it (benchmark ask 17). */
  sizes: ReadonlyMap<string, string>
  /** Some run's summary is still loading. */
  pending: boolean
  /** Runs whose summary failed for a reason other than being gone: a defect to show. */
  failed: string[]
  /** Whether some finished run has the suite. */
  has(suite: string): boolean
  metricsOf(suite: string): SuiteEvidence<MetricOf<D>> | null
  /** The suite's own summary, for the suites the page asked for. */
  suiteSummaryOf(suite: string): SuiteSummaryState<SuiteSummaryOf<D>>
}

/**
 * The evidence of the runs the composite reads over a domain's index, with the suite summaries
 * of `summarySuites` from the run each of those suites is read from.
 */
export function useDomainEvidence<D extends EvidenceDomain>(
  domain: D,
  index: RunsIndexV1,
  pin: string | undefined,
  summarySuites: readonly string[],
): Evidence<D> {
  // The runs found gone from the volume so far: a summary asked for and not there. The set only
  // grows, so the composite settles on the newest runs that are actually there.
  const [pruned, setPruned] = useState<ReadonlySet<string>>(() => new Set())
  const view = composite(index, pin, pruned)
  const runIds = view.runs.map((run) => run.run_id)
  const summaries = useDocumentsOfRuns(
    runIds.map((runId) => ({ runId, path: "summary.json" })),
    kindIn(domain, "summary"),
  )
  const gone = runIds.filter(
    (_, i) => summaries[i]?.isError && summaries[i].error.kind === "not-found",
  )
  if (gone.some((runId) => !pruned.has(runId))) {
    // Derived from this render's queries, not synchronized in an effect: React re-renders at
    // once with the grown set, and the composite reads past the run.
    setPruned(new Set([...pruned, ...gone]))
  }
  const sizes = new Map<string, string>(
    view.runs.flatMap((run) => (run.size ? [[run.run_id, run.size] as const] : [])),
  )

  const summaryOf = new Map<string, SummaryOf<D>>()
  runIds.forEach((runId, i) => {
    const query = summaries[i]
    if (query?.data?.ok) summaryOf.set(runId, query.data.document as SummaryOf<D>)
  })
  const pending = summaries.some((query) => query.isPending)

  // Each asked-for suite's own summary, in the run the composite reads the suite from.
  const summaryPaths = summarySuites.flatMap((suite) => {
    const entry = view.suites.find((s) => s.suite === suite)
    const path = entry
      ? summaryOf.get(entry.run.run_id)?.suites.find((s) => s.id === suite)?.summary
      : undefined
    return entry && path ? [{ suite, runId: entry.run.run_id, path }] : []
  })
  const suiteQueries = useDocumentsOfRuns(summaryPaths, kindIn(domain, "suite-summary"))

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
        metrics: (summary.metrics as MetricOf<D>[]).filter((metric) => metric.suite === suite),
      }
    },
    suiteSummaryOf: (suite) => {
      const i = summaryPaths.findIndex((entry) => entry.suite === suite)
      if (i < 0) {
        // No path yet: the run's summary is loading, or it loaded (or failed) without the suite.
        const entry = view.suites.find((s) => s.suite === suite)
        const k = entry ? runIds.indexOf(entry.run.run_id) : -1
        return k >= 0 && summaries[k]?.isPending ? { status: "pending" } : { status: "failed" }
      }
      const query = suiteQueries[i]
      if (!query || query.isPending) return { status: "pending" }
      if (query.isError || !query.data.ok) return { status: "failed" }
      return { status: "ok", summary: query.data.document as SuiteSummaryOf<D> }
    },
  }
}
