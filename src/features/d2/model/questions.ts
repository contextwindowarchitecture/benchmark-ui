// Pure selectors for Domain 2's question pages (UI-D2c): the viability document's metrics, read
// from the suite summaries' typed by_arm blocks. A share is the producer's tally (k of n), never
// re-judged; an arm at a budget and the upper bounds, which have no budget, at theirs; arms in the
// write-up's order. A tally the block does not carry is left out of the chart and shown as not
// measured in its table.

import type { ArmRow } from "@/components/charts/arm-plot-geometry"
import type { TierSeries } from "@/components/charts/tier-lines-geometry"
import { compareArms, type ArmGroup } from "@/content/d2/vocabulary"

import { byArmAndTier, share, type BreakdownCell, type LqArm, type ScriptedArm } from "./blocks"
import { compareTiers, parseTier } from "./metrics"

/** A share per arm, for an arm plot, with the tally it is read from. */
export type ShareRow = ArmRow & {
  group: ArmGroup
  /** The tier the tally is from: the chosen budget, or no budget for an upper bound. */
  tier: string
  tally: BreakdownCell
}

/** The budgets the entries are measured at, from the tightest; the upper bounds' tier left out. */
export function budgetTiers(entries: readonly { tier: string }[]): string[] {
  return [...new Set(entries.map((entry) => entry.tier))]
    .filter((tier) => parseTier(tier).kind === "budget")
    .sort(compareTiers)
}

/** The tier the address names when the entries have it, else the tightest budget. */
export function chosenTier(tiers: readonly string[], wanted: string | undefined): string | null {
  return wanted && tiers.includes(wanted) ? wanted : (tiers[0] ?? null)
}

/**
 * One share per arm at a tier, from a tally each entry may carry: every arm measured at the tier
 * and the upper bounds at no budget. An empty tally is a gap, not a zero.
 */
export function shareRows<T extends { arm: string; tier: string }>(
  entries: readonly T[],
  tier: string,
  pick: (entry: T) => BreakdownCell | undefined,
): ShareRow[] {
  const layout = byArmAndTier(entries)
  return layout.arms.flatMap((arm) => {
    const entry = layout.at(arm.id, tier) ?? layout.at(arm.id, "control")
    const tally = entry ? pick(entry) : undefined
    if (!entry || !tally || tally.n === 0) return []
    return [
      {
        id: arm.id,
        group: arm.group,
        tier: entry.tier,
        value: share(tally.n, tally.k),
        tally,
      },
    ]
  })
}

/** A family's answers that gave the current value: correct of the family's grades. */
export const familyCorrect =
  (family: string) =>
  (entry: ScriptedArm): BreakdownCell | undefined => {
    const tally = entry.by_family[family]
    return tally ? { n: tally.n, k: tally.correct } : undefined
  }

/** A family's answers that gave an earlier value of the figure asked. */
export const familyStale =
  (family: string) =>
  (entry: ScriptedArm): BreakdownCell | undefined => {
    const tally = entry.by_family[family]
    return tally ? { n: tally.n, k: tally.stale } : undefined
  }

/** The families an arm's grades are broken down by, in the order given when it is known. */
export function familiesOf(entries: readonly ScriptedArm[], order: readonly string[]): string[] {
  const present = new Set(entries.flatMap((entry) => Object.keys(entry.by_family)))
  return [
    ...order.filter((family) => present.has(family)),
    ...[...present].filter((family) => !order.includes(family)).sort(),
  ]
}

/** The verdicts a scripted grade can take, in the order to read a wrong answer's cause. */
export const SCRIPTED_VERDICTS = [
  "correct",
  "stale",
  "distractor",
  "wrong",
  "unparsed",
  "overflow",
] as const

export type ScriptedVerdict = (typeof SCRIPTED_VERDICTS)[number]

/** Per arm at a tier, its grades and how many took each verdict, over every family. */
export function verdictRows(
  entries: readonly ScriptedArm[],
  tier: string,
): { arm: string; group: ArmGroup; tier: string; n: number; verdicts: ScriptedArm["verdicts"] }[] {
  const layout = byArmAndTier(entries)
  return layout.arms.flatMap((arm) => {
    const entry = layout.at(arm.id, tier) ?? layout.at(arm.id, "control")
    return entry
      ? [{ arm: arm.id, group: arm.group, tier: entry.tier, n: entry.n, verdicts: entry.verdicts }]
      : []
  })
}

