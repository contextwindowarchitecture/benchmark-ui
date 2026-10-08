// The URL state the Domain 1 pages share, validated with Zod (ui-plan.md 6.2).

import { z } from "zod"

export const RUN_STATUS_VALUES = ["pass", "partial", "fail", "error", "running"] as const

export const RUNS_SORT_KEYS = ["started", "status", "profile", "duration", "verdict"] as const

export const runsListParams = {
  /** A CI profile name, or "none" for runs made outside any profile. */
  profile: z.string().min(1).max(64),
  status: z.enum(RUN_STATUS_VALUES),
  sort: z.enum(RUNS_SORT_KEYS),
  dir: z.enum(["asc", "desc"]),
}

export const runPageParams = {
  /** A suite id to filter the metrics table by. */
  suite: z.string().regex(/^S[0-9]+$/),
  /** A metric status to filter the metrics table by. */
  metric: z.enum(["pass", "fail", "info", "na"]),
  q: z.string().max(200),
}

/** The path of the current page with another run in place of the current one, or the run page. */
export function runScopedPath(
  pathname: string,
  currentRunId: string | undefined,
  runId: string,
): string {
  const prefix = currentRunId ? `/d1/runs/${currentRunId}` : null
  if (prefix && pathname.startsWith(prefix))
    return `/d1/runs/${runId}${pathname.slice(prefix.length)}`
  return `/d1/runs/${runId}`
}
