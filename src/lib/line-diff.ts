// A line diff for two texts (ui-plan.md 8.9: a trace against its expected trace), by the longest
// common subsequence over lines. Bounded: above the cell budget the diff says it is too large
// rather than freezing the page.

export type DiffLine = { type: "same" | "added" | "removed"; text: string }

export type DiffResult =
  | { ok: true; lines: DiffLine[]; added: number; removed: number }
  | { ok: false; reason: "too-large"; cells: number }

/** The largest a × b the diff computes; two 1,500-line traces fit, two 5,000-line ones do not. */
export const DIFF_CELL_BUDGET = 4_000_000

export function diffLines(before: string, after: string): DiffResult {
  const a = before.split("\n")
  const b = after.split("\n")
  const cells = a.length * b.length
  if (cells > DIFF_CELL_BUDGET) return { ok: false, reason: "too-large", cells }
  // lengths[i][j]: the LCS length of a[i..] and b[j..].
  const width = b.length + 1
  const lengths = new Uint32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i * width + j] =
        a[i] === b[j]
          ? (lengths[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(lengths[(i + 1) * width + j] ?? 0, lengths[i * width + j + 1] ?? 0)
    }
  }
  const lines: DiffLine[] = []
  let added = 0
  let removed = 0
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({ type: "same", text: a[i] as string })
      i += 1
      j += 1
    } else if ((lengths[(i + 1) * width + j] ?? 0) >= (lengths[i * width + j + 1] ?? 0)) {
      lines.push({ type: "removed", text: a[i] as string })
      removed += 1
      i += 1
    } else {
      lines.push({ type: "added", text: b[j] as string })
      added += 1
      j += 1
    }
  }
  for (; i < a.length; i += 1) {
    lines.push({ type: "removed", text: a[i] as string })
    removed += 1
  }
  for (; j < b.length; j += 1) {
    lines.push({ type: "added", text: b[j] as string })
    added += 1
  }
  return { ok: true, lines, added, removed }
}

/** JSON as the diff and the viewers show it: two-space indentation, keys as the producer wrote them. */
export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? ""
}
