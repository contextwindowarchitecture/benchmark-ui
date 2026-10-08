// Turns a query into a region state (DESIGN.md 6.3), so pages switch on one shape.

import type { UseQueryResult } from "@tanstack/react-query"

import type { RegionState } from "@/components/dashboard/data-region"

import type { DocumentByKind, SchemaKind } from "./schema/generated"
import type { SourceError } from "./source"
import type { ParseResultOf } from "./validate"

export function regionOfDocument<K extends SchemaKind>(
  query: UseQueryResult<ParseResultOf<K>, SourceError>,
  path: string,
  what: string,
): RegionState<DocumentByKind[K]> {
  if (query.isPending) return { status: "loading" }
  if (query.isError) {
    if (query.error.kind === "not-found") return { status: "not-found", what }
    return { status: "error", error: query.error, retry: () => void query.refetch() }
  }
  const result = query.data
  if (result.ok) return { status: "ok", data: result.document }
  if (result.reason === "unsupported-schema")
    return { status: "unsupported", schema: result.schema, path }
  if (result.reason === "wrong-kind") {
    return {
      status: "unsupported",
      schema: `cwa-bench-d1/${result.actual}/v1 where ${result.expected} was expected`,
      path,
    }
  }
  return { status: "invalid", path, issues: result.issues }
}
