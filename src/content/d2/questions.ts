// The words of Domain 2's question pages (UI-D2c): for each metric the viability document's
// Domain 2 table names, what the document expected, the paper it adapts, how Domain 2 measures it
// instead, and what the write-up concludes. Read against the viability document and the Domain 2
// write-up at CONTENT_SOURCE. Words only: every number beside them comes from the records, and
// the viability document's own figures come from other setups, so none is here.

import { DOMAIN_2_WRITE_UP, VIABILITY_DOCUMENT, type Citation } from "../source"

export type QuestionId = "tracking" | "instructions" | "long-context" | "cost"

export type QuestionWords = {
  id: QuestionId
  /** The page's title. */
  title: string
  /** The question the page answers, in one sentence. */
  question: string
  /**
   * The viability document's metric: where it says it, its name, the conventional baseline and
   * CWA's expected outcome.
   */
  viability: {
    /** Where the document states it: a row of its table, its hypothesis. */
    where: string
    metric: string
    baseline: string
    expected: string
    citation: Citation
  }
  /** The paper the viability document proposes adapting, when it names one. */
  paper?: { title: string; authors: string; url: string; text: string }
  /** How Domain 2 measures it instead, and how that differs from the paper and the document. */
  measured: readonly string[]
  /** What the write-up concludes on it. */
  writeUp: { text: readonly string[]; citation: Citation }
}

const VIABILITY_D2: Citation = {
  file: VIABILITY_DOCUMENT,
  section: "Benchmarking Against Context Rot and Attention Dilution",
}

export const TRACKING: QuestionWords = {
  id: "tracking",
  title: "Variable tracking (RULER)",
  question:
    "When a figure is reassigned or corrected over a long conversation, does the model answer with its current value, or with a stale one?",
  viability: {
    where: "A row of its Domain 2 table",
    metric: "Variable Tracking (RULER)",
    baseline:
      "A high failure rate: assignments scattered through a long context leave conflicting temporal states, and the model falls back on guessing.",
    expected:
      "Near-perfect state reconciliation: the State plane overwrites obsolete variables, so the payload holds no contradiction for the model to resolve.",
    citation: VIABILITY_D2,
  },
  paper: {
    title: "RULER: What's the Real Context Size of Your Long-Context Language Models?",
    authors: "Hsieh et al., 2024",
    url: "https://arxiv.org/abs/2404.06654",
    text: "RULER's variable tracking hides chains of assignments (one variable set to another, and that to a third) in a long haystack and asks for every name bound to a value. The viability document proposes adapting it.",
  },
  measured: [
    "Domain 2 does not run RULER. Its VT family is its own: over a conversation the user states figures, reassigns some, and mentions near-miss figures with similar names among small talk; a probe asks a figure's current value. Its CC family states figures and then corrects them, up to twice.",
    "A stale answer (an earlier value of the figure asked) and a near-miss distractor are their own verdicts, never just wrong.",
    "The specification does not overwrite anything itself: the application writes the state before assembly, and the assembler admits, fits and renders it. So the question here is whether state the application keeps current, given a protected place in the payload, lets the model answer with current values. cwa-state and the memory arms take their state from the facts the user stated; cwa-state-x has the model write it.",
  ],
  writeUp: {
    text: [
      "Stale values stay low in every arm; the arm with state from the user's facts gives fewer, and the memory arms, which keep the state and only the last turns, give fewest.",
      "Model-written state carries its own errors: cwa-state-x sent the needed fact more often than truncation but answered fewer of those correctly, because its state can hold a wrong or stale value.",
    ],
    citation: { file: DOMAIN_2_WRITE_UP, section: "Scripted conversations (S2)" },
  },
}

export const INSTRUCTIONS: QuestionWords = {
  id: "instructions",
  title: "Instruction persistence",
  question:
    "Does a rule given in the system prompt still hold late in a long conversation, or does older context push it out?",
  viability: {
    where: "The hypothesis that closes its Domain 2 section, and the plane it rests on",
    metric: "Core rules pushed out of the context window",
    baseline:
      "As a conversation grows, older context pushes the core rules out of the window, and the model stops following them.",
    expected:
      "The Governance plane holds the instructions apart from the history, fixed and authoritative, so the rules hold however long the conversation runs.",
    citation: {
      file: VIABILITY_DOCUMENT,
      section: "Domain 2: Long-Horizon Multi-Turn Stability and Context Drift",
    },
  },
  measured: [
    "The IP family is VT with one rule in the system prompt: brackets around figures, a sign-off, or capital letters. Code checks the rule on every probe's reply; an overflow, which reaches no model, is left out.",
    "truncate keeps the newest turns that fit and drops the system prompt with the oldest; truncate-pinned and every CWA arm keep it. cwa-format sends the window baseline's exact selection, rendered as CWA renders it, so it tells CWA's format apart from its selection.",
  ],
  writeUp: {
    text: [
      "Every arm that keeps the system prompt follows the sign-off rule on every probe and the bracket rule on nearly every one; dropping the prompt loses both on many probes.",
      "The capital-letters rule is the one the model resists, even with the whole conversation. The CWA arms complied far more often than the conventional ones, and so did the format control, so CWA's rendering of the instructions is much of what helps, not only its selection.",
    ],
    citation: { file: DOMAIN_2_WRITE_UP, section: "Scripted conversations (S2)" },
  },
}

