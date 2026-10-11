// What this build is (ui-plan.md 3.1): its own commit, the benchmark commit the lock pins, and the
// schema kinds and major versions it reads, per producer. Shown in the footer beside each run's own
// provenance.

import { schemaDomains, schemaKinds, type SchemaKind } from "@/data/schema/generated"
import { schemaStringOf } from "@/data/validate"

export const buildInfo = {
  uiCommit: __UI_COMMIT__,
  benchmarkCommit: __BENCHMARK_COMMIT__,
  /** The producers whose documents this build reads, one per domain. */
  producers: Object.values(schemaDomains).map((domain) => domain.producer),
  /** The kinds this build reads, each at its major version, with the schema string it gates on. */
  kinds: (Object.keys(schemaKinds) as SchemaKind[]).map((kind) => ({
    kind,
    version: schemaKinds[kind].version,
    schema: schemaStringOf(kind),
  })),
} as const
