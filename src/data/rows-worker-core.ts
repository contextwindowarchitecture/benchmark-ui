// The worker's half of the rows store (ui-plan.md 5.4): fetch, parse and validate one JSONL file,
// keep its rows, and answer filtered pages with their facets, so a file above the main-thread
// budget never crosses into the main thread whole. Free of the Worker API, so a test drives it
// with a fake postMessage; rows.worker.ts wires it to `self`.

import type { RowKind } from "@/features/d1/model/row-kinds"

import { errorMessage } from "./config"
import {
  facetsOf,
  indexRows,
  queryRows,
  type IndexedRow,
  type RowFacets,
  type RowPage,
  type RowQuery,
} from "./row-store"
import { parseJsonl, SourceError, type RowError, type SourceErrorKind } from "./source"
import { parseRows, type ParsedRows } from "./validate"

export type WorkerRequest =
  | { type: "load"; url: string; kind: RowKind; budget: number }
  | { type: "query"; id: number; query: RowQuery }

/** A SourceError's fields, since an Error does not survive postMessage with its class. */
export type SerializedSourceError = {
  kind: SourceErrorKind
  url: string
  message: string
  status: number | null
}

export type LoadResult =
  | {
      ok: true
      total: number
      bytes: number
      errors: RowError[]
      unsupported: ParsedRows<RowKind>["unsupported"]
    }
  | { ok: false; reason: "over-budget"; rows: number; budget: number }
  | { ok: false; reason: "error"; error: SerializedSourceError }

export type WorkerResponse =
  | { type: "loaded"; result: LoadResult }
  | { type: "page"; id: number; page: RowPage<RowKind> }
  | { type: "failed"; id: number; message: string }

function serialize(error: unknown, url: string): SerializedSourceError {
  if (error instanceof SourceError) {
    return { kind: error.kind, url: error.url, message: error.message, status: error.status }
  }
  return { kind: "network", url, message: errorMessage(error), status: null }
}

export function createRowsWorkerCore(
  post: (response: WorkerResponse) => void,
  fetchFn: typeof fetch = fetch,
): (request: WorkerRequest) => Promise<void> {
  let rows: IndexedRow<RowKind>[] | null = null
  let facets: RowFacets | null = null

  async function load(request: Extract<WorkerRequest, { type: "load" }>): Promise<LoadResult> {
    const { url, kind, budget } = request
    let response: Response
    try {
      response = await fetchFn(url)
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        error: {
          kind: "network",
          url,
          message: `could not fetch ${url}: ${errorMessage(error)}`,
          status: null,
        },
      }
    }
    if (response.status === 404) {
      return {
        ok: false,
        reason: "error",
        error: { kind: "not-found", url, message: `${url} is not there`, status: 404 },
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        reason: "error",
        error: {
          kind: "http",
          url,
          message: `${url} answered ${response.status}`,
          status: response.status,
        },
      }
    }
    try {
      const parsed = await parseJsonl(response, budget, url)
      if (!parsed.ok) return parsed
      const validated = parseRows(kind, parsed.rows, parsed.errors)
      rows = indexRows(kind, validated.rows)
      facets = facetsOf(rows)
      return {
        ok: true,
        total: rows.length,
        bytes: parsed.bytes,
        errors: validated.errors,
        unsupported: validated.unsupported,
      }
    } catch (error) {
      return { ok: false, reason: "error", error: serialize(error, url) }
    }
  }

  return async function handle(request: WorkerRequest): Promise<void> {
    switch (request.type) {
      case "load":
        post({ type: "loaded", result: await load(request) })
        return
      case "query":
        if (rows === null || facets === null) {
          post({ type: "failed", id: request.id, message: "no file is loaded in this worker" })
          return
        }
        post({ type: "page", id: request.id, page: queryRows(rows, request.query, facets) })
        return
    }
  }
}
