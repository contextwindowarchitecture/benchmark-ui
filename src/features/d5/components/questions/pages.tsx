// Domain 5's question pages (the UI-D5 plan): one per question the domain answers, each the
// viability document's metric, the evidence from the runs the composite reads, the write-up's
// words and the drill-down. Panels draw from the typed metrics only; S2's by_arm block, which
// holds the verdicts by attack family, carrier and position, is an open object (ask 20).

import type { ReactNode } from "react"

import { ChecksGrid } from "@/features/d2/components/overview/trust-section"
import { TierPicker } from "@/features/shared/evidence/question-page"
import {
  ADAPTIVE,
  ATTACKS,
  EXTERNAL,
  PASTED,
  PERSISTENCE,
  STRUCTURE,
  UTILITY,
} from "@/content/d5/questions"
import { armMetricTable, pairedMetrics } from "@/features/d5/model/metrics"
import { adaptiveRows, structureChecks } from "@/features/d5/model/overview"
import { d5QuestionParams } from "@/features/d5/model/url"
import { SourceNote, SuitePanel } from "@/features/shared/evidence/evidence-states"
import { useArmVocabulary } from "@/features/shared/vocabulary"
import { useUrlState } from "@/lib/url-state"

import { ArmMetricTable, PairedMetricsTable } from "../metric-tables"
import { AdaptivePanel, ForgedPanel, RatePanel, TierSeriesPanel, TierTables } from "../panels"
import type { Evidence, SuiteEvidence } from "../use-evidence"
import { QuestionPage } from "./question-page"

function Section({
  id,
  title,
  evidence,
  suite,
  children,
}: {
  id: string
  title: string
  evidence: Evidence
  suite: string
  children: (entry: SuiteEvidence) => ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h3 id={`${id}-heading`} className="text-sm font-medium">
        {title}
      </h3>
      <SuitePanel evidence={evidence} suite={suite}>
        {children}
      </SuitePanel>
    </section>
  )
}

/** Per-arm metrics with no tier, as a table, with its source. */
function ByArm({
  entry,
  suite,
  ids,
  label,
}: {
  entry: SuiteEvidence
  suite: string
  ids: readonly string[]
  label: string
}) {
  const table = armMetricTable(entry.metrics, suite, ids)
  return table ? (
    <div className="space-y-2">
      <ArmMetricTable table={table} label={label} />
      <SourceNote source={entry.source} />
    </div>
  ) : (
    <p className="text-sm text-muted-foreground" data-state="empty">
      The run measured none of these per arm.
    </p>
  )
}

function Paired({ entry, suite, label }: { entry: SuiteEvidence; suite: string; label: string }) {
  const entries = pairedMetrics(entry.metrics, suite)
  return entries.length > 0 ? (
    <div className="space-y-2">
      <PairedMetricsTable entries={entries} label={label} />
      <SourceNote source={entry.source} />
    </div>
  ) : (
    <p className="text-sm text-muted-foreground" data-state="empty">
      The run paired no arms here.
    </p>
  )
}

function useQuestionParams() {
  const [params, setParams] = useUrlState(d5QuestionParams)
  return { params, setParams, onPin: (run: string | undefined) => setParams({ run }) }
}

export function StructurePage() {
  const { params, onPin } = useQuestionParams()
  return (
    <QuestionPage
      words={STRUCTURE}
      pin={params.run}
      onPin={onPin}
      blockSuites={[]}
      drillDown={[
        ["S1", "metrics", "S1's gates and counts"],
        ["S1", "arms", "S1's forged structure by arm and carrier"],
        ["S1", "rows", "S1's claim, gate and token rows"],
      ]}
    >
      {(evidence) => (
        <>
          <Section
            id="checks"
            title="Checked on every CWA payload (S1)"
            evidence={evidence}
            suite="S1"
          >
            {(entry) => (
              <ChecksGrid
                checks={structureChecks([{ runId: entry.source.runId, metrics: entry.metrics }])}
              />
            )}
          </Section>
          <Section
            id="forged"
            title="What the conventional payloads let through (S1)"
            evidence={evidence}
            suite="S1"
          >
            {(entry) => <ForgedPanel entry={entry} />}
          </Section>
          <Section id="carriers" title="By carrier (S1)" evidence={evidence} suite="S1">
            {(entry) => <TierTables entry={entry} ids={["s1.forged", "s1.raw_markers"]} />}
          </Section>
        </>
      )}
    </QuestionPage>
  )
}

