// What this build is (ui-plan.md 3.1): its own commit, the benchmark commit the lock pins, and the
// schema kinds and major versions it reads. Shown in the footer beside each run's own provenance.

import { schemaKinds, type SchemaKind } from "@/data/schema/generated"
import { PRODUCER } from "@/data/validate"

export const buildInfo = {
  uiCommit: __UI_COMMIT__,
  benchmarkCommit: __BENCHMARK_COMMIT__,
  producer: PRODUCER,
  /** The kinds this build reads, each at its major version. */
  kinds: (Object.keys(schemaKinds) as SchemaKind[]).map((kind) => ({
    kind,
    version: schemaKinds[kind].version,
  })),
} as const
