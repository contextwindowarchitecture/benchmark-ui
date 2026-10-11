import { byArmAndTier, pairedReference, type Paired } from "@/features/d2/model/blocks"
import { parseTier, tierLabel } from "@/features/d2/model/metrics"
import { intervalLevel } from "@/features/d2/model/metric-text"
import { formatCount, formatPointsDifference, formatPointsDifferenceInterval } from "@/lib/format"

import { GroupedArmTable, type ArmCell } from "./grouped-arm-table"

export type PairedEntry = { arm: string; tier: string; paired: Paired | null }

/**
 * The harness's paired differences (the UI-D2 plan; harness ask 13): each arm less the reference
 * arm on the same probes and samples, in percentage points, with the interval the harness
 * computed, by arm and tier. The reference arm's own row says so; an upper bound, which has no
 * budget, is not paired.
 */
export function PairedTable({
  entries,
  label,
  caption,
  tiers,
}: {
  entries: readonly PairedEntry[]
  label: string
  caption?: string
  /** The tiers to show, when not every tier the entries cover. */
  tiers?: readonly string[]
}) {
  const layout = byArmAndTier(entries)
  const reference = pairedReference(entries)
  const shown = tiers ? layout.tiers.filter((tier) => tiers.includes(tier)) : layout.tiers
  const cell = (arm: string, tier: string): ArmCell => {
    const entry = layout.at(arm, tier)
    if (!entry) {
      // An upper bound has only its no-budget entry; in a table cut to the budgets, say so.
      return layout.at(arm, "control")
        ? {
            node: <span className="text-muted-foreground">no budget</span>,
            text: "not paired, no budget",
          }
        : null
    }
    const paired = entry.paired
    if (paired) {
      const difference = formatPointsDifference(paired.difference)
      const interval = formatPointsDifferenceInterval(paired.interval.low, paired.interval.high)
      return {
        node: (
          <span className="inline-flex flex-col items-end">
            <span>{difference}</span>
            <span
              className="text-xs text-muted-foreground"
              title={`${intervalLevel(paired.interval.level)} interval, ${paired.interval.method}, ${formatCount(paired.interval.resamples)} resamples`}
            >
              {interval}
            </span>
          </span>
        ),
        text: `${difference}, ${intervalLevel(paired.interval.level)} interval ${interval}, over ${formatCount(paired.n)} pairs`,
      }
    }
    if (arm === reference) {
      return {
        node: <span className="text-muted-foreground">reference</span>,
        text: "the reference",
      }
    }
    if (parseTier(tier).kind === "control") {
      return {
        node: <span className="text-muted-foreground">no budget</span>,
        text: "not paired, no budget",
      }
    }
    return { node: <span className="text-muted-foreground">not paired</span>, text: "not paired" }
  }
  return (
    <GroupedArmTable
      label={label}
      caption={
        caption ??
        `Each arm less ${reference ?? "the reference arm"} on the same probes and samples, in percentage points with its interval, at each tier.`
      }
      arms={layout.arms}
      columns={shown.map((tier) => ({ key: tier, label: tierLabel(tier) }))}
      cell={cell}
    />
  )
}
