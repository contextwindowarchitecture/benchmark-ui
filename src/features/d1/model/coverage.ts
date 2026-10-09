// Pure selectors for the coverage page (ui-plan.md 8.5): the three matrices from coverage.json,
// with the contract's words and the suites' requirement lists beside them.

import type { ContractV1, CoverageV1 } from "@/data/schema/generated"
import { orderAdapters } from "@/lib/adapters"

import { compareSuites } from "./runs"
import { requirementNumber } from "./suite"

export type Fraction = { exercised: number; passed: number }

/** The rate of a cell; null when nothing was exercised, which is a state, not a zero. */
export function rateOfFraction(fraction: Fraction | undefined): number | null {
  if (!fraction || fraction.exercised === 0) return null
  return fraction.passed / fraction.exercised
}

export type ByAdapter = Map<string, Fraction>

function byAdapterOf(
  record: { [k: string]: Fraction | undefined },
  adapters: readonly string[],
): ByAdapter {
  const map: ByAdapter = new Map()
  for (const adapter of adapters) {
    const fraction = record[adapter]
    if (fraction) map.set(adapter, fraction)
  }
  return map
}

/** The adapters coverage.json names, in the fixed order. */
export function coverageAdapters(coverage: CoverageV1): string[] {
  return orderAdapters(coverage.adapters)
}

// Requirements × adapters ----------------------------------------------------------------------

/** The scopes in the plan's order; a requirement without one goes last. */
export const SCOPE_ORDER = ["boundary", "assembler", "application"] as const

export type RequirementRow = {
  id: string
  scope: string | null
  summary: string | null
  keyword: string | null
  /** The suites whose summaries list the requirement, in suite order. */
  suites: string[]
  byAdapter: ByAdapter
}

export type RequirementGroup = { scope: string | null; rows: RequirementRow[] }

export function requirementGroups(
  coverage: CoverageV1,
  contract: ContractV1 | undefined,
  suiteRequirements: ReadonlyMap<string, readonly string[]>,
): RequirementGroup[] {
  const adapters = coverageAdapters(coverage)
  const words = new Map(contract?.requirements.map((r) => [r.id, r]) ?? [])
  const bySuite = [...suiteRequirements.entries()].sort(([a], [b]) => compareSuites(a, b))
  const groups = new Map<string | null, RequirementRow[]>()
  for (const requirement of coverage.requirements) {
    const row: RequirementRow = {
      id: requirement.id,
      scope: requirement.scope,
      summary: words.get(requirement.id)?.summary ?? null,
      keyword: words.get(requirement.id)?.keyword ?? null,
      suites: bySuite.filter(([, ids]) => ids.includes(requirement.id)).map(([suite]) => suite),
      byAdapter: byAdapterOf(requirement.by_adapter, adapters),
    }
    const list = groups.get(requirement.scope) ?? []
    list.push(row)
    groups.set(requirement.scope, list)
  }
  const scopeRank = (scope: string | null) => {
    const index = (SCOPE_ORDER as readonly string[]).indexOf(scope ?? "")
    return index === -1 ? SCOPE_ORDER.length : index
  }
  return [...groups.entries()]
    .sort(([a], [b]) => scopeRank(a) - scopeRank(b) || (a ?? "").localeCompare(b ?? ""))
    .map(([scope, rows]) => ({
      scope,
      rows: rows.sort((a, b) => requirementNumber(a.id) - requirementNumber(b.id)),
    }))
}

// Reasons × slots ------------------------------------------------------------------------------

export const NO_SLOT = "no slot"

export type ReasonRow = {
  code: string
  kind: string
  order: number
  rule: string | null
  text: string | null
  /** Per slot, NO_SLOT for the rows without one; only the slots the reason touches. */
  bySlot: Map<string, Fraction>
  total: Fraction | undefined
}

export type ReasonMatrix = {
  adapter: string
  /** The slot columns: the contract's slots in its order, then "no slot". */
  slots: string[]
  rows: ReasonRow[]
}

/** The reasons in the contract's order, exclusions above refusals, with the slots across. */
export function reasonMatrices(
  coverage: CoverageV1,
  contract: ContractV1 | undefined,
): ReasonMatrix[] {
  const adapters = coverageAdapters(coverage)
  const words = new Map(contract?.reasons.map((r) => [r.code, r]) ?? [])
  const contractSlots = contract?.slots.map((slot) => slot.id) ?? []
  const seen = new Set<string>()
  for (const reason of coverage.reasons) {
    for (const entry of reason.by_slot) seen.add(entry.slot ?? NO_SLOT)
  }
  const slots = [
    ...contractSlots.filter((slot) => seen.has(slot)),
    ...[...seen].filter((slot) => slot !== NO_SLOT && !contractSlots.includes(slot)).sort(),
    ...(seen.has(NO_SLOT) ? [NO_SLOT] : []),
  ]
  const kindRank = (kind: string) => (kind === "exclusion" ? 0 : kind === "refusal" ? 1 : 2)
  const ordered = [...coverage.reasons].sort(
    (a, b) =>
      kindRank(a.kind) - kindRank(b.kind) || a.order - b.order || a.code.localeCompare(b.code),
  )
  return adapters.map((adapter) => ({
    adapter,
    slots,
    rows: ordered.map((reason) => {
      const bySlot = new Map<string, Fraction>()
      for (const entry of reason.by_slot) {
        const fraction = entry.by_adapter[adapter]
        if (fraction) bySlot.set(entry.slot ?? NO_SLOT, fraction)
      }
      return {
        code: reason.code,
        kind: reason.kind,
        order: reason.order,
        rule: words.get(reason.code)?.rule ?? null,
        text: words.get(reason.code)?.text ?? null,
        bySlot,
        total: reason.by_adapter[adapter],
      }
    }),
  }))
}

// Tags -----------------------------------------------------------------------------------------

export type TagRow = {
  tag: string
  family: string
  byAdapter: ByAdapter
  /** Whether no adapter exercised the tag: listed first, as the gaps. */
  unexercised: boolean
  /** The lowest rate across adapters; null when unexercised. */
  worst: number | null
}

export function tagFamily(tag: string): string {
  const colon = tag.indexOf(":")
  return colon === -1 ? tag : tag.slice(0, colon)
}

export function tagFamilies(coverage: CoverageV1): { family: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const tag of coverage.tags) {
    const family = tagFamily(tag.tag)
    counts.set(family, (counts.get(family) ?? 0) + 1)
  }
  return [...counts]
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => a.family.localeCompare(b.family))
}

/** The tags of a family (or all), the unexercised first, then by the lowest rate, then by name. */
export function tagRows(coverage: CoverageV1, family: string | undefined): TagRow[] {
  const adapters = coverageAdapters(coverage)
  return coverage.tags
    .filter((tag) => family === undefined || tagFamily(tag.tag) === family)
    .map((tag) => {
      const byAdapter = byAdapterOf(tag.by_adapter, adapters)
      const rates = [...byAdapter.values()]
        .map(rateOfFraction)
        .filter((rate): rate is number => rate !== null)
      return {
        tag: tag.tag,
        family: tagFamily(tag.tag),
        byAdapter,
        unexercised: rates.length === 0,
        worst: rates.length === 0 ? null : Math.min(...rates),
      }
    })
    .sort(
      (a, b) =>
        Number(b.unexercised) - Number(a.unexercised) ||
        (a.worst ?? 1) - (b.worst ?? 1) ||
        a.tag.localeCompare(b.tag),
    )
}

export function countUnexercised(rows: readonly TagRow[]): number {
  return rows.filter((row) => row.unexercised).length
}
