// What Domain 2 establishes and how far to trust it (ui-plan.md 7.1, the UI-D2 plan): the
// write-up's conclusions, its scope, how it judges an answer and its own limits, as words. Every
// number the write-up quotes beside them comes from the records on the page, so none is here.

import { DOMAIN_2_WRITE_UP, type Citation } from "../source"

export type Note = { id: string; title: string; text: string }

/** The one question the domain asks, and what it holds equal to ask it. */
export const QUESTION = {
  question:
    "Over a long multi-turn task, does a model given CWA-assembled context keep doing the task where a model given conventionally assembled context degrades, with everything else held equal?",
  heldEqual:
    "The model, its settings, the facts, the user's turns, the budget, the token counter and the grader are the same in every arm; only the way the payload is built changes.",
  citation: { file: DOMAIN_2_WRITE_UP } satisfies Citation,
} as const

/**
 * What the write-up concludes, for the run it reports. The panels beside these show the records
 * of whichever runs the page reads, which may not be that run.
 */
export const CONCLUSIONS: readonly Note[] = [
  {
    id: "oracle-state",
    title: "With state written from what the user said",
    text: "CWA holds accuracy over long conversations at a tight budget, ahead of the fair conventional baseline and the rolling summary, paired on the same probes.",
  },
  {
    id: "model-state",
    title: "With state the same model writes",
    text: "CWA is level with pinned truncation and does not reach the rolling summary.",
  },
  {
    id: "history",
    title: "History alone, in CWA's format",
    text: "Gains nothing over pinned truncation. The format by itself does not change accuracy, but it does raise compliance with a rule the model otherwise ignores.",
  },
  {
    id: "documents",
    title: "Over long documents",
    text: "CWA's evidence handling matches conventional retrieval once the application gives its evidence ids that sort by rank. With ids in document order it trailed, because the specification renders a slot's items in id order.",
  },
]

/** The write-up's one-sentence reading of the conclusions above. */
export const CONCLUSION =
  "The gain comes from the state the application keeps, not from the assembler arranging history: CWA gives that state a protected place that every budget keeps, and the model uses it. How good the state is decides the result."

export const CONCLUSIONS_CITATION: Citation = { file: DOMAIN_2_WRITE_UP }

/** What the domain measures, and what it does not show. */
export const SCOPE = {
  measures: [
    "Aptitude retention: accuracy at checkpoints over short, medium and long conversations, against the full conversation as the upper bound.",
    "Variable tracking: whether the model answers with a figure's current value, and how often with a stale one.",
    "Instruction persistence: whether a rule given in the system prompt still holds late in the conversation.",
    "Unreliability: how much repeated samples of the same conversation vary, per arm.",
    "Long-context question answering over corpora from a fraction of the budget to many times it.",
    "Where each failure came from: whether the fact the answer needed was in the payload at all, so a wrong answer is attributed to the payload or to the model.",
  ],
  doesNot: [
    "It does not show that CWA improves a model's reasoning: the model is held constant.",
    "It does not give a universal effect size: the viability document's figures come from another setup, and this domain reports its own numbers against its own baselines.",
    "Tools, prefix caching and injection are left to their own domains. With a model in the loop, every result is a statistical estimate.",
    "It tests the specification as written: the application writes state and memory before assembly, the assembler admits, fits and renders, and summaries are precomputed. The viability document's temporal decay, assembler-written state and compression during assembly are not in the specification.",
  ],
  citation: {
    file: DOMAIN_2_WRITE_UP,
    section: "What it proves, and what it does not",
  } satisfies Citation,
} as const

/** How an answer is judged: no single check is trusted alone. */
export const JUDGING: readonly Note[] = [
  {
    id: "construction",
    title: "Ground truth by construction",
    text: "Every task is generated with its answers known, and S0 re-derives every script's answers from its text alone, without the generator.",
  },
  {
    id: "graders",
    title: "Deterministic graders",
    text: "Normalized exact match, multiple-choice letters, a marked total and a record parsed as JSON. A stale value, a near-miss distractor and an unparsable reply are verdicts of their own, never just wrong.",
  },
  {
    id: "fact-oracle",
    title: "The fact-in-payload oracle",
    text: "From the trace or the baseline's own record, and again from the payload's text, whether every fact the answer needs was sent. The two readings must agree.",
  },
  {
    id: "gate",
    title: "The assembly gate",
    text: "Domain 1's oracles on every CWA payload before it is sent: all four assemblers agree byte for byte, the trace passes the audit, and the answer equals the harness's own prediction.",
  },
  {
    id: "self-check",
    title: "A self-check first",
    text: "Planted answers, replies and omissions must be graded and read as intended, and the baselines must equal payloads computed by hand, before any result is trusted.",
  },
]

