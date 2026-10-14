// The runs a Domain 5 page reads its evidence from: the shared composite over Domain 5's index
// (src/features/shared/evidence/use-evidence.ts), each metric filed under the suite its id names.

import type { D5RunsIndexV1 } from "@/data/schema/generated"
import { suiteOfMetric, type D5Metric } from "@/features/d5/model/metrics"
import {
  useDomainEvidence,
  type Evidence as DomainEvidence,
  type SuiteEvidence as DomainSuiteEvidence,
} from "@/features/shared/evidence/use-evidence"

export type { PanelSource } from "@/features/shared/evidence/use-evidence"

export type SuiteEvidence = DomainSuiteEvidence<D5Metric>

export type Evidence = DomainEvidence<"d5">

export function useEvidence(
  index: D5RunsIndexV1,
  pin: string | undefined,
  summarySuites: readonly string[],
): Evidence {
  return useDomainEvidence("d5", index, pin, summarySuites, suiteOfMetric)
}
