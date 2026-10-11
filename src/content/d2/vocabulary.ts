// Domain 2's words (ui-plan.md, UI-D2 plan): what each arm sends, what each family of tasks does,
// and what each suite is for, read against the Domain 2 write-up at CONTENT_SOURCE. The records name arms, families and suites by id; these are the words beside the
// ids. Words only: no entry states a result.

import { DOMAIN_2_WRITE_UP, type Citation } from "../source"

/**
 * How the write-up groups the arms: the upper bounds with no budget, the conventional baselines
 * the harness builds, and the CWA arms the four assemblers assemble.
 */
export type ArmGroup = "control" | "conventional" | "cwa"

export type ArmWords = {
  id: string
  group: ArmGroup
  /** What the arm sends, in a phrase. */
  payload: string
  /** Why the arm is there, when the write-up says: an upper bound, the fair reference, a control. */
  role?: string
}

export const ARM_GROUPS: readonly { id: ArmGroup; label: string; text: string }[] = [
  {
    id: "control",
    label: "Upper bounds",
    text: "The whole task with no budget: what the model does when nothing is left out.",
  },
  {
    id: "conventional",
    label: "Conventional baselines",
    text: "What a conventional application sends, built by the harness from the same script, at the same points and budgets.",
  },
  {
    id: "cwa",
    label: "CWA arms",
    text: "Snapshots assembled by the four published assemblers, gated before the model sees them.",
  },
]

/** The conversation families' arms, then the long-context family's, each in the write-up's order. */
export const ARMS: readonly ArmWords[] = [
  {
    id: "control-full",
    group: "control",
    payload: "the whole conversation, or every chunk of the corpus, with no budget",
    role: "upper bound",
  },
  {
    id: "control-concat",
    group: "control",
    payload: "every fact stated so far, in one turn, with no budget",
    role: "upper bound",
  },
  {
    id: "concat",
    group: "conventional",
    payload: "every turn as native chat; when that exceeds the budget, nothing is sent",
  },
  {
    id: "truncate",
    group: "conventional",
    payload: "the newest turns that fit, the system prompt dropped with the oldest",
  },
  {
    id: "truncate-pinned",
    group: "conventional",
    payload:
      "the newest turns that fit, the system prompt pinned; over documents, the corpus's tail that fits",
    role: "the fair reference",
  },
  {
    id: "window",
    group: "conventional",
    payload: "a fixed window of the most recent turns",
  },
  {
    id: "summary",
    group: "conventional",
    payload: "the window and a rolling summary the model writes as turns leave it",
    role: "the strongest conventional control",
  },
  {
    id: "rag",
    group: "conventional",
    payload: "the retriever's best chunks that fit, best first",
    role: "the reference over documents",
  },
  {
    id: "cwa-history",
    group: "cwa",
    payload: "every turn as interaction.history",
  },
  {
    id: "cwa-state",
    group: "cwa",
    payload: "cwa-history plus state.task, written from the facts the user stated",
    role: "the upper bound for state",
  },
  {
    id: "cwa-state-x",
    group: "cwa",
    payload:
      "cwa-history plus state.task, written by the model turn by turn from the user's messages",
    role: "the realistic arm",
  },
  {
    id: "cwa-memory",
    group: "cwa",
    payload: "cwa-state with the recent turns as history and older facts as interaction.memory",
  },
  {
    id: "cwa-pipeline",
    group: "cwa",
    payload: "cwa-memory plus the route's supersession and deduplication",
  },
  {
    id: "cwa-format",
    group: "cwa",
    payload: "the window baseline's exact selection, rendered as CWA renders it",
    role: "the format control",
  },
  {
    id: "cwa-evidence",
    group: "cwa",
    payload:
      "the retriever's candidates as evidence.knowledge on the long-context-qa route, in the corpus's order",
  },
  {
    id: "cwa-reinforced",
    group: "cwa",
    payload: "cwa-evidence with the instructions repeated just before the question",
  },
  {
    id: "cwa-ranked",
    group: "cwa",
    payload:
      "cwa-evidence with each evidence id led by the retriever's rank, so it reads best first",
  },
]

