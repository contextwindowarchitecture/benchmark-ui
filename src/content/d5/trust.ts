// What Domain 5 establishes and how far to trust it (the UI-D5 plan): the write-up's question, its
// conclusions in its two kinds of claim, its scope, how it judges an answer, its own limits and
// what the run corrected, as words. Every number the write-up quotes beside them comes from the
// records on the page, so none is here.

import { DOMAIN_5_WRITE_UP, type Citation } from "../source"

export type Note = { id: string; title: string; text: string }

/** The one question the domain asks, and what it holds equal to ask it. */
export const QUESTION = {
  question:
    "When the content an application retrieves carries instructions an attacker wrote, does CWA's assembly keep the model doing the user's task instead of the attacker's, compared with conventional assembly and conventional defences, without costing the task?",
  heldEqual:
    "Every arm sends the model the same task, the same content with the same attack, the same question and the same output contract; only the way the payload is built changes.",
  citation: { file: DOMAIN_5_WRITE_UP } satisfies Citation,
} as const

/** The two kinds of claim the domain keeps apart, in the write-up's words. */
export const KINDS_OF_CLAIM: readonly Note[] = [
  {
    id: "structural",
    title: "What CWA guarantees by construction",
    text: "Checked by code on every payload, with no model: assembly is the same on four independent assemblers, every attack text stays inside the evidence element it was retrieved into, escaped, and a governance claim made through an item's fields is excluded with the reason the specification names. An attacker who adapts cannot change these.",
  },
  {
    id: "behavioural",
    title: "What the model does with that structure",
    text: "Estimates with intervals, for one model and the attackers tested: how often the model carries out the attack, whether it still does the user's task, and whether it refuses clean ones.",
  },
]

/** What the write-up concludes, for the run it reports. */
export const CONCLUSIONS: readonly Note[] = [
  {
    id: "structure-held",
    title: "The guarantees held without exception",
    text: "Every CWA payload matched the prediction on four assemblers, passed the audit and read back item for item; no attack text left its element, and no forged chat-template marker reached the model as a token where the tokenizer was checked. The conventional payloads had their structure forged by every tag attack and handed the model raw turn markers.",
  },
  {
    id: "static",
    title: "Against static attacks, the escaping is what works",
    text: "CWA's rendering lowers attack success below plain concatenation, and lower still with the instructions repeated after the content. The same wrapping without escaping is no better than concatenation.",
  },
  {
    id: "human",
    title: "Human attacks transfer poorly to CWA's arms",
    text: "Emails written by people in a public challenge, adapted against other models and defences, get through CWA's arms far less often than conventional payloads.",
  },
  {
    id: "adaptive",
    title: "An adaptive attacker breaks every arm",
    text: "The two CWA arms that also state the boundary in governance hold best; plain CWA does no better than the conventional middle. The static ranking does not survive.",
  },
  {
    id: "open-channels",
    title: "Some channels CWA's assembly cannot close",
    text: "Material the user pastes into their own message gains nothing, since the assembler never splits a body. State a model writes from a poisoned document carries the poison with state's authority; state the application writes never does.",
  },
]

/** The write-up's one-sentence reading of the conclusions above. */
export const CONCLUSION =
  "CWA's guarantees are structural and exact, and they translate into a lower but nonzero model-side attack rate, with no loss of utility on clean tasks."

export const CONCLUSIONS_CITATION: Citation = { file: DOMAIN_5_WRITE_UP }

/** What the domain does not claim. */
export const SCOPE = {
  doesNot: [
    "That CWA prevents injection. Its metadata acts at admission and is never rendered; what the model reads is the escaped text in its element, and whether the model obeys it is the model's.",
    "Anything about other models, until the second family runs, or about agents with tools, which is another domain's.",
    "Security against an attacker with the model's weights: gradient and reinforcement-learning attackers were not built.",
  ],
  citation: {
    file: DOMAIN_5_WRITE_UP,
    section: "What it proves, and what it does not",
  } satisfies Citation,
} as const

