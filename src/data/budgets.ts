// The row and size budgets of the project profile (ui-plan.md 5.4; DESIGN.md 6.4). Measured
// against the runs of 2026-10-08, not guessed; change them with a measurement.

/** Rows a file may have and still be parsed on the main thread. Above it, the worker parses. */
export const MAIN_THREAD_ROW_BUDGET = 5_000

/** Rows a file may have and still be parsed at all; above it the file is offered as a download. */
export const WORKER_ROW_BUDGET = 30_000

/** The largest file loaded whole in the browser, in bytes (S5's results.jsonl is 25.8 MB). */
export const WHOLE_FILE_BYTES = 30 * 1024 * 1024

/** Blobs larger than this are offered as a download instead of an inline view. */
export const INLINE_BLOB_BYTES = 1024 * 1024

/** A fit over fewer points than this is shown as points without a line. */
export const MIN_FIT_POINTS = 4
