// A diagram's columns in a measured width (DESIGN.md 4.2): side by side as far as the width holds
// them once the picture is shrunk by at most a floor, and in bands below that, so a phone gets a
// legible picture rather than one that scrolls in its frame. Shared by the environment diagram's
// platforms and the model's planes.

export type ColumnSpec = {
  width: number
  gap: number
  /** How far the picture may shrink to keep a band's columns side by side. */
  minScale: number
}

/**
 * The columns per band in `available` pixels; an unmeasured width (0) puts every column in one
 * band. The bands are evened out: four columns that fit three to a band go two and two.
 */
export function columnsPerBand(count: number, available: number, spec: ColumnSpec): number {
  if (count === 0) return 1
  if (available <= 0) return count
  const fit = Math.floor((available / spec.minScale - 2 + spec.gap) / (spec.width + spec.gap))
  const bands = Math.ceil(count / Math.max(1, Math.min(count, fit)))
  return Math.ceil(count / bands)
}

/** A band's width, with a 1 px margin either side for the strokes. */
export function bandWidth(columns: number, spec: ColumnSpec): number {
  return columns * spec.width + (columns - 1) * spec.gap + 2
}
