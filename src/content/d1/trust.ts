// How far to trust Domain 1's evidence (ui-plan.md 8.1, item 3): the write-up's own limits, as
// words. The numbers the write-up quotes beside them come from the records on the page.

import { DOMAIN_1_WRITE_UP, type Citation } from "../source"

export type TrustNote = { id: string; title: string; text: string; details?: readonly string[] }

export const TRUST: readonly TrustNote[] = [
  {
    id: "oracles-first",
    title: "The oracles are tested before they are trusted",
    text: "On every run the harness's own primitives must reproduce the published digests, hashes, token counts and payloads, and the auditor's kill rate over deliberately broken traces is measured, before any suite's verdict counts. Each labeled generator was checked against the reference assembler before use.",
  },
  {
    id: "planted-defects",
    title: "Planted defects are caught",
    text: "Opt-in tests plant defects in the reference assembler, and each is caught by the check meant for it:",
    details: [
      "a digest that depends on batch order",
      "a crash on fractions",
      "one extra budget token",
      "a truncated protected body",
      "a slow path",
      "a renamed variant method",
      "text rewritten in a variant",
      "an answer that varies between runs",
    ],
  },
  {
    id: "shared-mistakes",
    title: "A mistake shared by all four passes the differential oracle",
    text: "Only the labeled generators and the auditor can catch a decision every implementation gets wrong the same way, which is why their own tests come first.",
  },
  {
    id: "emulated",
    title: "x86_64 is emulated",
    text: "The x86_64 cells test the binaries under emulation, not on native hardware, and the Rust adapter there is cross-compiled because rustc does not run under the emulator. A run on a native x86_64 host is the stronger evidence.",
  },
  {
    id: "fidelity",
    title: "Fidelity checks confirm facts, not relations",
    text: "The summarizer's fidelity checks confirm that each fact in a summary appears in its source; they do not check that the relations between facts survive.",
  },
  {
    id: "draft",
    title: "The specification is a draft",
    text: "Every result is tied to the pinned contract commit shown above, and goldens are re-baselined deliberately, never automatically.",
  },
]

export const TRUST_CITATION: Citation = { file: DOMAIN_1_WRITE_UP, section: "How far to trust it" }