export function AttacksPage() {
  const { params, onPin } = useQuestionParams()
  return (
    <QuestionPage
      words={ATTACKS}
      pin={params.run}
      onPin={onPin}
      blockSuites={[]}
      drillDown={[
        ["S2", "arms", "S2's metrics by arm and tier"],
        ["S2", "paired", "S2's controlled pairs"],
        ["S2", "rows", "S2's probes"],
      ]}
    >
      {(evidence) => (
        <>
          <Section id="asr" title="Attacks executed (S2)" evidence={evidence} suite="S2">
            {(entry) => (
              <RatePanel
                entry={entry}
                id="s2.asr"
                title="Attacks executed per arm"
                summary="Each arm's share of the main grid's attacks that the model carried out, over every attack present in the payload and observable in the reply, with its interval over task instances."
                legend="attacks executed (S2)"
                header="Attacks executed"
                mark="bar"
              />
            )}
          </Section>
          <Section
            id="outcomes"
            title="What else the replies did (S2)"
            evidence={evidence}
            suite="S2"
          >
            {(entry) => (
              <ByArm
                entry={entry}
                suite="S2"
                ids={[
                  "s2.asr",
                  "s2.partial",
                  "s2.reported",
                  "s2.utility_under_attack",
                  "s2.attack_in_payload",
                  "s2.prompt_tokens",
                ]}
                label="Attack outcomes by arm"
              />
            )}
          </Section>
          <Section id="pairs" title="The controlled pairs (S2)" evidence={evidence} suite="S2">
            {(entry) => (
              <Paired entry={entry} suite="S2" label="The controlled pairs, static attacks" />
            )}
          </Section>
          <Section id="length" title="As content grows (S2)" evidence={evidence} suite="S2">
            {(entry) => (
              <TierSeriesPanel
                entry={entry}
                id="s2.asr_by_length"
                reference="naive"
                title="Attacks executed by content length"
                summary="Each arm's share of attacks carried out in email and document content padded to longer lengths, the attack at the end, the length in tokens on a log scale."
              />
            )}
          </Section>
          <Section
            id="html"
            title="Attacks hidden in HTML, and sampling (S2)"
            evidence={evidence}
            suite="S2"
          >
            {(entry) => (
              <TierTables
                entry={entry}
                ids={["s2.asr_by_representation", "s2.dropped_by_producer", "s2.asr_sampled"]}
              />
            )}
          </Section>
        </>
      )}
    </QuestionPage>
  )
}

export function UtilityPage() {
  const { params, onPin } = useQuestionParams()
  return (
    <QuestionPage
      words={UTILITY}
      pin={params.run}
      onPin={onPin}
      blockSuites={[]}
      drillDown={[["S2", "arms", "S2's metrics by arm and tier"]]}
    >
      {(evidence) => (
        <>
          <Section id="clean" title="Clean tasks answered (S2)" evidence={evidence} suite="S2">
            {(entry) => (
              <RatePanel
                entry={entry}
                id="s2.bu"
                title="Clean tasks answered correctly per arm"
                summary="Each arm's share of clean tasks answered correctly, three samples each, with its interval over task instances."
                legend="clean, correct (S2)"
                header="Correct"
              />
            )}
          </Section>
          <Section
            id="imperative"
            title="Benign instructions in the content (S2)"
            evidence={evidence}
            suite="S2"
          >
            {(entry) => (
              <RatePanel
                entry={entry}
                id="s2.bu_imperative"
                title="Benign-imperative tasks answered correctly per arm"
                summary="Each arm's share of tasks answered correctly when the content holds benign instruction-like text the answer depends on: a defence that ignores every instruction in content loses these."
                legend="benign imperative, correct (S2)"
                header="Correct"
              />
            )}
          </Section>
          <Section
            id="refusal"
            title="Refusals and the task under attack (S2)"
            evidence={evidence}
            suite="S2"
          >
            {(entry) => (
              <ByArm
                entry={entry}
                suite="S2"
                ids={["s2.bu", "s2.bu_imperative", "s2.over_refusal", "s2.utility_under_attack"]}
                label="Utility by arm"
              />
            )}
          </Section>
          <Section id="utility-length" title="As content grows (S2)" evidence={evidence} suite="S2">
            {(entry) => (
              <TierSeriesPanel
                entry={entry}
                id="s2.bu_by_length"
                reference="naive"
                title="Clean tasks answered correctly by content length"
                summary="Each arm's share of clean tasks answered correctly in content padded to longer lengths, the length in tokens on a log scale."
              />
            )}
          </Section>
        </>
      )}
    </QuestionPage>
  )
}