export const JUDGING_CITATION: Citation = {
  file: DOMAIN_2_WRITE_UP,
  section: "How it judges an answer",
}

/** The write-up's own limits. */
export const TRUST: readonly Note[] = [
  {
    id: "one-model",
    title: "One model",
    text: "Every number is for one model at one quantization, with thinking off. A second model family is the obvious next step, and the cache and harness are built to take one.",
  },
  {
    id: "synthetic",
    title: "Synthetic tasks",
    text: "The conversations are generated, fictional and regular. That avoids contamination and gives exact ground truth, but real dialogue is messier: these are controlled measurements, not field results.",
  },
  {
    id: "oracle-upper-bound",
    title: "The oracle state is an upper bound by construction",
    text: "cwa-state, cwa-memory and cwa-pipeline take their state from ground truth, so their lead shows what good state is worth, not what an application will get. The realistic arm, cwa-state-x, depends on the extractor's prompt and the model; a better state writer would move it.",
  },
  {
    id: "producers",
    title: "Producer quality decides much of it",
    text: "The extractor, the summarizer and the retriever are harness choices held equal across arms. The fact-in-payload oracle attributes every failure to the payload or the model, but a different producer would give different numbers.",
  },
  {
    id: "margin",
    title: "The estimator margin is measured, not proven",
    text: "No payload overran its budget at the margin used, but the margin covers the text these runs produced; no fixed margin bounds every text a model can write.",
  },
  {
    id: "sampling",
    title: "Sampling",
    text: "A few samples per probe, with cluster-bootstrap intervals over conversations and paired comparisons on the same probes. Many arms and metrics are compared, so an interval that barely excludes zero is weaker evidence than a large, consistent difference. Refilling every reply from the same server moved the small margins, such as model-written state against pinned truncation and the pilot loop's rolling summary, while the large differences held.",
  },
  {
    id: "easy-retrieval",
    title: "The long-context retrieval is easy",
    text: "Every question and fact sentence names its site, so the needed chunk ranks near the top even in the largest corpora: the retrieval arms differ in assembly and order, not in retrieval.",
  },
  {
    id: "loop-pilot",
    title: "The model in the loop is a pilot",
    text: "S6 runs a few conversations of one family; its results are indications, not the recorded comparison.",
  },
  {
    id: "draft",
    title: "A draft specification",
    text: "Every result is tied to the pinned contract commit.",
  },
]

export const TRUST_CITATION: Citation = { file: DOMAIN_2_WRITE_UP, section: "How far to trust it" }

/**
 * What making the first recorded run corrected in the harness's own work. The reported runs
 * repeat that run with the fixes, from an empty cache.
 */
export const CORRECTIONS_INTRO =
  "Making the first recorded run surfaced these problems in the harness's own work, and both were fixed before it; the reported runs repeat it with those fixes, from an empty cache."

export const CORRECTIONS: readonly Note[] = [
  {
    id: "fact-oracle-disagreed",
    title: "The fact oracle disagreed",
    text: "In an earlier attempt the generator could state the same fact sentence twice, which no reader can tell from two facts. The generator and S0's independent check were fixed.",
  },
  {
    id: "over-budget",
    title: "S5 found calls over budget",
    text: "All in cwa-state-x: the extractor, told the instruction-persistence rule as part of its task, wrote its state in capitals, and one conversation's state held many short facts. The producers are now told the task without the reply rule, and the margin was raised.",
  },
]

export const CORRECTIONS_CITATION: Citation = {
  file: DOMAIN_2_WRITE_UP,
  section: "What the run corrected along the way",
}
