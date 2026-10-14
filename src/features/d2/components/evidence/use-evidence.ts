// The runs a Domain 2 page reads its evidence from: the shared composite over Domain 2's index
// (src/features/shared/evidence/use-evidence.ts), with each asked-for suite summary's typed
// by_arm blocks laid out by shape (model/blocks.ts).

import type { D2RunsIndexV1, D2SuiteSummaryV1 } from "@/data/schema/generated"
import { armBlocks, type ArmBlocks } from "@/features/d2/model/blocks"
import type { D2Metric } from "@/features/d2/model/metrics"
import {
  useDomainEvidence,
  type Evidence as DomainEvidence,
  type SuiteEvidence as DomainSuiteEvidence,
  type SuiteSummaryState,
} from "@/features/shared/evidence/use-evidence"

export type { PanelSource } from "@/features/shared/evidence/use-evidence"

/** One suite's typed metrics from the run the composite reads it from. */
export type SuiteEvidence = DomainSuiteEvidence<D2Metric>

/** A suite summary's typed blocks: loading, unreadable, or read. */
export type BlocksState =
  | Exclude<SuiteSummaryState<D2SuiteSummaryV1>, { status: "ok" }>
  | { status: "ok"; blocks: ArmBlocks; summary: D2SuiteSummaryV1 }

export type Evidence = DomainEvidence<"d2"> & {
  /** The suite's own summary with its by_arm blocks, for the suites the page asked for. */
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
  const evidence = useDomainEvidence("d2", index, pin, blockSuites)
  return {
    ...evidence,
    blocksOf: (suite) => {
      const state = evidence.suiteSummaryOf(suite)
      return state.status === "ok"
        ? { status: "ok", blocks: armBlocks(state.summary), summary: state.summary }
        : state
    },
  }
}