export function AdaptivePage() {
  const { params, setParams, onPin } = useQuestionParams()
  const vocabulary = useArmVocabulary()
  return (
    <QuestionPage
      words={ADAPTIVE}
      pin={params.run}
      onPin={onPin}
      blockSuites={[]}
      drillDown={[
        ["S4", "arms", "S4's metrics by arm and budget"],
        ["S4", "budget", "S4's budget"],
        ["S4", "rows", "S4's search rows"],
      ]}
    >
      {(evidence) => (
        <>
          <Section
            id="adaptive"
            title="Adaptive against static (S4)"
            evidence={evidence}
            suite="S4"
          >
            {(entry) => {
              const { budget, budgets } = adaptiveRows(entry.metrics, params.at)
              return (
                <div className="space-y-4">
                  {budget ? (
                    <TierPicker
                      tiers={budgets}
                      value={budget}
                      onChange={(at) => setParams({ at })}
                      format={(tier) => vocabulary.tierLabel(tier, "s4.asr_by_budget")}
                      label="Budget the attack is read at"
                    />
                  ) : null}
                  <AdaptivePanel entry={entry} at={params.at} />
                </div>
              )
            }}
          </Section>
          <Section id="curve" title="As the budget is spent (S4)" evidence={evidence} suite="S4">
            {(entry) => (
              <TierSeriesPanel
                entry={entry}
                id="s4.asr_by_budget"
                reference="naive"
                title="Adaptive attack success by queries spent"
                summary="Each arm's held-out success of the best attack found so far, at each checkpoint of the budget, on a log scale: a line still rising at the end is an attack that was still improving."
              />
            )}
          </Section>
          <Section id="search" title="The search itself (S4)" evidence={evidence} suite="S4">
            {(entry) => (
              <ByArm
                entry={entry}
                suite="S4"
                ids={[
                  "s4.first_success",
                  "s4.train_rate",
                  "s4.attacker_invalid",
                  "s4.attacker_fallbacks",
                ]}
                label="The adaptive search by arm"
              />
            )}
          </Section>
        </>
      )}
    </QuestionPage>
  )
}

export function ExternalPage() {
  const { params, onPin } = useQuestionParams()
  return (
    <QuestionPage
      words={EXTERNAL}
      pin={params.run}
      onPin={onPin}
      blockSuites={[]}
      drillDown={[
        ["S3", "arms", "S3's metrics by arm and scenario"],
        ["S3", "paired", "S3's controlled pairs"],
        ["S3", "rows", "S3's probes"],
      ]}
    >
      {(evidence) => (
        <>
          <Section id="llmail" title="Attacks people wrote (S3)" evidence={evidence} suite="S3">
            {(entry) => (
              <RatePanel
                entry={entry}
                id="s3.llmail_asr"
                title="LLMail-Inject's emails that succeeded per arm"
                summary="Each arm's share of LLMail-Inject's attacker emails that made the model send the attacker's email, with its interval over the submitting teams."
                legend="LLMail-Inject attacks succeeded (S3)"
                header="Succeeded"
                mark="bar"
              />
            )}
          </Section>
          <Section
            id="scenarios"
            title="By scenario, and by the email's own outcome (S3)"
            evidence={evidence}
            suite="S3"
          >
            {(entry) => <TierTables entry={entry} ids={["s3.llmail_asr"]} />}
          </Section>
          <Section
            id="sep"
            title="Instruction and data separation (S3)"
            evidence={evidence}
            suite="S3"
          >
            {(entry) => (
              <ByArm
                entry={entry}
                suite="S3"
                ids={[
                  "s3.sep_separation",
                  "s3.sep_utility",
                  "s3.sep_data",
                  "s3.llmail_partial",
                  "s3.llmail_unparsable",
                ]}
                label="SEP and LLMail-Inject by arm"
              />
            )}
          </Section>
          <Section
            id="external-pairs"
            title="The controlled pairs (S3)"
            evidence={evidence}
            suite="S3"
          >
            {(entry) => (
              <Paired entry={entry} suite="S3" label="The controlled pairs, external sets" />
            )}
          </Section>
        </>
      )}
    </QuestionPage>
  )
}

