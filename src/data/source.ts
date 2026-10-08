// The one module that knows where files live (DESIGN.md 6.4; ui-plan.md 5.1): a ResultsSource over
// a base URL with one method per file kind. It returns parsed JSON and leaves validation to the
// boundary (validate.ts), so that a document of an unknown schema is a state, not an exception.

import { MAIN_THREAD_ROW_BUDGET } from "./budgets"
import { errorMessage } from "./config"

export type SourceErrorKind = "not-found" | "http" | "network" | "parse" | "aborted"

/** A fetch that did not yield a document: the HTTP status, when there was one, tells which. */
export class SourceError extends Error {
  override readonly name = "SourceError"
  readonly kind: SourceErrorKind
  readonly url: string
  readonly status: number | null

  constructor(kind: SourceErrorKind, url: string, message: string, status: number | null = null) {
    super(message)
    this.kind = kind
    this.url = url
    this.status = status
  }
}

/** One parsed line of a JSONL file. Line numbers start at 1, as an editor counts them. */
export type RawRow = { line: number; json: unknown }

/** A line that is not JSON, reported with its number and kept out of the rows. */
export type RowError = { line: number; message: string }

export type RowsResult =
  | { ok: true; rows: RawRow[]; errors: RowError[]; bytes: number }
  /** The file has more rows than the main-thread budget; the caller takes the worker path. */
  | { ok: false; reason: "over-budget"; rows: number; budget: number }

export type RowsOptions = {
  signal?: AbortSignal
  /** The row count the run index promises, checked before any byte is fetched. */
  expectedRows?: number
  /** Overrides the main-thread budget (tests, and the worker when it lands). */
  budget?: number
}

/** A content-addressed blob, located by the path its index row gives (blobs/index.jsonl). */
export type BlobRef = { digest: string; path: string }

export type ResultsSource = {
  readonly root: string
  /** `${root}/d1/index.json`: the runs index, the only document that changes. */
  index(signal?: AbortSignal): Promise<unknown>
  /** A JSON document of one run, by its path inside the run directory. */
  document(runId: string, path: string, signal?: AbortSignal): Promise<unknown>
  /** A JSONL file of one run, streamed line by line, within the row budget. */
  rows(runId: string, path: string, options?: RowsOptions): Promise<RowsResult>
  /** A blob by digest and indexed path; JSON blobs are parsed, the rest returned as text. */
  blob(runId: string, ref: BlobRef, signal?: AbortSignal): Promise<unknown>
  /** The URL a file of a run is served at, for download links. */
  url(runId: string, path: string): string
}

export const DOMAIN_1 = "d1"

/**
 * Builds the source over a base URL. `fetchFn` is injectable so tests can serve the vendored
 * fixtures without a server.
 */
export function createResultsSource(root: string, fetchFn: typeof fetch = fetch): ResultsSource {
  const base = root.replace(/\/+$/, "")
  const url = (runId: string, path: string) => `${base}/${DOMAIN_1}/${encodeRun(runId)}/${path}`

  async function get(target: string, signal: AbortSignal | undefined): Promise<Response> {
    let response: Response
    try {
      response = await fetchFn(target, signal ? { signal } : undefined)
    } catch (error) {
      if (signal?.aborted) throw new SourceError("aborted", target, "request aborted")
      throw new SourceError("network", target, `could not fetch ${target}: ${errorMessage(error)}`)
    }
    if (response.status === 404) {
      throw new SourceError("not-found", target, `${target} is not there`, 404)
    }
    if (!response.ok) {
      throw new SourceError(
        "http",
        target,
        `${target} answered ${response.status}`,
        response.status,
      )
    }
    return response
  }

  async function json(target: string, signal: AbortSignal | undefined): Promise<unknown> {
    const response = await get(target, signal)
    try {
      return await response.json()
    } catch (error) {
      throw new SourceError("parse", target, `${target} is not JSON: ${errorMessage(error)}`)
    }
  }

  return {
    root: base,
    index(signal) {
      return json(`${base}/${DOMAIN_1}/index.json`, signal)
    },
    document(runId, path, signal) {
      return json(url(runId, path), signal)
    },
    async rows(runId, path, options = {}) {
      const budget = options.budget ?? MAIN_THREAD_ROW_BUDGET
      if (options.expectedRows !== undefined && options.expectedRows > budget) {
        return { ok: false, reason: "over-budget", rows: options.expectedRows, budget }
      }
      const target = url(runId, path)
      const response = await get(target, options.signal)
      return parseJsonl(response, budget, target)
    },
    async blob(runId, ref, signal) {
      const target = url(runId, ref.path)
      const response = await get(target, signal)
      if (ref.path.endsWith(".json")) {
        try {
          return await response.json()
        } catch (error) {
          throw new SourceError("parse", target, `${target} is not JSON: ${errorMessage(error)}`)
        }
      }
      return response.text()
    },
    url,
  }
}

function encodeRun(runId: string): string {
  return encodeURIComponent(runId)
}

/**
 * Parses a JSONL body line by line as it streams, so a bad line is reported with its number and
 * the rest of the file still parses. Stops at the budget: a file above it belongs to the worker.
 *
 * TODO(ui-plan.md 5.4): above MAIN_THREAD_ROW_BUDGET the parse must run in a Web Worker that also
 * pre-aggregates (S0, S2, S4, S5, S7 rows and perf samples). UI-P0 ships the streaming parser and
 * the budget check; the worker lands with the suite pages (UI-P2), the first to need those files.
 */
export async function parseJsonl(
  response: Response,
  budget: number,
  target: string,
): Promise<RowsResult> {
  const rows: RawRow[] = []
  const errors: RowError[] = []
  let line = 0
  let bytes = 0

  const take = (text: string) => {
    line += 1
    if (text.trim() === "") return
    try {
      rows.push({ line, json: JSON.parse(text) })
    } catch (error) {
      errors.push({ line, message: errorMessage(error) })
    }
  }

  const body = response.body
  if (!body) {
    const text = await response.text()
    bytes = text.length
    for (const chunk of text.split("\n")) {
      take(chunk)
      if (rows.length > budget)
        return { ok: false, reason: "over-budget", rows: rows.length, budget }
    }
    return { ok: true, rows, errors, bytes }
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      pending += decoder.decode(value, { stream: true })
      let newline = pending.indexOf("\n")
      while (newline >= 0) {
        take(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
        if (rows.length > budget) {
          await reader.cancel()
          return { ok: false, reason: "over-budget", rows: rows.length, budget }
        }
        newline = pending.indexOf("\n")
      }
    }
  } catch (error) {
    throw new SourceError("network", target, `stream of ${target} failed: ${errorMessage(error)}`)
  }
  pending += decoder.decode()
  if (pending.length > 0) take(pending)
  return { ok: true, rows, errors, bytes }
}