export const LONG_CONTEXT: QuestionWords = {
  id: "long-context",
  title: "Long context (LongBench v2)",
  question:
    "When the documents behind a question outgrow the budget many times over, does the model still find the answer?",
  viability: {
    where: "A row of its Domain 2 table",
    metric: "Long-Context Q&A (LongBench v2)",
    baseline:
      "Severe degradation in the longest tier, as facts in the middle of a long context are lost.",
    expected:
      "High retrieval accuracy: the evidence plane ranks the chunks and injects only the ones the question needs.",
    citation: VIABILITY_D2,
  },
  paper: {
    title:
      "LongBench v2: Towards Deeper Understanding and Reasoning on Realistic Long-context Multitasks",
    authors: "Bai et al., 2024",
    url: "https://arxiv.org/abs/2412.15204",
    text: "LongBench v2 tests understanding and reasoning over real-world tasks (questions on one document or many, code repositories, structured data) in short, medium and long tiers, the longest running to millions of words. The viability document proposes adapting it.",
  },
  measured: [
    "Domain 2 does not run LongBench v2. Its LQ family is its own: corpora of fictional site documents, chunked, each with one question of each kind: a single site's fact, a comparison of two sites, or a fact the documents never state. Every corpus is generated with its answers, so nothing is contaminated and every answer is known.",
    "The corpora run from a fraction of the budget to many times it, far short of LongBench v2's longest tier: the budget is kept well below the model's context window, so the pressure is real. The retrieval arms draw on the same retriever's best chunks; truncate-pinned sends the tail of the corpus that fits.",
  ],
  writeUp: {
    text: [
      "The whole corpus degrades as it grows, and truncation loses the answer.",
      "The first CWA arms trailed retrieval although every chunk an answer needed was in their payloads. The cause was order: the specification renders a placement's items in id order, and these arms gave each chunk its corpus id, so their evidence read in document order. cwa-ranked, the same evidence with each id led by the retriever's rank, matched retrieval.",
      "So under CWA the order evidence reads in is the application's to choose, through the ids it gives. Letting a route render in the order the slot already ranks by would remove the trap: a question for the specification, not yet raised there.",
    ],
    citation: { file: DOMAIN_2_WRITE_UP, section: "Long context (S4)" },
  },
}

export const COST: QuestionWords = {
  id: "cost",
  title: "Cost",
  question:
    "What does each arm pay in prompt tokens and time for a correct answer, and does the token estimate every budget rests on hold?",
  viability: {
    where: "Its Domain 4 section, which Domain 2 measures only in part",
    metric: "Computational Economics and Prefix Caching",
    baseline:
      "A prompt whose head changes every turn (a timestamp, reshuffled tool definitions) breaks the prefix cache, so every turn pays full prefill again.",
    expected:
      "CWA assembles the stable planes deterministically and puts the changing content last, so the prefix stays stable, the cache keeps hitting, and time to first token and cost fall.",
    citation: {
      file: VIABILITY_DOCUMENT,
      section: "Domain 4: Computational Economics and Prefix Caching",
    },
  },
  measured: [
    "Domain 2 does not measure prefix caching or time to first token: that is Domain 4's. S5 counts what Domain 2's own calls cost: the server's prompt and completion tokens, prompt tokens per correct answer, and each call's latency as recorded when the model cache was filled.",
    "That latency describes the load it was recorded under, many requests in flight on one GPU, not a single request; the prefix-cached tokens are the server's own report under the same load, not a controlled measure of prefix stability.",
    "S5 also checks the token estimate every budget rests on: the CWA arms estimate tokens from bytes and charge a margin over it, and the server's own count must stay within the budget (R-16).",
  ],
  writeUp: {
    text: [
      "Keeping state and recent turns, not the whole history, is both the most accurate and the cheapest.",
      "No payload exceeded its budget by the server's own count. That margin was found, not assumed: the byte-based estimate under-counted the server's tokens most on short prompts, far below any budget, and on an extractor's state of many short facts, which is what raised the margin in steps.",
      "Model-written text can be worse. No fixed margin bounds every text a model can write; a route that estimates tokens should keep its margin under measurement.",
    ],
    citation: { file: DOMAIN_2_WRITE_UP, section: "Cost and the token estimate (S5)" },
  },
}

/** Every question page's words, in the sidebar's order. */
export const QUESTIONS: readonly QuestionWords[] = [TRACKING, INSTRUCTIONS, LONG_CONTEXT, COST]
