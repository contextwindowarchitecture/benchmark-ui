// The rows of one file for a page (ui-plan.md 5.4): on the main thread within the budget, in the
// worker above it, as a download above the worker's budget. A page asks for a filtered page and
// gets the rows of that page with the facets, never the whole file.

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import type { RowKind } from "@/features/d1/model/row-kinds"

import { MAIN_THREAD_ROW_BUDGET, WORKER_ROW_BUDGET } from "./budgets"
import { queryKeys, useResultsSource, useRunRows } from "./queries"
import { facetsOf, indexRows, queryRows, type RowPage, type RowQuery } from "./row-store"
import type { LoadResult, WorkerRequest, WorkerResponse } from "./rows-worker-core"
import { SourceError, type RowError } from "./source"
import type { ParsedRows } from "./validate"

export type RowStore<K extends RowKind> =
  | { key: string; sync: true; query(query: RowQuery): RowPage<K> }
  | { key: string; sync: false; query(query: RowQuery): Promise<RowPage<K>> }

export type RowsHandle<K extends RowKind> =
  /** Not asked for yet: the region that shows the rows has not been opened. */
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: SourceError; retry: () => void }
  /** More rows than the worker's budget: the file is a download, and an aggregate is the harness's. */
  | { status: "over-budget"; rows: number; budget: number }
  | {
      status: "ready"
      via: "main" | "worker"
      total: number
      bytes: number
      errors: RowError[]
      unsupported: ParsedRows<K>["unsupported"]
      store: RowStore<K>
    }

/** jsdom has no Worker; the fixtures never cross the main-thread budget, so tests take that path. */
const hasWorker = () => typeof Worker === "function"

type WorkerStore = {
  loaded: Promise<LoadResult>
  query(query: RowQuery): Promise<RowPage<RowKind>>
  dispose(): void
}

/** One worker per file for the session, like the query cache: a run is immutable. */
const stores = new Map<string, WorkerStore>()

function workerStore(key: string, url: string, kind: RowKind): WorkerStore {
  const existing = stores.get(key)
  if (existing) return existing
  const worker = new Worker(new URL("./rows.worker.ts", import.meta.url), { type: "module" })
  const pending = new Map<
    number,
    { resolve: (page: RowPage<RowKind>) => void; reject: (error: Error) => void }
  >()
  let nextId = 1
  let settleLoaded: (result: LoadResult) => void = () => {}
  const loaded = new Promise<LoadResult>((resolve) => {
    settleLoaded = resolve
  })
  const fail = (message: string) => {
    settleLoaded({
      ok: false,
      reason: "error",
      error: { kind: "network", url, message, status: null },
    })
    for (const request of pending.values()) request.reject(new Error(message))
    pending.clear()
  }
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data
    switch (message.type) {
      case "loaded":
        settleLoaded(message.result)
        return
      case "page":
        pending.get(message.id)?.resolve(message.page)
        pending.delete(message.id)
        return
      case "failed":
        pending.get(message.id)?.reject(new Error(message.message))
        pending.delete(message.id)
        return
    }
  }
  worker.onerror = (event) => fail(event.message || "the rows worker failed")
  const request: WorkerRequest = { type: "load", url, kind, budget: WORKER_ROW_BUDGET }
  worker.postMessage(request)
  const store: WorkerStore = {
    loaded,
    query(query) {
      const id = nextId++
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        const message: WorkerRequest = { type: "query", id, query }
        worker.postMessage(message)
      })
    },
    dispose() {
      worker.terminate()
      stores.delete(key)
    },
  }
  stores.set(key, store)
  return store
}

export function useRows<K extends RowKind>(
  runId: string | undefined,
  path: string,
  kind: K,
  options: { expectedRows?: number | undefined; enabled?: boolean } = {},
): RowsHandle<K> {
  const source = useResultsSource()
  const enabled = (options.enabled ?? true) && runId !== undefined
  const expected = options.expectedRows
  const tooBig = expected !== undefined && expected > WORKER_ROW_BUDGET
  const viaWorker =
    !tooBig && hasWorker() && expected !== undefined && expected > MAIN_THREAD_ROW_BUDGET
  const key = `${source.root}|${runId ?? ""}|${path}`
  const url = runId ? source.url(runId, path) : ""

  const main = useRunRows(runId, path, kind, {
    enabled: enabled && !tooBig && !viaWorker,
    expectedRows: expected,
  })
  const worker = useQuery<LoadResult, SourceError>({
    queryKey: [...queryKeys.rows(source.root, runId ?? "", path), "worker"],
    queryFn: () => workerStore(key, url, kind).loaded,
    enabled: enabled && viaWorker,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const mainRows = main.data?.ok ? main.data.rows : null
  const mainStore = useMemo<RowStore<K> | null>(() => {
    if (!mainRows) return null
    const indexed = indexRows(kind, mainRows)
    const facets = facetsOf(indexed)
    return { key, sync: true, query: (query) => queryRows(indexed, query, facets) }
  }, [kind, key, mainRows])

  if (!enabled) return { status: "idle" }
  if (tooBig) return { status: "over-budget", rows: expected, budget: WORKER_ROW_BUDGET }
  if (viaWorker) {
    if (worker.isPending) return { status: "loading" }
    if (worker.isError) {
      return { status: "error", error: worker.error, retry: () => void worker.refetch() }
    }
    const result = worker.data
    if (!result.ok) {
      if (result.reason === "over-budget") {
        return { status: "over-budget", rows: result.rows, budget: result.budget }
      }
      const { kind: errorKind, url: errorUrl, message, status } = result.error
      return {
        status: "error",
        error: new SourceError(errorKind, errorUrl, message, status),
        retry: () => {
          stores.get(key)?.dispose()
          void worker.refetch()
        },
      }
    }
    const store = workerStore(key, url, kind)
    return {
      status: "ready",
      via: "worker",
      total: result.total,
      bytes: result.bytes,
      errors: result.errors,
      unsupported: result.unsupported as ParsedRows<K>["unsupported"],
      store: { key, sync: false, query: (query) => store.query(query) as Promise<RowPage<K>> },
    }
  }
  if (main.isPending) return { status: "loading" }
  if (main.isError) return { status: "error", error: main.error, retry: () => void main.refetch() }
  if (!main.data.ok) {
    return { status: "over-budget", rows: main.data.rows, budget: main.data.budget }
  }
  if (!mainStore) return { status: "loading" }
  return {
    status: "ready",
    via: "main",
    total: main.data.rows.length,
    bytes: main.data.bytes,
    errors: main.data.errors,
    unsupported: main.data.unsupported,
    store: mainStore,
  }
}

export type RowPageState<K extends RowKind> = {
  page: RowPage<K> | undefined
  pending: boolean
  error: Error | null
}

/** One filtered page from a ready handle: synchronous on the main thread, a round trip to the worker. */
export function useRowPage<K extends RowKind>(
  handle: RowsHandle<K>,
  query: RowQuery,
): RowPageState<K> {
  const store = handle.status === "ready" ? handle.store : null
  const sync = useMemo(() => (store && store.sync ? store.query(query) : undefined), [store, query])
  const remote = useQuery<RowPage<K>, Error>({
    queryKey: ["rows-page", store?.key ?? "", query],
    queryFn: () => {
      if (!store || store.sync) throw new Error("no worker store")
      return store.query(query)
    },
    enabled: store !== null && !store.sync,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  })
  if (!store) return { page: undefined, pending: handle.status === "loading", error: null }
  if (store.sync) return { page: sync, pending: false, error: null }
  return { page: remote.data, pending: remote.isPending, error: remote.error }
}
