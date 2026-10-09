// The glossary (ui-plan.md 8.11): the words of the architecture and of the benchmark, each defined
// once and cited to the file it was read against at CONTENT_SOURCE. The architecture's terms come
// from the specification's contract as the nightly fixture carries it (contract commit 16de4be)
// and from the viability document; the benchmark's from the Domain 1 write-up and, for the
// domains not yet started, the viability document. Words only: no definition states a result.

import { VOCABULARY_CITATION } from "./d1/vocabulary"
import { DOMAIN_1_WRITE_UP, VIABILITY_DOCUMENT, type Citation } from "./source"

export type GlossaryGroup = "architecture" | "benchmark"

export type GlossaryEntry = {
  /** Stable and URL-safe: the term's anchor on the glossary page. */
  id: string
  term: string
  /** Other names the term goes by, which the glossary's filter also matches. */
  also?: readonly string[]
  group: GlossaryGroup
  text: string
  /** Ids of related entries. */
  see?: readonly string[]
  citation: Citation
}

const CONTRACT = VOCABULARY_CITATION.file

const contract = (section: string): Citation => ({ file: CONTRACT, section })
const writeUp = (section?: string): Citation =>
  section ? { file: DOMAIN_1_WRITE_UP, section } : { file: DOMAIN_1_WRITE_UP }
const viability = (section?: string): Citation =>
  section ? { file: VIABILITY_DOCUMENT, section } : { file: VIABILITY_DOCUMENT }

