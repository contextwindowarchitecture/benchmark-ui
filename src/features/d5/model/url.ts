// The URL state Domain 5's pages share, validated with Zod (the UI-D5 plan).

import { z } from "zod"

const RUN_ID_PARAM = z.string().regex(/^\d{8}T\d{6}Z-[0-9a-f]{7}(?:-\d+)?$/)
const NAME = z.string().min(1).max(64)

/** The overview's pinned run (the composite): every suite that run has. */
export const d5OverviewParams = {
  run: RUN_ID_PARAM,
}

/** A question page: the pinned run, and the tier or filter the page reads its panels at. */
export const d5QuestionParams = {
  run: RUN_ID_PARAM,
  at: NAME,
}
