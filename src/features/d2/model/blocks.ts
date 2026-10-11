// Pure selectors over a Domain 2 suite summary's typed blocks (the UI-D2 plan; harness ask 13,
// delivered at the pinned commit): `by_arm[]`, whose shape the suite decides (S2 and S3 share
// one, S4 and S6 have their own), laid out by arm and tier as the metrics are; the breakdowns each
// shape carries; S5's `cost`. Nothing here re-judges a record: tallies, differences, intervals and
// percentiles are the producer's, read by the names its schema promises.

import { armGroup, compareArms, FAMILIES, type ArmGroup } from "@/content/d2/vocabulary"
import type { D2SuiteSummaryV1 } from "@/data/schema/generated"

import { compareTiers, parseTier } from "./metrics"

export type ArmBlock = NonNullable<D2SuiteSummaryV1["by_arm"]>[number]
/** S2's and S3's entry: aptitude, the facts sent, by family, by turn count, persistence. */
export type ScriptedArm = Extract<ArmBlock, { by_family: unknown }>
/** S4's entry: accuracy over a corpus tier, by kind, by format, abstentions. */
export type LqArm = Extract<ArmBlock, { accuracy: unknown }>
/** S6's entry: aptitude in the loop, against the scripted suite, the replies' length. */
export type LoopArm = Extract<ArmBlock, { against_scripted: unknown }>
export type Paired = NonNullable<ArmBlock["paired"]>
export type Interval = Paired["interval"]
export type Tally = ArmBlock["given"]["present"]
export type ModelBlock = NonNullable<D2SuiteSummaryV1["model"]>
export type CostBlock = NonNullable<D2SuiteSummaryV1["cost"]>
export type CostRow = CostBlock["by_arm"][number]
export type Percentiles = CostRow["prompt_tokens"]

export const isScriptedArm = (block: ArmBlock): block is ScriptedArm => "by_family" in block
export const isLqArm = (block: ArmBlock): block is LqArm => "accuracy" in block
export const isLoopArm = (block: ArmBlock): block is LoopArm => "against_scripted" in block

export type ArmBlocks = { scripted: ScriptedArm[]; lq: LqArm[]; loop: LoopArm[] }

/** The summary's `by_arm` entries by their shape; every list empty when the suite wrote none. */
export function armBlocks(summary: D2SuiteSummaryV1): ArmBlocks {
  const blocks: ArmBlocks = { scripted: [], lq: [], loop: [] }
  for (const block of summary.by_arm ?? []) {
    if (isScriptedArm(block)) blocks.scripted.push(block)
    else if (isLqArm(block)) blocks.lq.push(block)
    else blocks.loop.push(block)
  }
  return blocks
}

export type ByArmAndTier<T> = {
  /** The tiers the entries cover, in compareTiers order. */
  tiers: string[]
  /** The arms, in the write-up's order, with their groups. */
  arms: { id: string; group: ArmGroup }[]
  at(arm: string, tier: string): T | undefined
}

/** Entries keyed by arm and tier, laid out as the metrics tables are. */
export function byArmAndTier<T extends { arm: string; tier: string }>(
  entries: readonly T[],
): ByArmAndTier<T> {
  const cells = new Map(entries.map((entry) => [`${entry.arm}\u0000${entry.tier}`, entry]))
  return {
    tiers: [...new Set(entries.map((entry) => entry.tier))].sort(compareTiers),
    arms: [...new Set(entries.map((entry) => entry.arm))]
      .sort(compareArms)
      .map((arm) => ({ id: arm, group: armGroup(arm) })),
    at: (arm, tier) => cells.get(`${arm}\u0000${tier}`),
  }
}

/** The tier to read a breakdown at first: the tightest budget or smallest corpus, else the first. */
export function defaultTier(tiers: readonly string[]): string | undefined {
  return tiers.find((tier) => parseTier(tier).kind !== "control") ?? tiers[0]
}