export function armWords(id: string): ArmWords | undefined {
  return ARMS.find((arm) => arm.id === id)
}

/** The arm's place in the write-up's order; arms the content does not know sort after, by id. */
export function compareArms(a: string, b: string): number {
  const ia = ARMS.findIndex((arm) => arm.id === a)
  const ib = ARMS.findIndex((arm) => arm.id === b)
  const ra = ia < 0 ? ARMS.length : ia
  const rb = ib < 0 ? ARMS.length : ib
  return ra - rb || a.localeCompare(b)
}

/** The arm's group: an unknown arm is grouped by its name, as the harness names its arms. */
export function armGroup(id: string): ArmGroup {
  const known = armWords(id)
  if (known) return known.group
  if (id.startsWith("cwa-")) return "cwa"
  if (id.startsWith("control-")) return "control"
  return "conventional"
}

export type FamilyWords = {
  id: string
  /** The two letters the harness names the family by. */
  code: string
  title: string
  /** What the user does over the conversation. */
  does: string
  /** What a probe asks. */
  asks: string
  /** The family is a corpus of documents, not a conversation. */
  documents?: boolean
}

export const FAMILIES: readonly FamilyWords[] = [
  {
    id: "vt",
    code: "VT",
    title: "Variable tracking",
    does: "States figures, reassigns some, and mentions near-miss figures with similar names, among small talk",
    asks: "a figure's current value",
  },
  {
    id: "fr",
    code: "FR",
    title: "Facts revealed",
    does: "Reveals a record's fields, or an order's lines and fees, one per turn",
    asks: "the whole record, or the order's total",
  },
  {
    id: "cc",
    code: "CC",
    title: "Corrections",
    does: "States figures, then corrects them, naming the value taken back",
    asks: "a figure's corrected value",
  },
  {
    id: "ip",
    code: "IP",
    title: "Instruction persistence",
    does: "Variable tracking, with one rule in the system prompt: brackets around figures, a sign-off, or capital letters",
    asks: "the figure, and the rule, checked by code",
  },
  {
    id: "lq",
    code: "LQ",
    title: "Long context",
    does: "A corpus of fictional site documents, chunked, with one question of each kind",
    asks: "a single fact, a comparison of two sites, or a fact the documents never state",
    documents: true,
  },
]

export function familyWords(id: string): FamilyWords | undefined {
  return FAMILIES.find((family) => family.id === id)
}

/** What each suite is for, one line each. */
export const SUITES: readonly { id: string; text: string }[] = [
  {
    id: "S0",
    text: "The graders, the generators and the fact-in-payload oracle checked against planted answers and omissions, before any result is trusted.",
  },
  {
    id: "S1",
    text: "Every CWA snapshot assembled by all four assemblers and judged against the harness's prediction and Domain 1's audit; only payloads that pass reach the model. The baselines are built and recorded here too.",
  },
  {
    id: "S2",
    text: "Every probe of every script sent to the model in every arm, at each budget, and each reply graded.",
  },
  {
    id: "S3",
    text: "S2's payloads asked again at a higher temperature, to measure how much repeated samples vary.",
  },
  {
    id: "S4",
    text: "Questions over corpora from a fraction of the budget to many times it, in the retrieval and CWA evidence arms.",
  },
  {
    id: "S5",
    text: "Tokens per answer and per correct answer, latency, and the token estimator's under-count, from the calls the other suites made.",
  },
  {
    id: "S6",
    text: "The model's own reply at each turn becomes the history of the next, every CWA payload gated before it is sent.",
  },
  {
    id: "S7",
    text: "Probe answers all four assemblers agreed on, kept as goldens; later runs report drift from them.",
  },
]

export function suiteWords(id: string): string | undefined {
  return SUITES.find((suite) => suite.id === id)?.text
}

export const ARMS_CITATION: Citation = { file: DOMAIN_2_WRITE_UP, section: "How it is set up" }
export const SUITES_CITATION: Citation = { file: DOMAIN_2_WRITE_UP, section: "Results" }
