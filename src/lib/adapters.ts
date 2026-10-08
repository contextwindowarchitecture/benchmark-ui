// The four adapters' fixed identities (ui-plan.md 7.2): a chart color token, a symbol for lines
// and points, and a label, in this order wherever they are listed, so a reader learns them once.

export const ADAPTER_IDS = ["python", "typescript", "go", "rust"] as const

export type AdapterId = (typeof ADAPTER_IDS)[number]

export type AdapterSymbol = "circle" | "square" | "triangle" | "diamond"

export type AdapterIdentity = {
  id: AdapterId
  label: string
  symbol: AdapterSymbol
  /** The CSS custom property holding the series color. */
  colorVar: string
  /** Literal Tailwind classes for text, fill and background in that color. */
  textClass: string
  fillClass: string
  bgClass: string
}

export const ADAPTERS: Record<AdapterId, AdapterIdentity> = {
  python: {
    id: "python",
    label: "Python",
    symbol: "circle",
    colorVar: "--adapter-python",
    textClass: "text-adapter-python",
    fillClass: "fill-adapter-python",
    bgClass: "bg-adapter-python",
  },
  typescript: {
    id: "typescript",
    label: "TypeScript",
    symbol: "square",
    colorVar: "--adapter-typescript",
    textClass: "text-adapter-typescript",
    fillClass: "fill-adapter-typescript",
    bgClass: "bg-adapter-typescript",
  },
  go: {
    id: "go",
    label: "Go",
    symbol: "triangle",
    colorVar: "--adapter-go",
    textClass: "text-adapter-go",
    fillClass: "fill-adapter-go",
    bgClass: "bg-adapter-go",
  },
  rust: {
    id: "rust",
    label: "Rust",
    symbol: "diamond",
    colorVar: "--adapter-rust",
    textClass: "text-adapter-rust",
    fillClass: "fill-adapter-rust",
    bgClass: "bg-adapter-rust",
  },
}

export function isAdapterId(value: string): value is AdapterId {
  return (ADAPTER_IDS as readonly string[]).includes(value)
}

/** The label of an adapter the records name; an unknown adapter keeps its id as its label. */
export function adapterLabel(id: string): string {
  return isAdapterId(id) ? ADAPTERS[id].label : id
}

/**
 * Orders adapter ids in the fixed order, keeping any the identities do not know at the end in the
 * order given, so a fifth adapter would still be listed.
 */
export function orderAdapters<T extends string>(ids: readonly T[]): T[] {
  const known = ADAPTER_IDS.filter((id) => (ids as readonly string[]).includes(id)) as T[]
  const unknown = ids.filter((id) => !isAdapterId(id))
  return [...known, ...unknown]
}