/** An IP rule's answers that followed it, over the IP family's grades. */
export const ruleCompliant =
  (rule: string) =>
  (entry: ScriptedArm): BreakdownCell | undefined => {
    const tally = entry.persistence?.by_rule[rule]
    return tally ? { n: tally.n, k: tally.compliant } : undefined
  }

/** The IP rules the entries were checked against, in the order given when it is known. */
export function rulesOf(entries: readonly ScriptedArm[], order: readonly string[]): string[] {
  const present = new Set(entries.flatMap((entry) => Object.keys(entry.persistence?.by_rule ?? {})))
  return [
    ...order.filter((rule) => present.has(rule)),
    ...[...present].filter((rule) => !order.includes(rule)).sort(),
  ]
}

/**
 * Compliance with the IP rule by the conversation's turn count, one series per arm at a tier
 * (the upper bounds at no budget), for small multiples over the turn count.
 */
export function persistenceSeries(
  entries: readonly ScriptedArm[],
  tier: string,
): { series: TierSeries[]; turns: string[]; tallies: Map<string, Map<string, BreakdownCell>> } {
  const layout = byArmAndTier(entries)
  const tallies = new Map<string, Map<string, BreakdownCell>>()
  for (const arm of layout.arms) {
    const entry = layout.at(arm.id, tier) ?? layout.at(arm.id, "control")
    const byTurns = entry?.persistence?.by_turns
    if (!byTurns) continue
    const cells = new Map<string, BreakdownCell>()
    for (const [turns, tally] of Object.entries(byTurns)) {
      if (tally) cells.set(turns, { n: tally.n, k: tally.compliant })
    }
    tallies.set(arm.id, cells)
  }
  const turns = [...new Set([...tallies.values()].flatMap((cells) => [...cells.keys()]))].sort(
    (a, b) => Number(a) - Number(b),
  )
  const series = [...tallies.keys()].sort(compareArms).map((arm) => ({
    id: arm,
    points: turns.map((turn) => {
      const tally = tallies.get(arm)?.get(turn)
      return { tier: turn, size: Number(turn), value: tally ? share(tally.n, tally.k) : null }
    }),
  }))
  return { series, turns, tallies }
}

/** Which of S4's questions a series counts: every one, one kind, or one format. */
export type QuestionFilter =
  { by: "all" } | { by: "kind"; key: string } | { by: "format"; key: string }

/** An S4 entry's correct answers among the questions a filter counts. */
export function lqTally(entry: LqArm, filter: QuestionFilter): BreakdownCell | undefined {
  if (filter.by === "all") return { n: entry.n, k: entry.verdicts.correct }
  const tally = filter.by === "kind" ? entry.by_kind[filter.key] : entry.by_format[filter.key]
  return tally ? { n: tally.n, k: tally.correct } : undefined
}

/**
 * S4's correct answers over corpus size, one series per arm in the write-up's order, the
 * corpus's size as a multiple of the budget; a tier whose tally is missing or empty is a gap.
 */
export function lqSeries(
  entries: readonly LqArm[],
  filter: QuestionFilter,
): { series: TierSeries[]; tiers: string[]; tallies: Map<string, Map<string, BreakdownCell>> } {
  const layout = byArmAndTier(entries)
  const tiers = layout.tiers.filter((tier) => parseTier(tier).kind === "corpus")
  const tallies = new Map<string, Map<string, BreakdownCell>>()
  for (const arm of layout.arms) {
    const cells = new Map<string, BreakdownCell>()
    for (const tier of tiers) {
      const entry = layout.at(arm.id, tier)
      const tally = entry ? lqTally(entry, filter) : undefined
      if (tally) cells.set(tier, tally)
    }
    if (cells.size > 0) tallies.set(arm.id, cells)
  }
  const series = layout.arms
    .filter((arm) => tallies.has(arm.id))
    .map((arm) => ({
      id: arm.id,
      points: tiers.map((tier) => {
        const tally = tallies.get(arm.id)?.get(tier)
        return {
          tier,
          size: parseTier(tier).value ?? 0,
          value: tally ? share(tally.n, tally.k) : null,
        }
      }),
    }))
  return { series, tiers, tallies }
}
