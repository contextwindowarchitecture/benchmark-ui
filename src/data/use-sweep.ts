// A sweep's compact summary for a page (ui-plan.md 9.1): loaded whole in a worker under the
// whole-file budget, so the frames' item lists stay there; on the main thread where no Worker
// exists (jsdom), through the source like any document. One worker per sweep for the session,
// like the query cache: a run is immutable.

import { useQuery } from "@tanstack/react-query"

import { summarizeSweep, type SweepSummary } from "@/features/d1/model/sweep-curve"

import { WHOLE_FILE_BYTES } from "./budgets"
import { queryKeys, useResultsSource } from "./queries"
import { SourceError } from "./source"
import type { SweepLoadResult, SweepRequest, SweepResponse } from "./sweep-worker-core"
import { parseDocumentAs, schemaStringOf, type ValidationIssue } from "./validate"

export type SweepHandle =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: SourceError; retry: () => void }
  | { status: "not-found" }
  | { status: "over-budget"; bytes: number; budget: number }
  | { status: "unsupported"; schema: string | null }
  | { status: "invalid"; issues: ValidationIssue[] }
  | { status: "ready"; summary: SweepSummary; bytes: number | null; via: "main" | "worker" }

const hasWorker = () => typeof Worker === "function"

type WorkerStore = { loaded: Promise<SweepLoadResult>; dispose(): void }

const stores = new Map<string, WorkerStore>()

function workerStore(key: string, url: string): WorkerStore {
  const existing = stores.get(key)
  if (existing) return existing
  const worker = new Worker(new URL("./sweep.worker.ts", import.meta.url), { type: "module" })
  let settle: (result: SweepLoadResult) => void = () => {}
  const loaded = new Promise<SweepLoadResult>((resolve) => {
    settle = resolve
  })
  worker.onmessage = (event: MessageEvent<SweepResponse>) => {
    if (event.data.type === "loaded") settle(event.data.result)
  }
  worker.onerror = (event) =>
    settle({
      ok: false,
      reason: "error",
      error: {
        kind: "network",
        url,
        message: event.message || "the sweep worker failed",
        status: null,
      },
    })
  const request: SweepRequest = { type: "load", url, budget: WHOLE_FILE_BYTES }
  worker.postMessage(request)
  const store: WorkerStore = {
    loaded,
    dispose() {
      worker.terminate()
      stores.delete(key)
    },
  }
  stores.set(key, store)
  return store
}

export function useSweep(
  runId: string | undefined,
  path: string | undefined,
  options: { enabled?: boolean } = {},
): SweepHandle {
  const source = useResultsSource()
  const enabled = (options.enabled ?? true) && runId !== undefined && path !== undefined
  const key = `${source.root}|${runId ?? ""}|${path ?? ""}`
  const url = runId && path ? source.url(runId, path) : ""
  const viaWorker = hasWorker()
  const query = useQuery<{ result: SweepLoadResult; via: "main" | "worker" }, SourceError>({
    queryKey: [...queryKeys.document(source.root, runId ?? "", path ?? ""), "sweep-summary"],
    queryFn: async ({ signal }) => {
      if (viaWorker) return { result: await workerStore(key, url).loaded, via: "worker" }
      const json = await source.document(runId ?? "", path ?? "", signal)
      const parsed = parseDocumentAs(json, "sweep")
      if (!parsed.ok) {
        if (parsed.reason === "unsupported-schema") {
          return {
            via: "main",
            result: { ok: false, reason: "unsupported", schema: parsed.schema },
          }
        }
        if (parsed.reason === "wrong-kind") {
          return {
            via: "main",
            result: {
              ok: false,
              reason: "unsupported",
              schema: `${schemaStringOf(parsed.actual)} where ${parsed.expected} was expected`,
            },
          }
        }
        return { via: "main", result: { ok: false, reason: "invalid", issues: parsed.issues } }
      }
      return {
        via: "main",
        result: { ok: true, summary: summarizeSweep(parsed.document), bytes: -1 },
      }
    },
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  if (!enabled) return { status: "idle" }
  if (query.isPending) return { status: "loading" }
  if (query.isError) {
    if (query.error.kind === "not-found") return { status: "not-found" }
    return { status: "error", error: query.error, retry: () => void query.refetch() }
  }
  const { result, via } = query.data
  if (result.ok) {
    return {
      status: "ready",
      summary: result.summary,
      bytes: result.bytes >= 0 ? result.bytes : null,
      via,
    }
  }
  switch (result.reason) {
    case "over-budget":
      return { status: "over-budget", bytes: result.bytes, budget: result.budget }
    case "unsupported":
      return { status: "unsupported", schema: result.schema }
    case "invalid":
      return { status: "invalid", issues: result.issues }
    case "error": {
      if (result.error.kind === "not-found") return { status: "not-found" }
      const { kind, url: errorUrl, message, status } = result.error
      return {
        status: "error",
        error: new SourceError(kind, errorUrl, message, status),
        retry: () => {
          stores.get(key)?.dispose()
          void query.refetch()
        },
      }
    }
  }
}
