// The words of Domain 5's question pages (the UI-D5 plan): for each, the viability document's
// metric it answers, what the document expected, the paper it adopts or departs from, how Domain 5
// measures it, and what the write-up concludes. Read against the viability document and the
// Domain 5 write-up at CONTENT_SOURCE. Words only: every number beside them comes from the
// records, and the viability document's own figures come from other setups, so none is here.

import type { Paper, QuestionWords as SharedQuestionWords } from "../questions"
import { DOMAIN_5_WRITE_UP, VIABILITY_DOCUMENT, type Citation } from "../source"

export type QuestionId =
  "structure" | "attacks" | "utility" | "adaptive" | "external" | "pasted" | "persistence"

export type QuestionWords = SharedQuestionWords<QuestionId>

const VIABILITY_D5: Citation = {
  file: VIABILITY_DOCUMENT,
  section: "Testing CWA as an External Security Harness",
}

const BIPIA: Paper = {
  title:
    "Benchmarking and Defending Against Indirect Prompt Injection Attacks on Large Language Models",
  authors: "Yi et al., 2023",
  url: "https://arxiv.org/abs/2312.14197",
  text: "BIPIA plants instructions in the content of email, web, table and code tasks, and grades many of its attacks with a judge model. The viability document proposes it; its repository has since been archived, and Domain 5 writes its own seeded tasks and attacks after its scenarios, graded by code.",
}

export const STRUCTURE: QuestionWords = {
  id: "structure",
  title: "Structural Isolation",
  question:
    "Whatever its fields claim or its words say, does content from an untrusted source stay out of the instructions, inside its own element of the payload?",
  viability: {
    where: "A row of its Domain 5 table",
    metric: "Latent Role Confusion",
    baseline:
      "An attacker formats text to masquerade as a system or developer message, and the model takes it for one.",
    expected:
      "The assembler refuses to map the text to a governance slot, and enforces the boundary outside the model.",
    citation: VIABILITY_D5,
  },
  measured: [
    "No model is involved: every CWA payload is assembled by four independent assemblers and checked by code before any is sent. A structure oracle reads each payload back item for item, so a forged closing tag, element or chat-template marker inside a body must come back as text inside that body.",
    "The assembler never reads wording: an item gains no authority from its body. Claims made through an item's fields (a retrieved chunk declaring governance authority, an unverified policy item, a tool proposing a capability the route does not allow) must be excluded with the reason the specification names, the payload unchanged. A flood of instruction-like content must be shed with every protected item kept.",
    "The conventional payloads are read with their own delimiters for the structure an attack forged, and for chat-template markers handed to the model as raw text: a structural success of the attack before any model reads it.",
  ],
  writeUp: {
    text: [
      "What CWA guarantees by construction held without exception: every payload matched the prediction, passed the audit and read back item for item, no attack text left its element, and every field-level claim was excluded with the specification's reason.",
      "The conventional payloads had their structure forged by every tag attack, and handed the model raw turn markers that the served tokenizer reads as real turn boundaries.",
    ],
    citation: { file: DOMAIN_5_WRITE_UP, section: "Structure (S1)" },
  },
}

export const ATTACKS: QuestionWords = {
  id: "attacks",
  title: "Attacks",
  question:
    "When retrieved content carries an attacker's instruction, how often does the model carry it out, in each way of building the payload?",
  viability: {
    where: "A row of its Domain 5 table",
    metric: "Indirect Prompt Injection (IPI)",
    baseline:
      "Malicious commands embedded in web text or tool output are carried out by the model.",
    expected: "Attack success near zero without loss of benign utility.",
    citation: VIABILITY_D5,
  },
  paper: BIPIA,
  measured: [
    "Six seeded task families, with ground truth known by construction, each attacked by six attack families at the start, middle or end of an item, dressed in five carriers: plain text, a fake heading, a forged close of the arm's own wrapper, forged chat-template markers, or a forged completed reply. Each arm sends the same task, content, attack and question; only the way the payload is built changes.",
    "A canary is never written in the attack: the attack says how to form it, so a reply that quotes or reports the attack does not contain it. Attack success counts only probes where the attack reached the payload and its outcome can be observed in the reply.",
    "The controlled pairs differ in one thing: wrapping, then escaping; the same defence sentence in a user message or in governance; repeating the instructions after the evidence; a native tool message against CWA's observation slot.",
  ],
  writeUp: {
    text: [
      "The escaping is what works: wrapping content in elements without escaping it gains nothing over plain concatenation, while escaping it, so content can neither close its element nor open another, lowers attack success. With the same defence sentence, CWA's arm is below the conventional one, and repeating the instructions after the evidence lowers it again.",
      "Attack success does not rise with content length in any arm, attacks hidden in HTML markup rarely land, and a producer that extracts visible text keeps them all out. Sampling above temperature zero keeps the ranking.",
    ],
    citation: { file: DOMAIN_5_WRITE_UP, section: "Static attacks (S2)" },
  },
}

