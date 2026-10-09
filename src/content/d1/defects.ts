// The defects Domain 1 found (ui-plan.md 8.1, item 4): the write-up's table as words, each with
// the upstream issue and, where the failing run of 2026-10-08 recorded the defect as findings,
// the run and finding ids, so a reader can walk from the sentence to the reproducer. The ids are
// identifiers copied from that run's findings.jsonl (their `upstream.url` names the same issue),
// not measurements.

import { DOMAIN_1_WRITE_UP, type Citation } from "../source"

export type DefectPointer = { run: string; finding: string }

export type Defect = {
  id: string
  where: string
  defect: string
  foundBy: string
  issue: { url: string; label: string }
  findings: readonly DefectPointer[]
}

const FAILING_RUN = "20261008T004213Z-e824f1b"

const inFailingRun = (...ids: string[]): DefectPointer[] =>
  ids.map((finding) => ({ run: FAILING_RUN, finding }))

export const DEFECTS: readonly Defect[] = [
  {
    id: "go-defaults-filled",
    where: "Go assembler",
    defect:
      "defaults_filled[] omitted every candidate whose id another candidate or a producer exclusion shared.",
    foundBy: "The auditor (A15) and disagreement, in fuzzing and MR1.",
    issue: {
      url: "https://github.com/contextwindowarchitecture/assembler-go/issues/1",
      label: "assembler-go#1",
    },
    findings: inFailingRun("8e03174ca742", "218467db3130", "a9312ae4a34d", "86ff94021ab4"),
  },
  {
    id: "python-integer-rule",
    where: "Python assembler",
    defect:
      "A crash on an integer rule written with a zero fraction (max_per_source: 1.0), which the schema accepts.",
    foundBy: "Fuzzing, and MR4's integer spellings.",
    issue: {
      url: "https://github.com/contextwindowarchitecture/assembler-python/issues/1",
      label: "assembler-python#1",
    },
    findings: inFailingRun("d2cb80f84912", "d9865e0d5263", "d497a7ef323c"),
  },
  {
    id: "rust-json-rounding",
    where: "Rust assembler",
    defect:
      "A JSON parser that is not correctly rounded: some numbers read as a neighbouring double, giving wrong digests, wrong rejections and changed decisions.",
    foundBy: "Fuzzing with respelled numbers, and MR4.",
    issue: {
      url: "https://github.com/contextwindowarchitecture/assembler-rust/issues/1",
      label: "assembler-rust#1",
    },
    findings: inFailingRun("54e6d1b27229", "6eb17fb2359b", "9690657086a1", "6129a3fc1005"),
  },
  {
    id: "demo-adapter-exit",
    where: "Python demo adapter",
    defect:
      "An unsupported-component exit (3) where a schema rejection (2) was due, because it looked up components before validating.",
    foundBy: "Mutation fuzzing: a schema-invalid snapshot that also named a blank tokenizer.",
    issue: {
      url: "https://github.com/contextwindowarchitecture/assembler-demo/issues/1",
      label: "assembler-demo#1",
    },
    findings: [],
  },
  {
    id: "spec-digest-generator",
    where: "Specification tooling",
    defect:
      "The digest generator printed whole doubles above 2^53 as exact integers instead of ECMAScript's shortest digits.",
    foundBy: "The independent primitives of the oracle self-check.",
    issue: {
      url: "https://github.com/contextwindowarchitecture/contextwindowarchitecture/issues/3",
      label: "contextwindowarchitecture#3",
    },
    findings: [],
  },
]

export const DEFECTS_NOTE =
  "Each defect was minimized automatically to a one- or two-item reproducer, reported, fixed upstream, and adopted by the specification as a conformance case."

export const DEFECTS_CITATION: Citation = { file: DOMAIN_1_WRITE_UP, section: "Defects it found" }
