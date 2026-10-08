// Pure sorting and filtering for the runs list (ui-plan.md 8.2), so the table is testable
// without rendering and the URL state maps onto plain functions.

import type { RunsIndexV1 } from "@/data/schema/generated"

import { runDurationMs, type RunEntry } from "./runs"
import type { RUNS_SORT_KEYS, RUN_STATUS_VALUES } from "./url"

export type RunsSortKey = (typeof RUNS_SORT_KEYS)[number]
export type RunStatusFilter = (typeof RUN_STATUS_VALUES)[number]

export type RunsFilter = {
  /** A profile name, "none" for runs made outside any profile, undefined for all. */
  profile?: string | undefined
  status?: RunStatusFilter | undefined
}

export function filterRuns(runs: RunEntry[], filter: RunsFilter): RunEntry[] {
  return runs.filter((run) => {
    if (filter.profile === "none" && run.ci_profile) return false
    if (filter.profile && filter.profile !== "none" && run.ci_profile !== filter.profile)
      return false
    if (filter.status && run.status !== filter.status) return false
    return true
  })
}

const STATUS_ORDER: Record<RunEntry["status"], number> = {
  fail: 0,
  error: 1,
  partial: 2,
  pass: 3,
  running: 4,
}

export function sortRuns(runs: RunEntry[], key: RunsSortKey, dir: "asc" | "desc"): RunEntry[] {
  const sign = dir === "asc" ? 1 : -1
  const compare = (a: RunEntry, b: RunEntry): number => {
    switch (key) {
      case "started":
        return a.started_at.localeCompare(b.started_at)
      case "status":
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      case "profile":
        // Runs with a profile first, alphabetically; runs made outside any profile after them.
        if (a.ci_profile === b.ci_profile) return 0
        if (!a.ci_profile) return 1
        if (!b.ci_profile) return -1
        return a.ci_profile.localeCompare(b.ci_profile)
      case "duration":
        return (
          (runDurationMs(a) ?? Number.MAX_SAFE_INTEGER) -
          (runDurationMs(b) ?? Number.MAX_SAFE_INTEGER)
        )
    }
  }
  // A stable sort with the newest first among equals, so ties keep the index's order.
  return [...runs].sort((a, b) => sign * compare(a, b) || b.started_at.localeCompare(a.started_at))
}

/** The commits an index row records, with the contract first and the adapters in the fixed order. */
export function commitsOf(
  run: RunEntry,
  adapterOrder: readonly string[],
): { role: string; commit: string | null }[] {
  const commits = run.commits ?? {}
  const roles = [
    "contract",
    ...adapterOrder.filter((id) => id in commits),
    ...Object.keys(commits).filter((k) => k !== "contract" && !adapterOrder.includes(k)),
  ]
  return roles
    .filter((role) => role in commits)
    .map((role) => ({ role, commit: commits[role] ?? null }))
}

export function countBy<T extends string>(
  runs: RunEntry[],
  pick: (run: RunEntry) => T,
): Map<T, number> {
  const counts = new Map<T, number>()
  for (const run of runs) counts.set(pick(run), (counts.get(pick(run)) ?? 0) + 1)
  return counts
}

export type RunsIndexSummary = { total: number; shown: number }

export function summarize(index: RunsIndexV1, shown: RunEntry[]): RunsIndexSummary {
  return { total: index.runs.length, shown: shown.length }
}
