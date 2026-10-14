// A Domain 2 question page (UI-D2c): the shared frame bound to Domain 2's evidence, with its arm
// legend, and the pickers its pages share.

import type { ComponentProps } from "react"

import {
  OptionPicker,
  QuestionPage as SharedQuestionPage,
  TierPicker as SharedTierPicker,
  type QuestionPageProps as SharedProps,
} from "@/features/shared/evidence/question-page"
import { tierLabel } from "@/features/d2/model/metrics"

import { ArmLegend } from "../arm-label"
import { useEvidence, type Evidence } from "../evidence/use-evidence"

export { OptionPicker }

export type QuestionPageProps = Omit<SharedProps<Evidence>, "domain" | "useEvidence" | "legend">

export function QuestionPage(props: QuestionPageProps) {
  return (
    <SharedQuestionPage
      domain="d2"
      useEvidence={useEvidence as SharedProps<Evidence>["useEvidence"]}
      legend={<ArmLegend />}
      {...props}
    />
  )
}

/** A picker over the budgets a panel is read at, named as Domain 2 names its tiers. */
export function TierPicker(props: Omit<ComponentProps<typeof SharedTierPicker>, "format">) {
  return <SharedTierPicker format={tierLabel} {...props} />
}
