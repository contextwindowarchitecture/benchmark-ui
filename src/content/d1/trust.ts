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
    id: "one-architecture",
    title: "One architecture",
    text: "Every reported answer comes from x86_64 Linux. S2's platform variant is native on the benchmark host and uses the same image as its container baseline, so no reported run checks arm64.",
  },
  {
    id: "go-clock",
    title: "Go's clock is not shifted",
    text: "libfaketime does not reach Go's runtime, so S2's clock-shift cells say nothing about Go's clock reads, and S10 does not judge clock reads at all.",
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

/**
 * Said on the performance page when every adapter and cell records the same peak memory: on Linux,
 * runs made before the harness measured each assembler's own peak recorded the harness's, as the
 * write-up says of the run it replaced.
 */
export const PEAK_MEMORY_NOTE = {
  title: "Peak memory is not the adapters' own",
  text: "Every adapter and every cell of this run records the same peak resident memory, which is not the assembler's own: on Linux, runs made before the harness measured each assembler's own peak recorded the harness's. The column shows the figure as recorded; do not compare adapters by it.",
  citation: {
    file: DOMAIN_1_WRITE_UP,
    section: "Budget pressure at scale (S7)",
  } satisfies Citation,
} as const
