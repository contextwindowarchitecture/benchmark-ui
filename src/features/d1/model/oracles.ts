// The four oracles (ui-plan.md 7.3, the write-up's "How it judges an answer") and the self-check
// metric ids that measure each, for the oracles diagram. The words are content; the numbers are
// the run's.

import type { SummaryMetric } from "./run"

export type OracleId = "expected" | "differential" | "auditor" | "metamorphic"

export type OracleWords = {
  id: OracleId
  name: string
  text: string
  /** The S0 metric ids that measure this oracle itself. */
  metricIds: readonly string[]
}

export const ORACLES: readonly OracleWords[] = [
  {
    id: "expected",
    name: "Expected output",
    text: "The specification's conformance corpus and labeled generators, whose every decision is known by construction. The only oracle that catches a mistake all four implementations share.",
    metricIds: [
      "s0.digest",
      "s0.digest_reference",
      "s0.payload_hash",
      "s0.input_tokens",
      "s0.render",
    ],
  },
  {
    id: "differential",
    name: "Differential agreement",
    text: "The four assemblers must agree on the outcome, the payload bytes and the normalized trace.",
    metricIds: [],
  },
  {
    id: "auditor",
    name: "Trace auditor (A1 to A16)",
    text: "Never assembles. From the snapshot, trace and payload alone it re-derives conservation, token accounting, protected integrity, tier order, ordering, reason validity and precedence, conflict decisions, and that no text was synthesized.",
    metricIds: ["s0.audit_expected", "s0.auditor.kill_rate"],
  },
  {
    id: "metamorphic",
    name: "Metamorphic relations (MR1 to MR14)",
    text: "Pairs of snapshots whose answers must relate in a known way: some changes must leave the answer untouched, others must change it exactly as predicted.",
    metricIds: [],
  },
]

/** The cross-adapter metrics of a summary that measure an oracle, in the oracle's order. */
export function oracleMetrics(
  oracle: OracleWords,
  metrics: readonly SummaryMetric[],
): SummaryMetric[] {
  return oracle.metricIds.flatMap((id) => {
    const metric = metrics.find((m) => m.id === id && m.adapter === null)
    return metric ? [metric] : []
  })
}
