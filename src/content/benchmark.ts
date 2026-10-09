// The benchmark as a whole (ui-plan.md 1, 8.11): what CWA is, what each domain is designed to
// establish, and how to read the results. Words only; every number on the site comes from a
// record. Reviewed against the viability document and the Domain 1 write-up at CONTENT_SOURCE.

import { DOMAIN_1_WRITE_UP, VIABILITY_DOCUMENT, type Citation } from "./source"

export type DomainId = "d1" | "d2" | "d3" | "d4" | "d5"

export type DomainContent = {
  id: DomainId
  number: 1 | 2 | 3 | 4 | 5
  /** The long title, as the viability document heads the domain. */
  title: string
  /** The short title the navigation uses. */
  shortTitle: string
  /** What the domain is designed to establish about CWA, in one sentence. */
  claim: string
  /** A summary of the domain's design, from the viability document; no results. */
  design: string[]
  /** The write-up, when the domain has one. */
  writeUp?: { file: string; title: string }
  citation: Citation
}

/** What CWA is, in three sentences, for the home page. */
export const WHAT_CWA_IS: readonly string[] = [
  "The Context Window Architecture is an open specification, not a library and not a model: it says how every call to a model is assembled from strictly typed slots, grouped into four planes, under an exact token budget.",
  "Given the same frozen inputs, the same policies and the same budget, a conforming assembler emits the same payload in the same order every time, and a trace that accounts for every admission, compression and refusal.",
  "The benchmark exists to test that proposition and what follows from it: that independent implementations agree, and that models, caches and defenses do better on payloads assembled this way.",
]

