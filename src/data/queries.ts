// TanStack Query over the ResultsSource (ui-plan.md 5.2; DESIGN.md 6.2). A run is immutable once
// it stops running, so everything under a run id is cached for the session and never refetched;
// the runs index is the one document that changes and refetches on focus. Query keys carry the
// results root, the run id and the path, so a changed root never serves another root's cache.

import { QueryClient, useQuery, type UseQueryResult } from "@tanstack/react-query"
import { createContext, useContext } from "react"

import type { DocumentByKind, SchemaKind } from "./schema/generated"
import { type BlobRef, type ResultsSource, SourceError } from "./source"
import { parseDocumentAs, parseRows, type ParsedRows, type ParseResultOf } from "./validate"

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 404 is a state (pruned, not in this run), not a transient failure; so is non-JSON.
        retry: (failures, error) =>
          !(
            error instanceof SourceError &&
            (error.kind === "not-found" || error.kind === "parse")
          ) && failures < 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export const ResultsSourceContext = createContext<ResultsSource | null>(null)

export function useResultsSource(): ResultsSource {
  const source = useContext(ResultsSourceContext)
  if (!source) throw new Error("useResultsSource needs a ResultsSourceContext provider")
  return source
}

export const queryKeys = {
  index: (root: string) => ["results", root, "index"] as const,
  document: (root: string, runId: string, path: string) =>
    ["results", root, "run", runId, "document", path] as const,
  rows: (root: string, runId: string, path: string) =>
    ["results", root, "run", runId, "rows", path] as const,
  blob: (root: string, runId: string, digest: string) =>
    ["results", root, "run", runId, "blob", digest] as const,
}

/** The runs index: refetched on window focus and on mount, since it is the only thing that changes. */
export function useRunsIndex(): UseQueryResult<ParseResultOf<"runs-index">, SourceError> {
  const source = useResultsSource()
  return useQuery<ParseResultOf<"runs-index">, SourceError>({
    queryKey: queryKeys.index(source.root),
    queryFn: async ({ signal }) => parseDocumentAs(await source.index(signal), "runs-index"),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

const immutable = { staleTime: Infinity, gcTime: Infinity } as const

/** A JSON document of a run, validated as `kind`; cached for the session (the run is immutable). */
export function useRunDocument<K extends SchemaKind>(
  runId: string | undefined,
  path: string,
  kind: K,
  options: { enabled?: boolean } = {},
): UseQueryResult<ParseResultOf<K>, SourceError> {
  const source = useResultsSource()
  return useQuery<ParseResultOf<K>, SourceError>({
    queryKey: queryKeys.document(source.root, runId ?? "", path),
    queryFn: async ({ signal }) =>
      parseDocumentAs(await source.document(runId ?? "", path, signal), kind),
    enabled: runId !== undefined && (options.enabled ?? true),
    ...immutable,
  })
}

export type RowsState<K extends SchemaKind> =
  | ({ ok: true; bytes: number } & ParsedRows<K>)
  | { ok: false; reason: "over-budget"; rows: number; budget: number }

/** A JSONL file of a run, validated row by row within the main-thread budget. */
export function useRunRows<K extends SchemaKind>(
  runId: string | undefined,
  path: string,
  kind: K,
  options: { enabled?: boolean; expectedRows?: number } = {},
): UseQueryResult<RowsState<K>, SourceError> {
  const source = useResultsSource()
  return useQuery<RowsState<K>, SourceError>({
    queryKey: queryKeys.rows(source.root, runId ?? "", path),
    queryFn: async ({ signal }) => {
      const result = await source.rows(runId ?? "", path, {
        signal,
        expectedRows: options.expectedRows,
      })
      if (!result.ok) return result
      return { ok: true, bytes: result.bytes, ...parseRows(kind, result.rows, result.errors) }
    },
    enabled: runId !== undefined && (options.enabled ?? true),
    ...immutable,
  })
}

/** A content-addressed blob, cached by digest for the session. */
export function useRunBlob(
  runId: string | undefined,
  ref: BlobRef | undefined,
  options: { enabled?: boolean } = {},
): UseQueryResult<unknown, SourceError> {
  const source = useResultsSource()
  return useQuery<unknown, SourceError>({
    queryKey: queryKeys.blob(source.root, runId ?? "", ref?.digest ?? ""),
    queryFn: async ({ signal }) => source.blob(runId ?? "", ref as BlobRef, signal),
    enabled: runId !== undefined && ref !== undefined && (options.enabled ?? true),
    ...immutable,
  })
}

/** The document of a parsed result, or undefined for any of the non-ok states. */
export function documentOf<K extends SchemaKind>(
  result: ParseResultOf<K> | undefined,
): DocumentByKind[K] | undefined {
  return result?.ok ? result.document : undefined
}
