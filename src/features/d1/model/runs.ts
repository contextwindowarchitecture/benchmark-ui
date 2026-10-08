// Pure selectors over the runs index (ui-plan.md 4.2, 5.5). Aliases (`latest`, a profile) are
// resolved here, from the index document, never from a path: symlinks do not survive static
// hosting (DESIGN.md 6.4).

import type { RunsIndexV1 } from "@/data/schema/generated"

export type RunEntry = RunsIndexV1["runs"][number]

export type RunStatus = RunEntry["status"]

/** The run ids of a runs index, newest first as the harness writes them. */
export function runIds(index: RunsIndexV1): string[] {
  return index.runs.map((run) => run.run_id)
}

export function runById(index: RunsIndexV1, runId: string): RunEntry | undefined {
  return index.runs.find((run) => run.run_id === runId)
}

/** The CI profiles the index names, in the index's order (the harness writes `nightly` first). */
export function profilesOf(index: RunsIndexV1): string[] {
  const named = Object.keys(index.profiles ?? {})
  for (const run of index.runs) {
    if (run.ci_profile && !named.includes(run.ci_profile)) named.push(run.ci_profile)
  }
  return named
}

/**
 * Resolves an alias: `latest` is the index's `latest`; a profile name is the newest finished run
 * of that profile, from `profiles` when the index names it and from the runs otherwise.
 */
export function resolveAlias(index: RunsIndexV1, alias: string): RunEntry | undefined {
  if (alias === "latest") {
    return index.latest ? runById(index, index.latest) : undefined
  }
  const named = index.profiles?.[alias]
  if (named) return runById(index, named)
  return index.runs.find((run) => run.ci_profile === alias && isFinished(run))
}

/** A run that finished and concluded: not running, not stopped by an error (the index's rule). */
export function isFinished(run: RunEntry): boolean {
  return run.status === "pass" || run.status === "partial" || run.status === "fail"
}

/** The newest run that includes a suite, for "not in this run" pointers (DESIGN.md 6.4). */
export function newestRunWithSuite(index: RunsIndexV1, suite: string): RunEntry | undefined {
  return index.runs.find((run) => run.suites.includes(suite) && isFinished(run))
}

/** The runs of a profile (null for runs made outside any profile), newest first. */
export function runsOfProfile(index: RunsIndexV1, profile: string | null): RunEntry[] {
  return index.runs.filter((run) => (run.ci_profile ?? null) === profile)
}

const RUN_ID = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z-([0-9a-f]{7})(?:-(\d+))?$/

export type RunIdParts = {
  /** The UTC start the id encodes. */
  startedAt: Date
  /** The seven-character config hash the id ends with. */
  configHash: string
  /** The disambiguating suffix, when two runs started in the same second. */
  sequence: number | null
}

/** Reads the UTC start and the config hash out of a run id; null when the id is not one. */
export function parseRunId(runId: string): RunIdParts | null {
  const match = RUN_ID.exec(runId)
  if (!match) return null
  const [, y, mo, d, h, mi, s, hash, seq] = match
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`
  const startedAt = new Date(iso)
  if (Number.isNaN(startedAt.getTime())) return null
  return { startedAt, configHash: hash as string, sequence: seq === undefined ? null : Number(seq) }
}

/** The duration of a run in milliseconds, from the index's timestamps; null while it runs. */
export function runDurationMs(run: Pick<RunEntry, "started_at" | "finished_at">): number | null {
  if (!run.finished_at) return null
  const start = Date.parse(run.started_at)
  const end = Date.parse(run.finished_at)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return end - start
}

/** Sorts suite ids numerically (S0, S1, S2, S10, S12), as the harness lists them. */
export function compareSuites(a: string, b: string): number {
  return suiteNumber(a) - suiteNumber(b) || a.localeCompare(b)
}

export function suiteNumber(suite: string): number {
  const n = Number(suite.replace(/^S/, ""))
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}