export const DOMAINS: readonly DomainContent[] = [
  {
    id: "d1",
    number: 1,
    title: "Assembly determinism, budgeting and traceability",
    shortTitle: "Assembly",
    claim:
      "A conforming assembler is deterministic, budgets exactly, refuses correctly and explains every decision, and independent implementations agree.",
    design: [
      "Domain 1 tests the assembler alone, as a black box, through a shared adapter protocol: snapshot bytes in, a payload and trace, a rejection or an unsupported exit out. It sends nothing to a model; every pass or fail comes from code.",
      "Four published assemblers, in Python, TypeScript, Go and Rust, answer the same snapshots. Each answer is judged by up to four independent oracles: the specification's expected outputs and labeled generators, agreement between the four, a trace auditor that re-derives what it can from the snapshot, trace and payload, and metamorphic relations between pairs of snapshots.",
      "Twelve suites cover conformance, repeatability across environments and toolchains, metamorphic relations, generative fuzzing, admission, refusal, conflicts, budget pressure at scale, purity, a summarizing producer pipeline and consensus goldens. The oracles are measured on every run before they are trusted.",
    ],
    writeUp: {
      file: DOMAIN_1_WRITE_UP,
      title: "Domain 1: assembly determinism, budgeting and traceability",
    },
    citation: {
      file: VIABILITY_DOCUMENT,
      section: "Domain 1: Assembly Determinism, Budgeting, and Traceability",
    },
  },
  {
    id: "d2",
    number: 2,
    title: "Long-horizon multi-turn stability and context drift",
    shortTitle: "Long-horizon stability",
    claim:
      "CWA-managed context keeps a model's performance stable over long, multi-turn tasks where ad-hoc assembly degrades.",
    design: [
      "Models lose aptitude as a conversation lengthens: assumptions made early go uncorrected, answers bloat, and instructions revealed late are missed. The viability document asks whether structured assembly, which keeps the governance plane fixed and gives conversational memory an explicit lifetime, removes that degradation.",
      "The design adapts long-context suites such as LongBench v2 and RULER, including variable tracking across a long context, to multi-turn agentic tasks of fifty to a hundred turns, and compares a conventional baseline with the same model behind a CWA assembler.",
      "What it would measure: aptitude retained across turns, state reconciliation, variance between sessions, and long-context question answering, each against the same baseline.",
    ],
    citation: {
      file: VIABILITY_DOCUMENT,
      section: "Domain 2: Long-Horizon Multi-Turn Stability and Context Drift",
    },
  },
  {
    id: "d3",
    number: 3,
    title: "Agentic context engineering capability",
    shortTitle: "Agentic capability",
    claim: "Agents given CWA-assembled context do better at long-horizon, tool-using tasks.",
    design: [
      "Autonomous agents fail when the context they need is buried behind irrelevant history or poorly formatted retrieval. The viability document proposes Context-Bench, a contamination-proof suite over fictional entities with simple file tools, as the setting in which to test CWA as the orchestration layer between tools and the model.",
      "The design places tool specifications in the governance plane and tool observations in the evidence plane, each tagged with freshness and authority, and asks whether an open-weight model behind a CWA assembler closes the gap to proprietary models on multi-hop tool tasks.",
      "What it would measure: multi-hop tool execution, the capability lift of an open-weight model, and the cost of reaching a given score.",
    ],
    citation: {
      file: VIABILITY_DOCUMENT,
      section: "Domain 3: Agentic Context Engineering Capability",
    },
  },
  {
    id: "d4",
    number: 4,
    title: "Computational economics and prefix caching",
    shortTitle: "Economics and caching",
    claim:
      "CWA's stable serialization makes prefix caching pay, with measurable cost and latency savings.",
    design: [
      "Inference engines skip the prefill of a prompt prefix they have already seen, but only when the prefix is byte for byte the same. A changing timestamp or a reshuffled tool list at the head of a prompt breaks the cache for every later turn.",
      "CWA assembles the governance and evidence planes deterministically and serializes the most dynamic content last, so the design asks whether that order sustains a high cache hit rate across a multi-turn session on engines with automatic prefix caching, such as vLLM and SGLang.",
      "What it would measure: prefix stability across turns, time to first token, effective cache throughput, and the cost break-even over high-volume agentic loops.",
    ],
    citation: {
      file: VIABILITY_DOCUMENT,
      section: "Domain 4: Computational Economics and Prefix Caching",
    },
  },
  {
    id: "d5",
    number: 5,
    title: "Instruction hierarchy, security and indirect prompt injection",
    shortTitle: "Hierarchy and security",
    claim: "The hierarchy CWA enforces outside the model resists indirect prompt injection.",
    design: [
      "Models that ingest untrusted documents and tool output can be made to treat instructions found there as if they came from the developer; training a model to respect an instruction hierarchy helps, but text that sounds like a role can still pass for it.",
      "CWA moves the hierarchy out of the model: untrusted content is isolated in the evidence plane with explicit authority, trust and injection-risk metadata, and nothing a user or a tool says may change the governance plane. The design exercises that defense with indirect prompt injection suites such as BIPIA and adversarial cases of its own.",
      "What it would measure: attack success rate against benign utility, system-prompt extraction, memory poisoning over time, and attempts by low-authority items to bind to governance slots.",
    ],
    citation: {
      file: VIABILITY_DOCUMENT,
      section: "Domain 5: Instruction Hierarchy, Security, and Indirect Prompt Injection",
    },
  },
]

export function domainById(id: string): DomainContent | undefined {
  return DOMAINS.find((domain) => domain.id === id)
}

/** How to read the results, in one line each, for the home page. */
export const HOW_TO_READ = {
  oracles:
    "No single check is trusted alone: every answer is judged by the specification's expected outputs, by agreement between the four implementations, by a trace auditor and by metamorphic relations, and the oracles are themselves measured on every run.",
  numbers:
    "Every number on this site is read from a run the harness wrote and validated; the pages never recompute a judgment, and each panel names the run it comes from.",
  citation: { file: DOMAIN_1_WRITE_UP, section: "How it judges an answer" } satisfies Citation,
} as const

/** The viability document's framing, for the About page. */
export const ABOUT = {
  framing: [
    "Prompt engineering works at the level of a single message; context engineering works at the level of a session, deciding what is retrieved, compressed, remembered and formatted before a model sees anything. The viability document argues that the second has become the decisive discipline, and that the industry's failures of exhaustion, contradiction and injection are failures of context structure rather than of model capability.",
    "The Context Window Architecture treats that structure as a deterministic, verifiable software process. Proving it viable means more than a capability benchmark: it means measuring the assembler itself, and then the downstream effects on stability, agency, cost and security.",
    "The document lays out five domains for that proof. This site shows what each has established so far, with every number traceable to the run that produced it.",
  ],
  citation: { file: VIABILITY_DOCUMENT } satisfies Citation,
} as const
