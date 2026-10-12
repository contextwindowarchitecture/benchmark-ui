// The words of Domain 2's question pages (UI-D2c): for each metric the viability document's
// Domain 2 table names, what the document expected, the paper it adapts, how Domain 2 measures it
// instead, and what the write-up concludes. Read against the viability document and the Domain 2
// write-up at CONTENT_SOURCE. Words only: every number beside them comes from the records, and
// the viability document's own figures come from other setups, so none is here.

import { DOMAIN_2_WRITE_UP, VIABILITY_DOCUMENT, type Citation } from "../source"

export type QuestionId = "tracking" | "instructions"

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

/** Every question page's words, in the sidebar's order. */
export const QUESTIONS: readonly QuestionWords[] = [TRACKING, INSTRUCTIONS]
