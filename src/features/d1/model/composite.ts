// The composite latest (ui-plan.md 5.5): the Domain 1 overview reads two runs, the newest
// finished nightly and the newest run that has S7, because the write-up combined them the same
// way. A view, not a record: the two run ids are in the URL, nothing is written.

import type { RunsIndexV1 } from "@/data/schema/generated"

import { isFinished, newestRunWithSuite, resolveAlias, runById, type RunEntry } from "./runs"

export const NIGHTLY_PROFILE = "nightly"
export const SCALE_SUITE = "S7"

export type CompositeRun = {
  run: RunEntry
  /** Whether the URL named the run or the index resolved it. */
  from: "url" | "index"
}

export type Composite = {
  nightly: CompositeRun | undefined
  s7: CompositeRun | undefined
  /** Run ids the URL named that the index does not list, so the page can say so. */
  unknown: { nightly?: string; s7?: string }
}

export type CompositeParams = { nightly?: string | undefined; s7?: string | undefined }

/**
 * Resolves the composite's two runs: each from the URL when it names a listed run, else from the
 * index (the nightly profile's newest finished run; the newest finished run with S7).
 */
export function resolveComposite(index: RunsIndexV1, params: CompositeParams): Composite {
  const unknown: Composite["unknown"] = {}
  let nightly: CompositeRun | undefined
  if (params.nightly) {
    const named = runById(index, params.nightly)
    if (named) nightly = { run: named, from: "url" }
    else unknown.nightly = params.nightly
  }
  if (!nightly) {
    const resolved = resolveAlias(index, NIGHTLY_PROFILE)
    if (resolved) nightly = { run: resolved, from: "index" }
  }
  let s7: CompositeRun | undefined
  if (params.s7) {
    const named = runById(index, params.s7)
    if (named) s7 = { run: named, from: "url" }
    else unknown.s7 = params.s7
  }
  if (!s7) {
    const resolved = newestRunWithSuite(index, SCALE_SUITE)
    if (resolved) s7 = { run: resolved, from: "index" }
  }
  return { nightly, s7, unknown }
}

/** The runs a reader may pick as the nightly: finished runs of the profile, else every finished run. */
export function nightlyCandidates(index: RunsIndexV1): RunEntry[] {
  const ofProfile = index.runs.filter(
    (run) => run.ci_profile === NIGHTLY_PROFILE && isFinished(run),
  )
  return ofProfile.length > 0 ? ofProfile : index.runs.filter(isFinished)
}

/** The runs a reader may pick as the S7 run: every finished run that includes S7. */
export function s7Candidates(index: RunsIndexV1): RunEntry[] {
  return index.runs.filter((run) => run.suites.includes(SCALE_SUITE) && isFinished(run))
}
