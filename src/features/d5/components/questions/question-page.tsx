// A Domain 5 question page (the UI-D5 plan): the shared frame bound to Domain 5's evidence and its
// arm legend; each page brings its words and its panels.

import { ArmLegend } from "@/features/d2/components/arm-label"
import {
  QuestionPage as SharedQuestionPage,
  type QuestionPageProps as SharedProps,
} from "@/features/shared/evidence/question-page"

import { useEvidence, type Evidence } from "../use-evidence"

export type QuestionPageProps = Omit<SharedProps<Evidence>, "domain" | "useEvidence" | "legend">

export function QuestionPage(props: QuestionPageProps) {
  return (
    <SharedQuestionPage
      domain="d5"
      useEvidence={useEvidence as SharedProps<Evidence>["useEvidence"]}
      legend={<ArmLegend />}
      {...props}
    />
  )
}
