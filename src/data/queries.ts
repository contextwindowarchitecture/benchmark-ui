// TanStack Query over the ResultsSource (ui-plan.md 5.2; DESIGN.md 6.2). A run is immutable once
// it stops running, so everything under a run id is cached for the session and never refetched;
// the runs index is the one document that changes and refetches on focus. Query keys carry the
// results root, the domain, the run id and the path, so a changed root or another domain never
// serves another's cache.
//
// Each domain has its own source; the route tree says which domain a page belongs to
// (ResultsDomainContext, Domain 1's by default), and every hook here reads that domain's source.

import { QueryClient, useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query"
import { createContext, useContext } from "react"

import type { DocumentByKind, SchemaKind } from "./schema/generated"
import { type BlobRef, type ResultsDomain, type ResultsSource, SourceError } from "./source"
import {
  domainOfKind,
  loadValidators,
  parseDocumentAs,
  parseRows,
  type ParsedRows,
  type ParseResultOf,
} from "./validate"

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

/** Every domain's source over one results root: built once per domain, on first use. */
export type ResultsSources = { forDomain(domain: ResultsDomain): ResultsSource }

export const ResultsSourcesContext = createContext<ResultsSources | null>(null)

/** The domain the current page reads; the route tree sets it, Domain 1's when nothing does. */
export const ResultsDomainContext = createContext<ResultsDomain>("d1")

export function useResultsDomain(): ResultsDomain {
  return useContext(ResultsDomainContext)
}

/** The source of a domain: the page's own when none is named. */
export function useResultsSource(domain?: ResultsDomain): ResultsSource {
  const sources = useContext(ResultsSourcesContext)
  const current = useContext(ResultsDomainContext)
  if (!sources) throw new Error("useResultsSource needs a ResultsSourcesContext provider")
  return sources.forDomain(domain ?? current)
}

type Scope = Pick<ResultsSource, "root" | "domain">

export const queryKeys = {
  index: (scope: Scope) => ["results", scope.root, scope.domain, "index"] as const,
  document: (scope: Scope, runId: string, path: string) =>
    ["results", scope.root, scope.domain, "run", runId, "document", path] as const,
  rows: (scope: Scope, runId: string, path: string) =>
    ["results", scope.root, scope.domain, "run", runId, "rows", path] as const,
  blob: (scope: Scope, runId: string, digest: string) =>
    ["results", scope.root, scope.domain, "run", runId, "blob", digest] as const,
}

/** Parses a document as `kind` once its domain's validators are there. */
async function parseAs<K extends SchemaKind>(json: unknown, kind: K): Promise<ParseResultOf<K>> {
  await loadValidators(domainOfKind(kind))
  return parseDocumentAs(json, kind)
}

/** The kind of a domain's runs index. */
export type RunsIndexKind = "runs-index" | "d2/runs-index"

const RUNS_INDEX_KIND = {
  d1: "runs-index",
  d2: "d2/runs-index",
} as const satisfies Record<ResultsDomain, RunsIndexKind>

/** The query for a domain's runs index, shared by useRunsIndex and useDomainRunsIndex. */
function runsIndexOptions<K extends RunsIndexKind>(source: ResultsSource, kind: K) {
  return {
    queryKey: queryKeys.index(source),
    queryFn: async ({ signal }: { signal?: AbortSignal }): Promise<ParseResultOf<K>> =>
      parseAs(await source.index(signal), kind),
    staleTime: 0,
    refetchOnWindowFocus: true,
  }
}

/**
 * Domain 1's runs index: refetched on window focus and on mount, since it is the only thing that
 * changes. Domain 1's pages read it; a page of another domain reads its own with
 * useDomainRunsIndex.
 */
export function useRunsIndex(): UseQueryResult<ParseResultOf<"runs-index">, SourceError> {
  const source = useResultsSource("d1")
  return useQuery<ParseResultOf<"runs-index">, SourceError>(runsIndexOptions(source, "runs-index"))
}

/** A domain's runs index, as its own producer writes it. */
export function useDomainRunsIndex<D extends ResultsDomain>(
  domain: D,
): UseQueryResult<ParseResultOf<(typeof RUNS_INDEX_KIND)[D]>, SourceError> {
  const source = useResultsSource(domain)
  return useQuery<ParseResultOf<(typeof RUNS_INDEX_KIND)[D]>, SourceError>(
    runsIndexOptions(source, RUNS_INDEX_KIND[domain] as (typeof RUNS_INDEX_KIND)[D]),
  )
}

const immutable = { staleTime: Infinity, gcTime: Infinity } as const

/** The query for one document of a run, shared by useRunDocument and useRunDocuments. */
export function runDocumentOptions<K extends SchemaKind>(
  source: ResultsSource,
  runId: string,
  path: string,
  kind: K,
) {
  return {
    queryKey: queryKeys.document(source, runId, path),
    queryFn: async ({ signal }: { signal?: AbortSignal }): Promise<ParseResultOf<K>> =>
      parseAs(await source.document(runId, path, signal), kind),
    ...immutable,
  }
}

/** A JSON document of a run, validated as `kind`; cached for the session (the run is immutable). */
export function useRunDocument<K extends SchemaKind>(
  runId: string | undefined,
  path: string,
  kind: K,
  options: { enabled?: boolean } = {},
): UseQueryResult<ParseResultOf<K>, SourceError> {
  const source = useResultsSource()
  return useQuery<ParseResultOf<K>, SourceError>({
    ...runDocumentOptions(source, runId ?? "", path, kind),
    enabled: runId !== undefined && (options.enabled ?? true),
  })
}

/** Several documents of one kind at once (every suite summary of a run), each its own query. */
export function useRunDocuments<K extends SchemaKind>(
  runId: string | undefined,
  paths: readonly string[],
  kind: K,
): UseQueryResult<ParseResultOf<K>, SourceError>[] {
  const source = useResultsSource()
  return useQueries({
    queries: paths.map((path) => ({
      ...runDocumentOptions(source, runId ?? "", path, kind),
      enabled: runId !== undefined,
    })),
  }) as UseQueryResult<ParseResultOf<K>, SourceError>[]
}

/** Documents of one kind from several runs at once (an overview's composite), each its own query. */
export function useDocumentsOfRuns<K extends SchemaKind>(
  documents: readonly { runId: string; path: string }[],
  kind: K,
): UseQueryResult<ParseResultOf<K>, SourceError>[] {
  const source = useResultsSource()
  return useQueries({
    queries: documents.map(({ runId, path }) => runDocumentOptions(source, runId, path, kind)),
  }) as UseQueryResult<ParseResultOf<K>, SourceError>[]
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
    queryKey: queryKeys.rows(source, runId ?? "", path),
    queryFn: async ({ signal }) => {
      const result = await source.rows(runId ?? "", path, {
        signal,
        expectedRows: options.expectedRows,
      })
      if (!result.ok) return result
      await loadValidators(domainOfKind(kind))
      return { ok: true, bytes: result.bytes, ...parseRows(kind, result.rows, result.errors) }
    },
    enabled: runId !== undefined && (options.enabled ?? true),
    ...immutable,
  })
}

/**
 * A JSON file of a run as it is, unvalidated: for files that follow another producer's schema,
 * such as a minimized draft's case.json (the spec's own), shown raw and never read.
 */
export function useRunRaw(
  runId: string | undefined,
  path: string,
  options: { enabled?: boolean } = {},
): UseQueryResult<unknown, SourceError> {
  const source = useResultsSource()
  return useQuery<unknown, SourceError>({
    queryKey: [...queryKeys.document(source, runId ?? "", path), "raw"],
    queryFn: ({ signal }) => source.document(runId ?? "", path, signal),
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
    queryKey: queryKeys.blob(source, runId ?? "", ref?.digest ?? ""),
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