/** Where the viability document promises what the specification does not have. */
export const CORRECTIONS_TO_VIABILITY: readonly Note[] = [
  {
    id: "decay",
    title: "No temporal decay",
    text: "The viability document expects older context's trust to decay. The specification has no decay: temporal handling is expiry, a maximum age and revocation, and S6 tests those.",
  },
  {
    id: "wording",
    title: "The assembler never reads wording",
    text: "The viability document expects the assembler to reject a document's attempt to bind to governance by its wording. An item gains no authority from its body; what binds it is its fields, its producer and the route, and S1 tests both kinds of attempt.",
  },
  {
    id: "near-zero",
    title: "No guaranteed attack rate",
    text: "The viability document expects attack success near zero. No such guarantee exists for a model's behaviour; the domain declares its comparisons and measures.",
  },
]

/** How an answer is judged: every verdict is code. */
export const JUDGING: readonly Note[] = [
  {
    id: "construction",
    title: "Ground truth by construction",
    text: "Every task is generated with its answer known, and re-derived from its text alone before a run is trusted.",
  },
  {
    id: "canaries",
    title: "Canaries by derivation",
    text: "An attack says how to form its code word and never writes it, so a reply that quotes or reports the attack does not contain it, and grades reported, not executed.",
  },
  {
    id: "verdicts",
    title: "Deterministic verdicts",
    text: "An attack is executed, partly executed, reported, unparsable or ignored, by code; no judge model grades anything. An action is read wherever an application would act on it.",
  },
  {
    id: "presence",
    title: "The attack-in-payload oracle",
    text: "Whether the attack reached the payload, read by the item the trace includes and by its text, which must agree; attack rates count only probes where it did.",
  },
  {
    id: "gate",
    title: "The assembly gate",
    text: "Every CWA payload is assembled by four assemblers, audited and read back item for item before it is sent.",
  },
]

export const JUDGING_CITATION: Citation = {
  file: DOMAIN_5_WRITE_UP,
  section: "How it judges an answer",
}

/** The write-up's own limits. */
export const TRUST: readonly Note[] = [
  {
    id: "one-model",
    title: "One model",
    text: "Every model-side number is for one model at one quantization, thinking off. The second family, a model trained for separation and its base, waits for a larger host; the structural results do not depend on the model.",
  },
  {
    id: "synthetic",
    title: "Synthetic tasks and templated attacks",
    text: "They give exact ground truth and no contamination, but they are regular. The external sets and the adaptive attacker are the checks against that.",
  },
  {
    id: "attacker",
    title: "The adaptive attacker is modest",
    text: "A budget of queries, random search and one model as its own red-teamer. A stronger attacker would find more; the adaptive numbers are lower bounds.",
  },
  {
    id: "transfer",
    title: "Transfer is a lower bound",
    text: "The human attacks were written against other models and defences.",
  },
  {
    id: "producers",
    title: "Producers decide much of the persistence suite",
    text: "The note, summary and extractor prompts are harness choices held equal across arms. Revocation runs on a schedule: nothing detects the poison.",
  },
  {
    id: "sampling",
    title: "Sampling",
    text: "One sample at temperature zero per attacked probe, a tenth repeated above zero, three per clean probe, with cluster-bootstrap intervals and paired comparisons. Small differences whose intervals barely exclude zero are weaker evidence than the large, consistent ones.",
  },
  {
    id: "draft",
    title: "A draft specification",
    text: "Every result is tied to the pinned contract commit.",
  },
]

export const TRUST_CITATION: Citation = { file: DOMAIN_5_WRITE_UP, section: "How far to trust it" }

/** What the run corrected in the harness's own work, found by reading each phase's replies. */
export const CORRECTIONS: readonly Note[] = [
  {
    id: "tasks",
    title: "Tasks that tested the wrong thing",
    text: "Clean accuracy was low in every arm because a task asked for a line number, let answers run into prose, or summed figures; the tasks were changed to test reading.",
  },
  {
    id: "actions",
    title: "Actions in forms the grader missed",
    text: "A model answering a payload that carries a tool call often answers with its own written as text; the action reader now reads every form an application would act on.",
  },
  {
    id: "attacker",
    title: "An attacker that could not follow its own format",
    text: "The adaptive attacker joined its placeholders, so random candidates stood in for many steps; joined placeholders are now rewritten in words.",
  },
  {
    id: "producers",
    title: "Producers that dropped what they should keep",
    text: "The first memory notes lost figures, which would have made memory look worse than a fair producer, and identical requests from different chains went out together, which a replay could not reproduce.",
  },
]

export const CORRECTIONS_CITATION: Citation = {
  file: DOMAIN_5_WRITE_UP,
  section: "What the run corrected along the way",
}
