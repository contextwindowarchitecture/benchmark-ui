// What a Domain 5 metric's tier means (the UI-D5 plan): the harness writes one `tier` field whose
// meaning is the metric's, so a tier is named by its metric's id. An id this table does not know
// shows its tier as written.

import { CARRIERS } from "@/content/d5/vocabulary"
import { formatCount } from "@/lib/format"

export type D5TierKind =
  | "carrier"
  | "length"
  | "producer"
  | "temperature"
  | "scenario"
  | "set"
  | "queries"
  | "band"
  | "attack"

/** The kind of tier each metric id carries. */
export const TIER_KINDS: Record<string, D5TierKind> = {
  "s1.forged": "carrier",
  "s1.raw_markers": "carrier",
  "s2.asr_by_length": "length",
  "s2.bu_by_length": "length",
  "s2.asr_by_representation": "producer",
  "s2.dropped_by_producer": "producer",
  "s2.asr_sampled": "temperature",
  "s3.llmail_asr": "scenario",
  "s3.prompt_tokens": "set",
  "s4.asr_by_budget": "queries",
  "s6.persistence": "band",
  "s6.aptitude": "attack",
  "s6.stored": "attack",
  "s6.shown": "attack",
}

const PRODUCERS: Record<string, string> = {
  html: "the HTML passed through",
  text: "visible text extracted",
}

const SCENARIOS: Record<string, string> = {
  succeeded: "beat its own level",
  failed: "did not beat its level",
}

const ATTACKS: Record<string, string> = {
  none: "clean",
  persist: "a code word in every reply",
  value: "a planted figure",
  trigger: "a delayed trigger",
}

const SETS: Record<string, string> = { sep: "SEP", llmail: "LLMail-Inject" }

/** A tier in words, as its metric means it: "4k tokens", "scenario 2", "2,000 queries". */
export function d5TierLabel(tier: string, metricId?: string): string {
  const kind = metricId ? TIER_KINDS[metricId] : undefined
  switch (kind) {
    case "carrier":
      return CARRIERS[tier] ?? tier
    case "length":
      return `${tier} tokens`
    case "producer":
      return PRODUCERS[tier] ?? tier
    case "temperature":
      return `temperature ${tier}`
    case "scenario": {
      const scenario = /^scenario-([0-9]+)$/.exec(tier)
      return scenario ? `scenario ${scenario[1]}` : (SCENARIOS[tier] ?? tier)
    }
    case "set":
      return SETS[tier] ?? tier
    case "queries":
      return /^[0-9]+$/.test(tier) ? `${formatCount(Number(tier))} queries` : tier
    case "band":
      return `turns ${tier.replace("-", " to ")} after the poison`
    case "attack":
      return ATTACKS[tier] ?? tier
    default:
      return tier
  }
}

/** A tier's position on a scale, for small multiples: a length in tokens, queries, a band's start. */
export function d5TierSize(tier: string, metricId: string): number | null {
  const kind = TIER_KINDS[metricId]
  if (kind === "length") {
    const k = /^([0-9]+)k$/.exec(tier)
    return k ? Number(k[1]) * 1000 : null
  }
  if (kind === "queries") return /^[0-9]+$/.test(tier) ? Number(tier) : null
  if (kind === "band") {
    const band = /^([0-9]+)-[0-9]+$/.exec(tier)
    return band ? Number(band[1]) : null
  }
  return null
}

/**
 * An order over one metric's tiers: by size where the tier has one (lengths, budgets, bands),
 * else the order the harness wrote them in (a stable sort keeps it).
 */
export function compareD5Tiers(metricId: string): (a: string, b: string) => number {
  return (a, b) => {
    const sa = d5TierSize(a, metricId)
    const sb = d5TierSize(b, metricId)
    return sa !== null && sb !== null ? sa - sb : 0
  }
}