/** The reference arm the entries are paired with, when any entry names one. */
export function pairedReference(entries: readonly { paired: Paired | null }[]): string | null {
  return entries.find((entry) => entry.paired)?.paired?.reference ?? null
}

/** A share of a tally: k of n, or null for an empty tally (never a zero). */
export function share(n: number, k: number): number | null {
  return n > 0 ? k / n : null
}

/** One cell of a breakdown: how many observations, and how many met the measure. */
export type BreakdownCell = { n: number; k: number }

export type Breakdown = {
  id: string
  title: string
  description: string
  /** What `k` counts: answers graded correct, or answers that followed the rule. */
  measure: "correct" | "compliant"
  /** The keys the entries cover, in the order to read them. */
  keys: string[]
  keyLabel(key: string): string
  cell(entry: ArmBlock, key: string): BreakdownCell | undefined
}

const compareFamilies = (a: string, b: string) => {
  const ia = FAMILIES.findIndex((family) => family.id === a)
  const ib = FAMILIES.findIndex((family) => family.id === b)
  return (ia < 0 ? FAMILIES.length : ia) - (ib < 0 ? FAMILIES.length : ib) || a.localeCompare(b)
}
const compareNumbers = (a: string, b: string) => Number(a) - Number(b) || a.localeCompare(b)
const compareBy = (order: readonly string[]) => (a: string, b: string) => {
  const ia = order.indexOf(a)
  const ib = order.indexOf(b)
  return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib) || a.localeCompare(b)
}

function keysOf<T>(
  entries: readonly T[],
  pick: (entry: T) => Record<string, unknown> | null | undefined,
  compare: (a: string, b: string) => number,
): string[] {
  return [...new Set(entries.flatMap((entry) => Object.keys(pick(entry) ?? {})))].sort(compare)
}

const familyLabel = (id: string) => {
  const family = FAMILIES.find((candidate) => candidate.id === id)
  return family ? `${family.code} · ${family.title}` : id
}
const turnsLabel = (key: string) => `${key} turns`

const KIND_ORDER = ["single", "multi", "none"] as const
const KIND_WORDS: Record<string, string> = {
  single: "one site's fact",
  multi: "a comparison of two",
  none: "not in the documents",
}
const FORMAT_ORDER = ["short", "mcq"] as const
const FORMAT_WORDS: Record<string, string> = { short: "short answer", mcq: "multiple choice" }
const RULE_WORDS: Record<string, string> = {
  brackets: "brackets around figures",
  signoff: "a sign-off",
  uppercase: "capital letters",
}

/** S2's and S3's breakdowns: by family, by turn count, and the IP rule by rule and turn count. */
export function scriptedBreakdowns(entries: readonly ScriptedArm[]): Breakdown[] {
  const out: Breakdown[] = []
  const families = keysOf(entries, (entry) => entry.by_family, compareFamilies)
  if (families.length > 0) {
    out.push({
      id: "family",
      title: "By task family",
      description: "Correct answers over the probes of each family.",
      measure: "correct",
      keys: families,
      keyLabel: familyLabel,
      cell: (entry, key) => {
        const tally = isScriptedArm(entry) ? entry.by_family[key] : undefined
        return tally ? { n: tally.n, k: tally.correct } : undefined
      },
    })
  }
  const turns = keysOf(entries, (entry) => entry.by_turns, compareNumbers)
  if (turns.length > 0) {
    out.push({
      id: "turns",
      title: "By conversation length",
      description: "Correct answers over the probes of conversations of each turn count.",
      measure: "correct",
      keys: turns,
      keyLabel: turnsLabel,
      cell: (entry, key) => {
        const tally = isScriptedArm(entry) ? entry.by_turns[key] : undefined
        return tally ? { n: tally.n, k: tally.correct } : undefined
      },
    })
  }
  const rules = keysOf(
    entries,
    (entry) => entry.persistence?.by_rule,
    (a, b) => a.localeCompare(b),
  )
  if (rules.length > 0) {
    out.push({
      id: "rule",
      title: "Instruction persistence by rule",
      description:
        "Answers in the IP family that followed the rule in the system prompt, by rule; an overflow, which reaches no model, is left out.",
      measure: "compliant",
      keys: rules,
      keyLabel: (key) => RULE_WORDS[key] ?? key,
      cell: (entry, key) => {
        const tally = isScriptedArm(entry) ? entry.persistence?.by_rule[key] : undefined
        return tally ? { n: tally.n, k: tally.compliant } : undefined
      },
    })
  }
  const ruleTurns = keysOf(entries, (entry) => entry.persistence?.by_turns, compareNumbers)
  if (ruleTurns.length > 0) {
    out.push({
      id: "rule-turns",
      title: "Instruction persistence by conversation length",
      description: "Answers in the IP family that followed the rule, by turn count.",
      measure: "compliant",
      keys: ruleTurns,
      keyLabel: turnsLabel,
      cell: (entry, key) => {
        const tally = isScriptedArm(entry) ? entry.persistence?.by_turns[key] : undefined
        return tally ? { n: tally.n, k: tally.compliant } : undefined
      },
    })
  }
  return out
}

