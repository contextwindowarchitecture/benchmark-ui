// The URL state the Domain 1 pages share, validated with Zod (ui-plan.md 6.2).

import { z } from "zod"

export const RUN_STATUS_VALUES = ["pass", "partial", "fail", "error", "running"] as const

export const RUNS_SORT_KEYS = ["started", "status", "profile", "duration"] as const

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

export const suitePageParams = {
  /** The rows table's filters (ui-plan.md 8.4): each a value the file's facets offer. */
  adapter: z.string().min(1).max(32),
  verdict: z.string().min(1).max(32),
  outcome: z.string().min(1).max(32),
  tag: z.string().min(1).max(120),
  /** A finding id: only the rows that carry it. */
  finding: z.string().min(1).max(64),
  /** The findings list's own facets: the suite and the oracle (the findings file spans suites). */
  suite: z.string().regex(/^S[0-9]+$/),
  oracle: z.string().min(1).max(32),
  q: z.string().max(200),
  page: z.coerce.number().int().min(1),
}

const RUN_ID_PARAM = z.string().regex(/^\d{8}T\d{6}Z-[0-9a-f]{7}(?:-\d+)?$/)

/** The composite's two runs (ui-plan.md 5.5, 6.2): each optional, the index resolving the rest. */
export const overviewParams = {
  nightly: RUN_ID_PARAM,
  s7: RUN_ID_PARAM,
}

/** Compare's two runs (ui-plan.md 8.10). */
export const compareParams = {
  from: RUN_ID_PARAM,
  to: RUN_ID_PARAM,
}

export const coveragePageParams = {
  adapter: z.string().min(1).max(32),
  /** A tag family, the part before the colon. */
  family: z.string().min(1).max(64),
}

/**
 * The path of the current page with another run in place of the current one, or the run page, in
 * the domain whose routes start at `base` (`/d1`, `/d2`).
 */
export function runScopedPath(
  pathname: string,
  currentRunId: string | undefined,
  runId: string,
  base = "/d1",
): string {
  const prefix = currentRunId ? `${base}/runs/${currentRunId}` : null
  if (prefix && pathname.startsWith(prefix))
    return `${base}/runs/${runId}${pathname.slice(prefix.length)}`
  return `${base}/runs/${runId}`
}

/** The shedding viewer's views (ui-plan.md 9.2). */
export const VIEWER_VIEWS = ["curve", "items", "lanes"] as const
export type ViewerView = (typeof VIEWER_VIEWS)[number]

/** The shedding viewer's state (ui-plan.md 6.2, 9.3): the frame, whose frames, and the view. */
export const viewerParams = {
  frame: z.coerce.number().int().min(0),
  adapter: z.string().min(1).max(32),
  view: z.enum(VIEWER_VIEWS),
}

/** The performance page's state (ui-plan.md 8.7): the plots' choice and the cells table's filters. */
export const perfParams = {
  /** The scaling plots' budget label. */
  label: z.string().min(1).max(32),
  series: z.enum(["candidates", "tokens", "diagonal"]),
  method: z.enum(["inprocess", "net", "e2e"]),
  adapter: z.string().min(1).max(32),
  shape: z.string().min(1).max(64),
  status: z.string().min(1).max(32),
  page: z.coerce.number().int().min(1),
}
