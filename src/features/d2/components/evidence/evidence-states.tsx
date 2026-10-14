// What a Domain 2 evidence page shows around its panels: the shared states (the run picker, the
// source note, the composite's notices, a suite's panel), and a panel drawn from a suite
// summary's typed by_arm, cost and model blocks.

import type { ReactNode } from "react"

import type { D2SuiteSummaryV1 } from "@/data/schema/generated"
import type { ArmBlocks } from "@/features/d2/model/blocks"
import { SuiteSummaryPanel } from "@/features/shared/evidence/evidence-states"

import type { Evidence } from "./use-evidence"

export {
  NoRunsNotice,
  PassedOverNotice,
  RunPin,
  SourceNote,
  SuitePanel,
  UnknownPinNotice,
  UnreadableNotice,
} from "@/features/shared/evidence/evidence-states"

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
  return (
    <SuiteSummaryPanel
      state={state.status === "ok" ? { status: "ok", summary: state } : state}
      suite={suite}
    >
      {(read) => children(read.blocks, read.summary)}
    </SuiteSummaryPanel>
  )
}