/** S4's breakdowns: by the question's kind and by its format. */
export function lqBreakdowns(entries: readonly LqArm[]): Breakdown[] {
  const out: Breakdown[] = []
  const kinds = keysOf(entries, (entry) => entry.by_kind, compareBy(KIND_ORDER))
  if (kinds.length > 0) {
    out.push({
      id: "kind",
      title: "By question kind",
      description:
        "Correct answers by what the question asks: one site's fact, a comparison of two sites, or a fact the documents never state.",
      measure: "correct",
      keys: kinds,
      keyLabel: (key) => KIND_WORDS[key] ?? key,
      cell: (entry, key) => {
        const tally = isLqArm(entry) ? entry.by_kind[key] : undefined
        return tally ? { n: tally.n, k: tally.correct } : undefined
      },
    })
  }
  const formats = keysOf(entries, (entry) => entry.by_format, compareBy(FORMAT_ORDER))
  if (formats.length > 0) {
    out.push({
      id: "format",
      title: "By question format",
      description: "Correct answers to short-answer and to multiple-choice questions.",
      measure: "correct",
      keys: formats,
      keyLabel: (key) => FORMAT_WORDS[key] ?? key,
      cell: (entry, key) => {
        const tally = isLqArm(entry) ? entry.by_format[key] : undefined
        return tally ? { n: tally.n, k: tally.correct } : undefined
      },
    })
  }
  return out
}

/** The turns S6 reports reply lengths at (the first turn of each ten), ascending. */
export function replyTurns(entries: readonly LoopArm[]): string[] {
  return keysOf(entries, (entry) => entry.reply_tokens_by_turn, compareNumbers)
}

export type CostGroup = { suite: string; rows: CostRow[] }

/** S5's rows by suite, each suite's in the write-up's arm order and the tiers' order. */
export function costGroups(cost: CostBlock): CostGroup[] {
  const groups = new Map<string, CostRow[]>()
  for (const row of cost.by_arm) groups.set(row.suite, [...(groups.get(row.suite) ?? []), row])
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([suite, rows]) => ({
      suite,
      rows: [...rows].sort(
        (a, b) => compareArms(a.arm, b.arm) || compareTiers(a.tier, b.tier) || 0,
      ),
    }))
}

/** The turn counts S5 reports answer lengths at, ascending; empty when no row has any. */
export function answerLengthTurns(rows: readonly CostRow[]): string[] {
  return keysOf(rows, (row) => row.answer_length_by_turns, compareNumbers)
}

/** A band of the under-count table in words: "0 to 499", "8,000 and up". */
export function bandLabel(
  [low, high]: readonly [number | null, number | null],
  formatCount: (value: number) => string,
): string {
  if (low === null) return high === null ? "every size" : `below ${formatCount(high)}`
  return high === null
    ? `${formatCount(low)} and up`
    : `${formatCount(low)} to ${formatCount(high - 1)}`
}
