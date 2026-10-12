// How a Domain 2 arm plot draws the arm groups (the UI-D2 plan): the upper bounds as outlines,
// the conventional baselines muted, the CWA arms in the accent; and a rate's axis tick.

import type { ArmTone } from "@/components/charts/arm-plot"
import { ARM_GROUPS, type ArmGroup } from "@/content/d2/vocabulary"

const TONES: Record<ArmGroup, ArmTone> = {
  control: "outline",
  conventional: "muted",
  cwa: "accent",
}

export const GROUPS = ARM_GROUPS.map((group) => ({ ...group, tone: TONES[group.id] }))

export const percentTick = (value: number) => `${Math.round(value * 100)}%`