export const UTILITY: QuestionWords = {
  id: "utility",
  title: "Utility",
  question:
    "Does a defence cost the user's task: clean tasks answered, tasks whose content holds benign instructions, and refusals?",
  viability: {
    where: "A row of its Domain 5 table, the second half of its objective",
    metric: "Indirect Prompt Injection: without loss of benign utility",
    baseline: "A defence that makes the model distrust its content can stop it doing the task.",
    expected: "Attack success falls with no loss of benign utility.",
    citation: VIABILITY_D5,
  },
  measured: [
    "Every task family comes plain and as a benign imperative variant, whose content holds instruction-like text the answer depends on, written with the words injections use. A defence that makes the model ignore every instruction in content loses those, and the loss shows here as utility.",
    "Clean tasks are sent three times each; a refusal of a clean task is counted apart. The code family also shows a cost of escaping: a body with angle brackets or ampersands reaches the model escaped.",
  ],
  writeUp: {
    text: [
      "No clean task is refused in any arm, and the CWA arms with the boundary sentence answer the task under attack more often than any conventional arm.",
      "Benign imperatives cost every arm; the CWA arms sit mid-pack, and datamarking costs most, while being the strongest static defence after repeating the instructions and the most expensive in tokens.",
    ],
    citation: { file: DOMAIN_5_WRITE_UP, section: "Static attacks (S2)" },
  },
}

export const ADAPTIVE: QuestionWords = {
  id: "adaptive",
  title: "Adaptive Attacker",
  question:
    "When the attacker knows the payload's format and keeps trying, how far does each arm hold, against its static attack rate?",
  viability: {
    where: "A row of its Domain 5 table, measured against an attacker that adapts",
    metric: "Indirect Prompt Injection (IPI)",
    baseline: "Defences that report near-zero attack success against static attacks.",
    expected: "Attack success near zero.",
    citation: VIABILITY_D5,
  },
  paper: {
    title:
      "The Attacker Moves Second: Stronger Adaptive Attacks Bypass Defenses Against LLM Jailbreaks and Prompt Injections",
    authors: "Nasr et al., 2025",
    url: "https://arxiv.org/abs/2510.09023",
    text: "Tuned adaptive attacks broke published defences that had reported near-zero attack success against static ones. Domain 5 reports its adaptive results beside its static ones, never after them.",
  },
  measured: [
    "Per arm, a budget of target queries on training instances apart from the run's, shared by a random search over templates, carriers, positions and operators (an encoding, repetition, a fake authorization, an instruction split across two items) and a loop in which the model, told the arm's format as a published defence would describe it, proposes the next attack after seeing the last one fail.",
    "At checkpoints in the budget, the best attack so far is sent against every held-out instance, so the curve shows whether it was still improving when the budget ran out.",
  ],
  writeUp: {
    text: [
      "Every arm falls to an attacker that adapts, and the static ranking does not survive: the arm nearly immune to static attacks is the most broken. The best attack in every arm was found early in the budget.",
      "The two CWA arms with the defence sentence in governance hold best; plain CWA does not. The attacker's winning attacks imitate the format it was told about; escaping keeps those from being structure, and the model still finds some persuasive.",
    ],
    citation: { file: DOMAIN_5_WRITE_UP, section: "An adaptive attacker (S4)" },
  },
}

