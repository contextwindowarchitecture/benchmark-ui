import { cn } from "cn"

import { ADAPTERS, adapterLabel, isAdapterId, type AdapterSymbol } from "@/lib/adapters"

const SYMBOL_PATHS: Record<AdapterSymbol, string> = {
  circle: "M6 1.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 0 1 0-9z",
  square: "M2 2h8v8H2z",
  triangle: "M6 1.5l5 9H1z",
  diamond: "M6 1l5 5-5 5-5-5z",
}

export type AdapterMarkProps = {
  adapter: string
  /** Shows only the symbol, with the label as its accessible name. */
  symbolOnly?: boolean
  className?: string
}

/** An adapter's symbol in its color beside its label (ui-plan.md 7.2). */
export function AdapterMark({ adapter, symbolOnly = false, className }: AdapterMarkProps) {
  const identity = isAdapterId(adapter) ? ADAPTERS[adapter] : null
  const label = adapterLabel(adapter)
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} data-adapter={adapter}>
      <svg
        viewBox="0 0 12 12"
        width="10"
        height="10"
        role={symbolOnly ? "img" : undefined}
        aria-label={symbolOnly ? label : undefined}
        aria-hidden={symbolOnly ? undefined : "true"}
        className={cn("shrink-0", identity ? identity.fillClass : "fill-muted-foreground")}
      >
        <path d={identity ? SYMBOL_PATHS[identity.symbol] : SYMBOL_PATHS.circle} />
      </svg>
      {symbolOnly ? null : <span>{label}</span>}
    </span>
  )
}
