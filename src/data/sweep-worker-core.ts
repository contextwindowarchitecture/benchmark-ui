// The worker's half of a budget sweep (ui-plan.md 5.4, 9.1): fetch one sweep file whole, under the
// whole-file budget, validate it, and answer the compact summary (one point per frame, the shedding
// list), so the 4 to 20 MB of item lists never cross into the main thread. The document stays here
// for the shedding viewer's frame queries (UI-P4). Free of the Worker API, so a test drives it with
// a fake postMessage; sweep.worker.ts wires it to `self`.

import { summarizeSweep, type SweepSummary } from "@/features/d1/model/sweep-curve"

import { errorMessage } from "./config"
import type { SerializedSourceError } from "./rows-worker-core"
import type { SweepV1 } from "./schema/generated"
import { parseDocumentAs, schemaStringOf, type ValidationIssue } from "./validate"

export type SweepRequest = { type: "load"; url: string; budget: number }

export type SweepLoadResult =
  | { ok: true; summary: SweepSummary; bytes: number }
  | { ok: false; reason: "over-budget"; bytes: number; budget: number }
  | { ok: false; reason: "unsupported"; schema: string | null }
  | { ok: false; reason: "invalid"; issues: ValidationIssue[] }
  | { ok: false; reason: "error"; error: SerializedSourceError }

export type SweepResponse = { type: "loaded"; result: SweepLoadResult }

type Fetched = { result: SweepLoadResult; document: SweepV1 | null }

const fail = (
  kind: SerializedSourceError["kind"],
  url: string,
  message: string,
  status: number | null = null,
): Fetched => ({
  result: { ok: false, reason: "error", error: { kind, url, message, status } },
  document: null,
})

/** Fetches, bounds, validates and summarizes one sweep file; every failure is a result, not a throw. */
export async function fetchSweep(
  url: string,
  budget: number,
  fetchFn: typeof fetch = fetch,
): Promise<Fetched> {
  let response: Response
  try {
    response = await fetchFn(url)
  } catch (error) {
    return fail("network", url, `could not fetch ${url}: ${errorMessage(error)}`)
  }
  if (response.status === 404) return fail("not-found", url, `${url} is not there`, 404)
  if (!response.ok) return fail("http", url, `${url} answered ${response.status}`, response.status)
  const declared = Number(response.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > budget) {
    return { result: { ok: false, reason: "over-budget", bytes: declared, budget }, document: null }
  }
  const text = await response.text()
  const bytes = new TextEncoder().encode(text).byteLength
  if (bytes > budget) {
    return { result: { ok: false, reason: "over-budget", bytes, budget }, document: null }
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    return fail("parse", url, `${url} is not JSON: ${errorMessage(error)}`)
  }
  const parsed = parseDocumentAs(json, "sweep")
  if (!parsed.ok) {
    if (parsed.reason === "unsupported-schema") {
      return { result: { ok: false, reason: "unsupported", schema: parsed.schema }, document: null }
    }
    if (parsed.reason === "wrong-kind") {
      return {
        result: {
          ok: false,
          reason: "unsupported",
          schema: `${schemaStringOf(parsed.actual)} where ${parsed.expected} was expected`,
        },
        document: null,
      }
    }
    return { result: { ok: false, reason: "invalid", issues: parsed.issues }, document: null }
  }
  return {
    result: { ok: true, summary: summarizeSweep(parsed.document), bytes },
    document: parsed.document,
  }
}

export function createSweepWorkerCore(
  post: (response: SweepResponse) => void,
  fetchFn: typeof fetch = fetch,
): (request: SweepRequest) => Promise<void> {
  // The whole document, kept for the viewer's frame queries once UI-P4 adds them.
  let document: SweepV1 | null = null
  return async (request) => {
    switch (request.type) {
      case "load": {
        const fetched = await fetchSweep(request.url, request.budget, fetchFn)
        document = fetched.document
        void document
        post({ type: "loaded", result: fetched.result })
        return
      }
    }
  }
}
