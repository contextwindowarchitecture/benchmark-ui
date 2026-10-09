// Which panel each suite gets (ui-plan.md 8.4). A suite without one shows the common parts alone.

import type { ComponentType } from "react"

import { S0SelfCheck } from "./s0-self-check"
import { S1Conformance } from "./s1-conformance"
import { S2Environment } from "./s2-environment"
import { S4Relations } from "./s4-relations"
import { S5Fuzzing } from "./s5-fuzzing"
import { LabeledCorpora } from "./s6-labeled"
import { S7Scale } from "./s7-scale"
import { S10Purity } from "./s10-purity"
import { S11Summarizer } from "./s11-summarizer"
import { S12Goldens } from "./s12-goldens"
import type { SuitePanelProps } from "./types"

export const SUITE_PANELS: Record<string, ComponentType<SuitePanelProps>> = {
  S0: S0SelfCheck,
  S1: S1Conformance,
  S2: S2Environment,
  S4: S4Relations,
  S5: S5Fuzzing,
  S6: LabeledCorpora,
  S7: S7Scale,
  S8: LabeledCorpora,
  S9: LabeledCorpora,
  S10: S10Purity,
  S11: S11Summarizer,
  S12: S12Goldens,
}
