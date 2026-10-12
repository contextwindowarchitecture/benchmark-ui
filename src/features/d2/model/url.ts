// The URL state Domain 2's pages share, validated with Zod (ui-plan.md 6.2; the UI-D2 plan).

import { z } from "zod"

const RUN_ID_PARAM = z.string().regex(/^\d{8}T\d{6}Z-[0-9a-f]{7}(?:-\d+)?$/)
const NAME = z.string().min(1).max(64)

/** The run page's metrics table: a suite, a judgment, an arm and a search. */
export const d2RunPageParams = {
  suite: z.string().regex(/^S[0-9]+$/),
  metric: z.enum(["pass", "fail", "info", "na"]),
  arm: NAME,
  q: z.string().max(200),
}

/**
 * A suite page's rows (the file, and each filter a value the file's facets offer) and, as `at`,
 * the tier its breakdowns by family, turn count, rule, kind and format are read at.
 */
export const d2SuitePageParams = {
  at: NAME,
  file: z.string().min(1).max(200),
  arm: NAME,
  family: NAME,
  tier: NAME,
  verdict: NAME,
  tag: NAME,
  q: z.string().max(200),
  page: z.coerce.number().int().min(1),
}

/** The overview's pinned run (the UI-D2 plan's composite): every suite that run has. */
export const d2OverviewParams = {
  run: RUN_ID_PARAM,
}

/** Variable tracking (UI-D2c): the pinned run, the budget the shares are read at, the family. */
export const d2TrackingParams = {
  run: RUN_ID_PARAM,
  at: NAME,
  family: NAME,
}

/** Instruction persistence (UI-D2c): the pinned run and the budget the panels are read at. */
export const d2InstructionsParams = {
  run: RUN_ID_PARAM,
  at: NAME,
}

/** Long context (UI-D2c): the pinned run and the questions the curves count. */
export const d2LongContextParams = {
  run: RUN_ID_PARAM,
  questions: NAME,
}