const ARCHITECTURE: readonly Omit<GlossaryEntry, "group">[] = [
  {
    id: "cwa",
    term: "Context Window Architecture",
    also: ["CWA"],
    text: "An open specification, not a library and not a model, for assembling every call to a model from strictly typed slots, grouped into planes, under an exact token budget. Given the same frozen inputs, policies and budget, a conforming assembler emits the same payload in the same order every time, with a trace of every decision.",
    see: ["assembler", "slot", "plane", "determinism"],
    citation: viability(),
  },
  {
    id: "context-engineering",
    term: "Context engineering",
    also: ["prompt engineering"],
    text: "Deciding, at the level of a session rather than a single message, what is retrieved, compressed, remembered and formatted before a model sees anything. Prompt engineering works on the wording of one message; CWA treats context engineering as a deterministic, verifiable software process.",
    see: ["cwa"],
    citation: viability(),
  },
  {
    id: "assembler",
    term: "Assembler",
    text: "The component that turns a frozen snapshot of context items into the exact payload sent to a model, along with a trace of every decision it made. It calls no model. Domain 1 tests the published assemblers in Python, TypeScript, Go and Rust.",
    see: ["snapshot", "payload", "trace", "adapter"],
    citation: writeUp(),
  },
  {
    id: "snapshot",
    term: "Snapshot",
    also: ["frozen snapshot"],
    text: "Everything one assembly reads, frozen: the candidate items, the route's policy, the budget, the clock and the components to use. Determinism is defined over the snapshot, so nothing outside it may change the answer.",
    see: ["determinism", "digest", "item"],
    citation: writeUp(),
  },
  {
    id: "item",
    term: "Item",
    also: ["context item", "candidate"],
    text: "One unit of context offered to the assembler: an instruction, a fact of state, a retrieved chunk, a tool observation, a summary or a turn. Each item names exactly one slot and one authority (R-1) and carries metadata such as its source, version, freshness, tier and injection risk. Before admission decides its fate it is a candidate.",
    see: ["slot", "authority", "admission"],
    citation: contract("requirements[] R-1"),
  },
  {
    id: "producer",
    term: "Producer",
    also: ["retriever"],
    text: "Whatever builds items before assembly: a retriever, a memory store, a tool, a summarizer. Producers own the stages before admission (rewrite, retrieve, rerank, package), send one scored item per retrieved chunk rather than one merged blob (R-13), and report what they suppressed. The route says which producers may send to which slots (R-15).",
    see: ["route", "variant", "memory"],
    citation: contract("stages[]"),
  },
  {
    id: "slot",
    term: "Slot",
    text: "A typed place in the payload, such as governance.instructions or evidence.knowledge. Each slot belongs to one plane and says what it holds, which authority its items may carry, and its defaults, among them its tier and its conflict policy. The slots and their words come from each run's contract.",
    see: ["plane", "tier", "authority", "contract"],
    citation: contract("slots[]"),
  },
  {
    id: "plane",
    term: "Plane",
    also: ["governance plane", "state plane", "evidence plane", "interaction plane"],
    text: "One of the groups of slots, each answering one question: governance, who may direct the model; state, what is true right now; evidence, what the model may ground on; interaction, what has happened and what is asked. The viability document names the last two State/History and Current Query; this site uses the contract's names.",
    see: ["slot"],
    citation: contract("planes[]"),
  },
  {
    id: "authority",
    term: "Authority",
    also: ["authority role"],
    text: "The role an item holds, from a closed set: governing instruction, user intent, canonical state, reference evidence, tool observation, generated memory and untrusted. Authority decides who may direct the model, which is kept separate from which fact wins (R-6), and it never comes from an item's wording (R-7).",
    see: ["injection-risk", "conflict-group", "item"],
    citation: contract("authority[]"),
  },
  {
    id: "tier",
    term: "Tier",
    also: ["protected", "compressible", "droppable"],
    text: "How far an item may be reduced under budget pressure. Protected content is rendered whole or the assembly is refused; compressible items may give way to a shorter variant or be omitted; droppable items go first. Shedding follows tier order: droppable, then compressible (R-16).",
    see: ["fitting", "budget", "variant"],
    citation: contract("slots[].defaults.tier"),
  },
  {
    id: "budget",
    term: "Token budget",
    also: ["budget"],
    text: "The number of tokens the rendered payload may use. Tokens are counted on the rendered payload with the snapshot's tokenizer, not estimated item by item (R-16).",
    see: ["fitting", "components", "refusal-threshold"],
    citation: contract("requirements[] R-16"),
  },
  {
    id: "route",
    term: "Route",
    also: ["route policy"],
    text: "The application's policy for one kind of request: which producers may send to which slots, the relevance evidence needs, whether evidence is required, and whether supersession, deduplication and source diversity apply. The same item can be admitted on one route and excluded on another.",
    see: ["admission", "refusal"],
    citation: contract("stages[] Admit, Resolve"),
  },
  {
    id: "admission",
    term: "Admission",
    text: "The assembler's first stage. Each item is checked against its schema and the route: who sent it, which slot, what authority, its scope, age and expiry, and its relevance. Anything that fails is excluded with a reason code.",
    see: ["exclusion", "reason-code", "route"],
    citation: contract("stages[] Admit"),
  },
  {
    id: "exclusion",
    term: "Exclusion",
    text: "An item left out of the payload, recorded in the trace with a reason code. An exclusion affects one item; a refusal stops the whole assembly.",
    see: ["reason-code", "refusal"],
    citation: contract("reasons[]"),
  },
  {
    id: "reason-code",
    term: "Reason code",
    also: ["reason", "reason precedence"],
    text: "The named cause of an exclusion or a refusal, such as expired, superseded, over_budget or evidence_required, each tied to the requirement it enforces. When an item fails more than one check, precedence decides which code the trace records.",
    see: ["exclusion", "refusal", "requirement"],
    citation: contract("reasons[]"),
  },
  {
    id: "refusal",
    term: "Refusal",
    also: ["recovery action", "evidence_required"],
    text: "The assembler declining to produce a payload: for example when a required slot is missing, protected content cannot fit the budget, a conflict cannot be settled, or a route that requires evidence has none (R-12, never answer from nothing). A refused assembly has no rendered payload (R-17); its trace records the decisions made before the refusal and the recovery action for the application.",
    see: ["reason-code", "refusal-threshold"],
    citation: writeUp("What it proves, and what it does not"),
  },
  {
    id: "conflict-group",
    term: "Conflict group",
    also: ["conflict policy"],
    text: "Items the application declares in conflict, such as two instructions or two versions of a fact, settled by explicit rules and recorded in the trace (R-11). A slot's conflict policy, governs or defers, says how its items stand in a group. A group that cannot be settled refuses the assembly.",
    see: ["authority", "refusal"],
    citation: contract("requirements[] R-11"),
  },
  {
    id: "supersession",
    term: "Supersession",
    also: ["superseded"],
    text: "On routes that ask for it, dropping a tool observation that a newer one supersedes, so the model sees the current result rather than a stale one (R-25).",
    see: ["deduplication", "source-diversity"],
    citation: contract("requirements[] R-25"),
  },
  {
    id: "deduplication",
    term: "Deduplication",
    also: ["dedupe", "duplicate_content"],
    text: "On routes that ask for it, dropping exact duplicates (R-24).",
    see: ["supersession", "source-diversity"],
    citation: contract("requirements[] R-24"),
  },
  {
    id: "source-diversity",
    term: "Source diversity",
    also: ["max_per_source", "diversity"],
    text: "On routes that ask for it, capping how many items one source may contribute (R-26).",
    see: ["supersession", "deduplication"],
    citation: contract("requirements[] R-26"),
  },
  {
    id: "fitting",
    term: "Fitting",
    also: ["fit", "shedding", "shed"],
    text: "The stage that makes the payload fit the budget. It refuses first if protected content cannot fit; otherwise it applies item and slot caps, then sheds in tier order, droppable before compressible, giving way to a shorter variant or omitting the item. Shedding is the order in which items leave as the budget falls.",
    see: ["tier", "budget", "budget-sweep"],
    citation: contract("stages[] Fit"),
  },
  {
    id: "variant",
    term: "Variant",
    also: ["precomputed variant", "summary"],
    text: "A precomputed alternative body of an item, such as a summary, frozen into the snapshot by a producer. No model may be called during assembly (R-18), so fitting can only choose among the variants already there; the trace names each selected variant's id and method.",
    see: ["fitting", "producer", "fidelity-check"],
    citation: writeUp("Summarization before freeze (S11)"),
  },
  {
    id: "payload",
    term: "Payload",
    text: "What the assembler renders for the model: the admitted items in the profile's order, under the budget, byte for byte. Its payload hash identifies it.",
    see: ["profile", "digest", "trace"],
    citation: contract("stages[] Render & trace"),
  },
  {
    id: "trace",
    term: "Trace",
    text: "The record of an assembly: every admission, exclusion, conflict, fitting and refusal decision, with provenance, the snapshot digest and the defaults filled in (R-22), as JSON that matches the published trace schema (R-21).",
    see: ["trace-auditor", "payload"],
    citation: contract("requirements[] R-21, R-22"),
  },
  {
    id: "digest",
    term: "Digest",
    also: ["snapshot digest", "payload hash", "hash"],
    text: "A hash that identifies bytes exactly. The snapshot digest names what an assembly read and the payload hash what it rendered, so two answers with the same digests are the same answer.",
    see: ["snapshot", "payload", "independent-primitives"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "profile",
    term: "Profile",
    also: ["rendering profile"],
    text: "Where each slot is placed in the payload, which slots are mandatory, and the order they render in. Profiles are versioned; an assembler validates the version and the mandatory slots before it renders (R-20), and draft profiles are kept apart from evaluated ones (R-19).",
    see: ["payload", "slot"],
    citation: contract("requirements[] R-19, R-20"),
  },
  {
    id: "components",
    term: "Components",
    also: ["tokenizer", "renderer"],
    text: "The tokenizer that counts tokens and the renderer that writes the payload, each named and versioned in the snapshot. An assembler that does not have a named component exits as unsupported rather than guess.",
    see: ["budget", "adapter"],
    citation: contract("components"),
  },
  {
    id: "rule-zero",
    term: "Rule zero",
    also: ["R-5"],
    text: "Enforce invariants outside the model: nothing relies on the model's own reasoning to keep the structure intact (R-5). Only an application can meet it, so Domain 1 does not test it.",
    see: ["requirement"],
    citation: contract("requirements[] R-5"),
  },
  {
    id: "requirement",
    term: "Requirement",
    also: ["R-1", "R-n"],
    text: "A numbered rule of the specification, such as R-12, never answer from nothing. Each has a scope: the assembler, the boundary between assembler and application, or the application alone. The run's contract lists them, and Coverage shows which a run exercised.",
    see: ["contract", "reason-code"],
    citation: contract("requirements[]"),
  },
  {
    id: "injection-risk",
    term: "Injection risk",
    also: ["untrusted content", "untrusted"],
    text: "Metadata marking content that might carry an injected instruction. User and fetched content is marked, never elevated, and kept out of governance (R-10), whatever its wording says. It is distinct from the untrusted authority, which asks only for least privilege.",
    see: ["authority", "indirect-prompt-injection"],
    citation: contract("authority[] untrusted"),
  },
  {
    id: "freshness",
    term: "Freshness",
    also: ["expired", "stale state"],
    text: "When an item's content was true and until when. Admission excludes items that have expired, are dated in the future, or are stale state.",
    see: ["admission", "memory"],
    citation: contract("reasons[]"),
  },
  {
    id: "memory",
    term: "Memory",
    also: ["generated memory"],
    text: "Summaries and inferences the system wrote about earlier turns. Memory is fallible: it expires and can be revoked, and its producers suppress and report expired or revoked items (R-9, R-14).",
    see: ["producer", "freshness"],
    citation: contract("authority[] generated"),
  },
  {
    id: "determinism",
    term: "Determinism",
    text: "The same frozen snapshot gives the same payload bytes and the same decision, across repeated runs, processes, environments, platforms, toolchains and implementations (R-23). The clock and the policy are part of the snapshot.",
    see: ["snapshot", "purity", "repeatability"],
    citation: writeUp("What it proves, and what it does not"),
  },
  {
    id: "purity",
    term: "Purity",
    text: "Assembly reads nothing ambient: no network, no clock, no environment (R-18, R-23). Domain 1 observes it from outside, with no network namespace, a read-only root and every system call traced.",
    see: ["determinism"],
    citation: writeUp("What it proves, and what it does not"),
  },
]

const BENCHMARK: readonly Omit<GlossaryEntry, "group">[] = [
  {
    id: "domain",
    term: "Domain",
    text: "One of the areas the viability document asks the benchmark to prove: assembly; long-horizon stability; agentic capability; economics and caching; hierarchy and security. Each has its own claim and its own suites.",
    see: ["suite"],
    citation: viability(),
  },
  {
    id: "oracle",
    term: "Oracle",
    also: ["test oracle"],
    text: "Anything that decides whether an answer is right. Domain 1 trusts no single oracle: every answer is judged by up to four independent ones (expected output, differential agreement, the trace auditor and metamorphic relations), and the oracles are tested on every run before their verdicts count.",
    see: ["expected-output", "differential-testing", "trace-auditor", "metamorphic-relation"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "expected-output",
    term: "Expected output",
    text: "The oracle that compares an answer with what it should be: the specification's conformance corpus and the labeled generators. It is the only oracle that catches a mistake every implementation shares.",
    see: ["conformance-corpus", "labeled-generator", "oracle"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "labeled-generator",
    term: "Labeled generator",
    text: "A generator that builds a snapshot from a table of intended outcomes, so every decision in it is known by construction, before any assembler runs. Each was checked against the reference assembler before use.",
    see: ["expected-output", "generative-fuzzing"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "conformance-corpus",
    term: "Conformance corpus",
    also: ["conformance case", "rejection", "conformance replay"],
    text: "The specification's own test cases: snapshots with their expected payloads and traces, and malformed snapshots that must be rejected. Replaying it is the first suite after the oracle self-check, and each defect the benchmark finds becomes a new case once minimized.",
    see: ["expected-output", "minimized-reproducer"],
    citation: writeUp("Suites and results"),
  },
  {
    id: "differential-testing",
    term: "Differential testing",
    also: ["differential agreement", "differential oracle", "agreement"],
    text: "Running independent implementations on the same input and requiring them to agree, here on the outcome, the payload bytes and the normalized trace. A disagreement points at a defect without saying which side has it; agreement proves nothing when every implementation is wrong the same way.",
    see: ["oracle", "expected-output"],
    citation: writeUp("How far to trust it"),
  },
  {
    id: "trace-auditor",
    term: "Trace auditor",
    also: ["auditor", "audit"],
    text: "An oracle that never assembles. From the snapshot, the trace and the payload alone it re-derives everything it can, check by check (A1 to A16): conservation of candidates, token accounting, protected integrity, tier order, ordering, reason validity and precedence, conflict decisions, no synthesized text.",
    see: ["oracle", "mutant", "trace"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "metamorphic-relation",
    term: "Metamorphic relation",
    also: ["metamorphic testing", "MR"],
    text: "A known relation between the answers to two related inputs, used where the right answer to either is hard to state outright. Some changes must leave the answer untouched: a permutation, a JSON respelling, an equivalent timestamp, an inert addition. Others must change it exactly as predicted: a renaming that reverses id order, a raised budget or margin. Domain 1's relations are MR1 to MR14, built from seed snapshots.",
    see: ["oracle", "generative-fuzzing"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "generative-fuzzing",
    term: "Generative fuzzing",
    also: ["fuzzing", "mutation fuzzing"],
    text: "Generating inputs by the thousand instead of writing them by hand. Domain 1 generates valid snapshots steered toward behaviour not yet exercised, each judged by the auditor and by agreement, and mutants that each break one snapshot check and must be rejected, without a crash.",
    see: ["mutant", "minimized-reproducer", "labeled-generator"],
    citation: writeUp("Suites and results"),
  },
  {
    id: "mutant",
    term: "Mutant",
    also: ["mutation", "kill rate"],
    text: "A deliberately broken input or output used to test a check. A check kills a mutant when it catches it, and its kill rate over many mutants measures how far it can be trusted. The auditor's kill rate over broken traces is measured on every run, and each mutant it misses is listed with why it is out of reach without assembling.",
    see: ["trace-auditor", "planted-defect"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "golden",
    term: "Golden",
    also: ["goldens", "consensus golden", "golden drift", "re-baseline"],
    text: "A stored answer that later runs are compared with, so a change in behaviour shows up as drift. Domain 1's consensus goldens are answers every implementation agrees on, adopted deliberately; they are re-baselined by decision, never automatically, and a mismatch is a regression until explained.",
    see: ["drift-report", "differential-testing"],
    citation: writeUp("How far to trust it"),
  },
  {
    id: "oracle-self-check",
    term: "Oracle self-check",
    also: ["S0"],
    text: "The suite that tests the oracles before they are trusted. On every run the independent primitives must reproduce every published digest, hash, token count and payload, and the auditor's kill rate is measured.",
    see: ["independent-primitives", "mutant", "oracle"],
    citation: writeUp("How it judges an answer"),
  },
  {
    id: "independent-primitives",
    term: "Independent primitives",
    text: "The harness's own hashing, digests, token counting and rendering, written apart from any assembler so the oracles never borrow the code under test. They found a defect in the specification's own tooling.",
    see: ["oracle-self-check", "digest"],
    citation: writeUp("Defects it found"),
  },
  {
    id: "planted-defect",
    term: "Planted defect",
    text: "A defect put into the reference assembler on purpose by an opt-in test, to show that the check meant to catch it does: mutation testing of the oracles themselves.",
    see: ["mutant", "oracle-self-check"],
    citation: writeUp("How far to trust it"),
  },
  {
    id: "suite",
    term: "Suite",
    text: "A group of tests aimed at one property, with an id such as S5. Domain 1's suites cover the oracle self-check, conformance, repeatability, metamorphic relations, fuzzing, admission, budget pressure, refusal, conflicts, purity, the producer pipeline and consensus goldens.",
    see: ["run", "domain"],
    citation: writeUp("Suites and results"),
  },
  {
    id: "adapter",
    term: "Adapter",
    also: ["adapter protocol", "black box", "unsupported"],
    text: "The thin program that lets the harness drive an assembler as a black box: snapshot bytes on standard input; a payload and trace, a rejection, or an unsupported exit on standard output. Every assembler answers through the same protocol, so each is judged the same way.",
    see: ["assembler", "harness"],
    citation: writeUp(),
  },
  {
    id: "harness",
    term: "Harness",
    also: ["cwabench"],
    text: "The benchmark's test driver: it builds the adapters, runs the suites, judges every answer and writes the run directory. Its command-line tool is cwabench.",
    see: ["run", "adapter"],
    citation: writeUp("Reproducing it"),
  },
  {
    id: "run",
    term: "Run",
    also: ["run directory", "run profile", "nightly"],
    text: "One execution of the harness, written as a self-describing, schema-validated directory. A run profile, such as nightly, chooses the suites and the assembler commits. Every number on this site is read from a run.",
    see: ["harness", "drift-report", "contract"],
    citation: writeUp("Reproducing it"),
  },
  {
    id: "contract",
    term: "Contract",
    also: ["pinned commit", "pin"],
    text: "The specification at the commit a run was tested against, as the run records it: its requirements, reason codes, planes, slots, authority roles and stages. Every result is tied to that pinned commit, and the site's words and diagrams for those things come from it.",
    see: ["requirement", "slot", "run"],
    citation: writeUp("How far to trust it"),
  },
  {
    id: "finding",
    term: "Finding",
    text: "Something a run recorded for a person to look at, with the evidence behind it. A finding that is a defect links to the upstream issue it was reported as.",
    see: ["minimized-reproducer", "drift-report"],
    citation: writeUp("Defects it found"),
  },
  {
    id: "minimized-reproducer",
    term: "Minimized reproducer",
    also: ["minimization", "shrinking", "reproducer"],
    text: "The smallest input that still shows a defect, reduced automatically from the failing case. Each of Domain 1's was reported upstream and adopted by the specification as a conformance case.",
    see: ["generative-fuzzing", "conformance-corpus", "finding"],
    citation: writeUp("Defects it found"),
  },
  {
    id: "drift-report",
    term: "Drift report",
    also: ["drift"],
    text: "What changed since the previous run of the same profile: contract or assembler bumps, changed suites and metrics, new and resolved findings, and golden drift.",
    see: ["golden", "run"],
    citation: writeUp("Reproducing it"),
  },
  {
    id: "repeatability",
    term: "Repeatability",
    also: ["environment cell", "platform variant", "toolchain variant"],
    text: "Running the same snapshots again and comparing every answer with a baseline: repeated on the host, across environment cells (time zones, locales, threads, an empty environment, a concurrent burst), with the clock shifted, and across platform and toolchain variants down to each assembler's declared minimum.",
    see: ["determinism"],
    citation: writeUp("Platforms and toolchains"),
  },
  {
    id: "refusal-threshold",
    term: "Refusal threshold",
    also: ["threshold search"],
    text: "The exact charged token count below which an assembly must refuse. A binary search that is never told the answer looks for it and must land on it exactly.",
    see: ["refusal", "budget-sweep"],
    citation: writeUp("Budget pressure at scale (S7)"),
  },
  {
    id: "budget-sweep",
    term: "Budget sweep",
    also: ["shedding curve", "frame", "sweep"],
    text: "One snapshot assembled at a series of budgets, from its full size down past refusal, refined to single-token boundaries. Each budget is a frame, and the shedding curve shows what was shed at each; the implementations must agree frame for frame, and tier order must hold on the curve.",
    see: ["fitting", "refusal-threshold"],
    citation: writeUp("Budget pressure at scale (S7)"),
  },
  {
    id: "scaling-exponent",
    term: "Scaling exponent",
    text: "How assembly time grows with the size of the input, fitted on a log-log scale: an exponent of one is linear growth, two quadratic. Exponents and comparisons between implementations carry over to other machines in a way absolute timings do not.",
    see: ["budget-sweep"],
    citation: writeUp("Budget pressure at scale (S7)"),
  },
  {
    id: "fidelity-check",
    term: "Fidelity check",
    text: "A deterministic check that a summary says nothing its source does not: no number, date, id, URL or name the source lacks, no new imperative or role marker, and a length within the band. It confirms facts, not the relations between them.",
    see: ["variant", "repeat-stability"],
    citation: writeUp("Summarization before freeze (S11)"),
  },
  {
    id: "repeat-stability",
    term: "Repeat stability",
    also: ["decision flip"],
    text: "How often repeating a model call with the same input, at temperature zero and with a fixed seed, gives the same output. A decision flip is a change in which items a payload includes caused by freezing a different repeat.",
    see: ["fidelity-check", "variant"],
    citation: writeUp("Summarization before freeze (S11)"),
  },
  {
    id: "needle-in-a-haystack",
    term: "Needle in a haystack",
    also: ["NIAH", "variable tracking", "RULER", "LongBench"],
    text: "Long-context tests that hide facts in a large context and ask for them back. RULER's multi-hop tracing, or variable tracking, asks a model to follow a variable through chains of assignments scattered across the window. Domain 2 is designed around suites like these.",
    see: ["domain"],
    citation: viability("Domain 2: Long-Horizon Multi-Turn Stability and Context Drift"),
  },
  {
    id: "contamination-proof",
    term: "Contamination-proof",
    also: ["Context-Bench"],
    text: "Built so that no answer can come from memorized training data, for example questions generated from a database of fictional entities, as Context-Bench does. Domain 3 is designed around it.",
    see: ["domain"],
    citation: viability("Domain 3: Agentic Context Engineering Capability"),
  },
  {
    id: "prefix-caching",
    term: "Prefix caching",
    also: ["KV cache", "head mutation", "prompt caching"],
    text: "An inference engine reusing the work it did on a prompt prefix it has already seen, which only works when the prefix is byte for byte the same. Anything that changes near the head of a prompt, a timestamp or a reshuffled tool list, breaks the cache for every later turn. Domain 4 is designed around it.",
    see: ["ttft", "determinism"],
    citation: viability("Domain 4: Computational Economics and Prefix Caching"),
  },
  {
    id: "ttft",
    term: "Time to first token",
    also: ["TTFT"],
    text: "The time from sending a request to receiving the first token of the reply, which prefix caching shortens by skipping the prefill of a cached prefix.",
    see: ["prefix-caching"],
    citation: viability("Domain 4: Computational Economics and Prefix Caching"),
  },
  {
    id: "indirect-prompt-injection",
    term: "Indirect prompt injection",
    also: ["IPI", "BIPIA", "role confusion"],
    text: "Instructions hidden in content a model reads but no user wrote, such as a retrieved page or a tool's output, meant to be followed as if they came from the developer. Domain 5 is designed around it, with suites such as BIPIA.",
    see: ["injection-risk", "attack-success-rate", "authority"],
    citation: viability("Domain 5: Instruction Hierarchy, Security, and Indirect Prompt Injection"),
  },
  {
    id: "attack-success-rate",
    term: "Attack success rate",
    also: ["ASR", "benign utility", "BU"],
    text: "How often an attack achieves its goal, read beside benign utility: how well the system still does its ordinary work over the same untrusted data. A defense that lowers the first by wrecking the second has not succeeded.",
    see: ["indirect-prompt-injection"],
    citation: viability("Domain 5: Instruction Hierarchy, Security, and Indirect Prompt Injection"),
  },
]

/** Every entry, the architecture's first, each group in alphabetical order of its terms. */
export const GLOSSARY: readonly GlossaryEntry[] = [
  ...byTerm(ARCHITECTURE).map((entry) => ({ ...entry, group: "architecture" as const })),
  ...byTerm(BENCHMARK).map((entry) => ({ ...entry, group: "benchmark" as const })),
]

function byTerm<T extends { term: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.term.localeCompare(b.term, "en"))
}

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((entry) => entry.id === id)
}

/** The entries whose term, other names or text contain the query, ignoring case. */
export function filterGlossary(
  entries: readonly GlossaryEntry[],
  query: string,
): readonly GlossaryEntry[] {
  const needle = query.trim().toLocaleLowerCase("en")
  if (!needle) return entries
  return entries.filter((entry) =>
    [entry.term, ...(entry.also ?? []), entry.text].some((words) =>
      words.toLocaleLowerCase("en").includes(needle),
    ),
  )
}