export function PastedPage() {
  const { params, onPin } = useQuestionParams()
  return (
    <QuestionPage
      words={PASTED}
      pin={params.run}
      onPin={onPin}
      blockSuites={[]}
      drillDown={[
        ["S5", "arms", "S5's metrics by arm"],
        ["S5", "paired", "S5's controlled pairs"],
      ]}
    >
      {(evidence) => (
        <>
          <Section
            id="pasted-asr"
            title="Pasted attacks executed (S5)"
            evidence={evidence}
            suite="S5"
          >
            {(entry) => (
              <RatePanel
                entry={entry}
                id="s5.asr"
                title="Pasted attacks executed per arm"
                summary="Each arm's share of attacks in pasted material that the model carried out, with its interval over task instances."
                legend="pasted attacks executed (S5)"
                header="Attacks executed"
                mark="bar"
              />
            )}
          </Section>
          <Section
            id="pasted-outcomes"
            title="What else the replies did (S5)"
            evidence={evidence}
            suite="S5"
          >
            {(entry) => (
              <ByArm
                entry={entry}
                suite="S5"
                ids={[
                  "s5.asr",
                  "s5.partial",
                  "s5.reported",
                  "s5.utility_under_attack",
                  "s5.bu",
                  "s5.bu_imperative",
                  "s5.over_refusal",
                  "s5.forged",
                ]}
                label="Pasted material by arm"
              />
            )}
          </Section>
          <Section
            id="pasted-pairs"
            title="The controlled pairs (S5)"
            evidence={evidence}
            suite="S5"
          >
            {(entry) => (
              <Paired entry={entry} suite="S5" label="The controlled pairs, pasted material" />
            )}
          </Section>
        </>
      )}
    </QuestionPage>
  )
}

export function PersistencePage() {
  const { params, onPin } = useQuestionParams()
  return (
    <QuestionPage
      words={PERSISTENCE}
      pin={params.run}
      onPin={onPin}
      blockSuites={[]}
      drillDown={[
        ["S6", "arms", "S6's metrics by arm and tier"],
        ["S6", "paired", "S6's paired harm"],
        ["S6", "rows", "S6's chains and stores"],
      ]}
    >
      {(evidence) => (
        <>
          <Section
            id="persist"
            title="The code word in later replies (S6)"
            evidence={evidence}
            suite="S6"
          >
            {(entry) => (
              <TierSeriesPanel
                entry={entry}
                id="s6.persistence"
                reference="chat"
                title="The attack's code word in later replies, by distance from the poison"
                summary="Each way of carrying a conversation forward: the share of replies that still carried out the document's code word, in bands of turns after the poisoned one."
              />
            )}
          </Section>
          <Section
            id="planted"
            title="The planted figure answered (S6)"
            evidence={evidence}
            suite="S6"
          >
            {(entry) => (
              <RatePanel
                entry={entry}
                id="s6.poisoned_answer"
                title="Probes answered with the planted figure per arm"
                summary="Each arm's share of probes for the tracked figure answered with the value the poisoned document planted, with its interval over conversations."
                legend="planted figure answered (S6)"
                header="Planted figure"
                mark="bar"
              />
            )}
          </Section>
          <Section
            id="persist-arms"
            title="Each way of carrying the conversation (S6)"
            evidence={evidence}
            suite="S6"
          >
            {(entry) => (
              <ByArm
                entry={entry}
                suite="S6"
                ids={[
                  "s6.persistence",
                  "s6.poisoned_answer",
                  "s6.executed_at_poison",
                  "s6.trigger_rate",
                  "s6.early_trigger",
                  "s6.probe_canary",
                ]}
                label="Persistence by arm"
              />
            )}
          </Section>
          <Section
            id="stores"
            title="Where the poison went, and accuracy (S6)"
            evidence={evidence}
            suite="S6"
          >
            {(entry) => <TierTables entry={entry} ids={["s6.stored", "s6.shown", "s6.aptitude"]} />}
          </Section>
          <Section id="harm" title="Paired harm (S6)" evidence={evidence} suite="S6">
            {(entry) => <Paired entry={entry} suite="S6" label="Paired harm, persistence" />}
          </Section>
        </>
      )}
    </QuestionPage>
  )
}