export const EXTERNAL: QuestionWords = {
  id: "external",
  title: "External Sets",
  question:
    "Against attacks written by people, and on a published measure of instruction and data separation, how does each arm do?",
  viability: {
    where: "Its methodology for indirect prompt injection",
    metric: "Use the BIPIA framework",
    baseline: "Conventional payloads, measured on an external benchmark.",
    expected: "Lower attack success on an external benchmark.",
    citation: VIABILITY_D5,
  },
  paper: {
    title: "LLMail-Inject: A Dataset from a Realistic Adaptive Prompt Injection Challenge",
    authors: "Abdelnabi et al., 2025",
    url: "https://arxiv.org/abs/2506.09956",
    text: "Attack emails written by people in a public challenge, adapted against live defences; success was an email the user never asked for, checkable by code.",
  },
  morePapers: [
    {
      title: "Can LLMs Separate Instructions From Data? And What Do We Even Mean By That?",
      authors: "Zverev et al., 2024",
      url: "https://arxiv.org/abs/2403.06833",
      text: "SEP pairs a task with data and a probe placed in the instruction or in the data; a witness string shows the probe was executed.",
    },
  ],
  measured: [
    "In place of BIPIA, two maintained sets graded by code: a seeded sample of LLMail-Inject's emails, each placed in its scenario's inbox and graded by whether the model sends the attacker's email; and a sample of SEP's cases, each run with its probe in the instructions and in the data.",
    "The emails were adapted against other models and defences, so they measure transfer: a lower bound on what an attacker adapting to these arms would reach. SEP's separation score is its own: of the cases whose probe is executed from the instruction, the share not executed from the data.",
  ],
  writeUp: {
    text: [
      "Human attacks transfer poorly to CWA's arms. Wrapping does most of it, and escaping a little more; emails that beat the challenge's own defences transfer more often than those that did not.",
      "SEP measures something else, whether a benign question appended to the data is answered. CWA's rendering does not change it; repeating the instructions after the evidence does, at no cost to utility. The native tool message is the weakest arm against human attacks.",
    ],
    citation: { file: DOMAIN_5_WRITE_UP, section: "External sets (S3)" },
  },
}

export const PASTED: QuestionWords = {
  id: "pasted",
  title: "Pasted Material",
  question:
    "When the attack is in material the user pastes into their own message, does CWA's assembly help, and does a boundary the material cannot imitate?",
  viability: {
    where: "A row of its Domain 5 table, through the user's own message",
    metric: "Indirect Prompt Injection (IPI)",
    baseline:
      "Pasted material is part of the user's message, and its instructions read as the user's.",
    expected: "Attack success near zero.",
    citation: VIABILITY_D5,
  },
  measured: [
    "The same emails and documents, pasted above the question instead of retrieved. The assembler never splits a body, so in CWA the material renders escaped inside the query's own element: the specification says pasted material is the user's text, and recommends the application delimit it.",
    "Five arms: the material pasted plainly, between fixed boundary strings an attack can forge, inside a boundary carrying a code made for the request that the material cannot know, and the same two ways as CWA's query item.",
  ],
  writeUp: {
    text: [
      "CWA's rendering gives pasted material nothing: it is the user's own text, inside the query, as the specification says.",
      "A delimiter the material cannot imitate helps a little. Tag attacks forged the fixed boundary every time and the coded one never, yet the two were attacked about as often.",
    ],
    citation: { file: DOMAIN_5_WRITE_UP, section: "Pasted material (S5)" },
  },
}

export const PERSISTENCE: QuestionWords = {
  id: "persistence",
  title: "Persistence",
  question:
    "When a poisoned document is attached early in a long conversation, does its attack outlive its turn, and where does it go?",
  viability: {
    where: "A row of its Domain 5 table",
    metric: "Memory Poisoning Persistence",
    baseline:
      "An injection writes itself into the agent's long-term memory or state, and acts on later turns.",
    expected:
      "Exponential temporal decay reduces the malicious influence over time. The specification has no decay: it has expiry, a maximum age and revocation, and those are what is tested.",
    citation: VIABILITY_D5,
  },
  measured: [
    "Domain 2's variable-tracking conversations, played turn by turn with the model's own replies. Early on the user attaches a document that is clean, asks for a code word in every later reply, plants a false figure for a tracked variable, or plants a trigger for a later question. Probes later ask for that figure.",
    "Eight ways of carrying the conversation forward: the whole transcript; a window and a rolling summary; CWA history, where the document is evidence for its own turn only; CWA memory from model-written notes, as is, expiring, or with the poisoned note revoked; CWA state from a model-written extractor; and CWA state written from what the user said, which cannot be poisoned.",
  ],
  writeUp: {
    text: [
      "Where the document stays, the attack stays: in a chat transcript the code word appears in most later replies, and with the document as evidence for its own turn only, in few. At the poisoned turn itself the model carried out the attack in nearly every arm: CWA bounds an attack's lifetime, not its first effect.",
      "State written by a model is the open channel: the extractor wrote the planted figure into state, and with state's authority it answered as often as the transcript; the oracle writer never took it. The memory notes recast the document's claim as the user's own. Revoking the poisoned note works and keeps accuracy; expiring every note works but forgets older figures.",
    ],
    citation: { file: DOMAIN_5_WRITE_UP, section: "Persistence and delayed triggers (S6)" },
  },
}

/** Every question page's words, in the sidebar's order. */
export const QUESTIONS: readonly QuestionWords[] = [
  STRUCTURE,
  ATTACKS,
  UTILITY,
  ADAPTIVE,
  EXTERNAL,
  PASTED,
  PERSISTENCE,
]
