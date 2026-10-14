// Long context (UI-D2c): the viability document's LongBench v2 row, measured by Domain 2's own LQ
// family (S4). Each arm's correct answers over corpus size, for every question or one kind or
// format (S4's typed by_arm tallies); whether the needed chunks were sent (S1); each arm paired
// with retrieval; abstentions and prompt size; near-miss answers.

import { TierLines } from "@/components/charts/tier-lines"
import { TableRegion } from "@/components/dashboard/table-region"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LONG_CONTEXT } from "@/content/d2/questions"
import { share, type LqArm } from "@/features/d2/model/blocks"
import { armTierTable, tierLabel } from "@/features/d2/model/metrics"
import { REFERENCE_ARMS } from "@/features/d2/model/overview"
import { lqSeries, type QuestionFilter } from "@/features/d2/model/questions"
import { d2LongContextParams } from "@/features/d2/model/url"
import { formatCount, formatPercent, formatRate } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { ArmLabel } from "../arm-label"
import { ArmTierTable } from "../arm-tier-table"
import { LqExtrasTable } from "../block-panels"
import { BlocksPanel, SourceNote, SuitePanel } from "../evidence/evidence-states"
import type { Evidence } from "../evidence/use-evidence"
import { ShareCell } from "../grouped-arm-table"
import { LongContextPairedPanel } from "../overview/evidence-panels"
import { OptionPicker, QuestionPage } from "./question-page"

/** The questions a curve can count, as the address names them. */
const QUESTION_OPTIONS: readonly { id: string; label: string; filter: QuestionFilter }[] = [
  { id: "all", label: "Every question", filter: { by: "all" } },
  { id: "single", label: "One site's fact", filter: { by: "kind", key: "single" } },
  { id: "multi", label: "A comparison of two sites", filter: { by: "kind", key: "multi" } },
  { id: "none", label: "Not in the documents", filter: { by: "kind", key: "none" } },
  { id: "short", label: "Short answer", filter: { by: "format", key: "short" } },
  { id: "mcq", label: "Multiple choice", filter: { by: "format", key: "mcq" } },
]

const corpusTick = (tier: string) => tier.replace(/^x/, "×")

export function LongContextPage() {
  const [params, setParams] = useUrlState(d2LongContextParams)
  return (
    <QuestionPage
      words={LONG_CONTEXT}
      pin={params.run}
      onPin={(run) => setParams({ run })}
      blockSuites={["S4"]}
      drillDown={[
        ["S4", "arms", "S4's metrics by arm and corpus size"],
        ["S4", "breakdowns", "S4 by question kind and format"],
        ["S4", "rows", "S4's grades"],
        ["S1", "arms", "S1's facts in the payload"],
      ]}
    >
      {(evidence) => (
        <LongContextEvidence
          evidence={evidence}
          questions={params.questions}
          onQuestions={(questions) => setParams({ questions })}
        />
      )}
    </QuestionPage>
  )
}

function LongContextEvidence({
  evidence,
  questions,
  onQuestions,
}: {
  evidence: Evidence
  questions: string | undefined
  onQuestions: (questions: string) => void
}) {
  return (
    <>
      <section aria-labelledby="size-heading" className="space-y-3">
        <h3 id="size-heading" className="text-sm font-medium">
          Over corpus size (S4)
        </h3>
        <SuitePanel evidence={evidence} suite="S4">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S4">
              {(blocks) => (
                <div className="space-y-2">
                  <SizePanel entries={blocks.lq} questions={questions} onQuestions={onQuestions} />
                  <SourceNote source={entry.source} />
                </div>
              )}
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>

      <section aria-labelledby="sent-heading" className="space-y-3">
        <h3 id="sent-heading" className="text-sm font-medium">
          Were the needed chunks sent? (S1)
        </h3>
        <SuitePanel evidence={evidence} suite="S1">
          {(entry) => {
            const table = armTierTable(entry.metrics, "s1.fact_in_payload", {
              tierKinds: ["corpus"],
            })
            return table ? (
              <div className="space-y-2">
                <p className="max-w-prose text-xs text-muted-foreground">
                  The share of each arm's questions whose needed chunks were in the payload at each
                  corpus size: a wrong answer with the chunks sent is the model's, one without them
                  is the payload's.
                </p>
                <ArmTierTable
                  table={table}
                  label="Needed chunks in the payload by arm and corpus size"
                />
                <SourceNote source={entry.source} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-state="empty">
                S1 recorded no long-context payload in this run.
              </p>
            )
          }}
        </SuitePanel>
      </section>

      <section aria-labelledby="paired-heading" className="space-y-3">
        <h3 id="paired-heading" className="text-sm font-medium">
          Paired with retrieval (S4)
        </h3>
        <SuitePanel evidence={evidence} suite="S4">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S4">
              {(blocks) => <LongContextPairedPanel entries={blocks.lq} source={entry.source} />}
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>

      <section aria-labelledby="abstained-heading" className="space-y-3">
        <h3 id="abstained-heading" className="text-sm font-medium">
          Abstentions and prompt size (S4)
        </h3>
        <SuitePanel evidence={evidence} suite="S4">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S4">
              {(blocks) => (
                <div className="space-y-2">
                  <LqExtrasTable entries={blocks.lq} />
                  <SourceNote source={entry.source} />
                </div>
              )}
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>

      <section aria-labelledby="distractor-heading" className="space-y-3">
        <h3 id="distractor-heading" className="text-sm font-medium">
          Near-miss answers (S4)
        </h3>
        <SuitePanel evidence={evidence} suite="S4">
          {(entry) => {
            const table = armTierTable(entry.metrics, "s4.distractor_rate", {
              tierKinds: ["corpus"],
            })
            return table ? (
              <div className="space-y-2">
                {table.description ? (
                  <p className="max-w-prose text-xs text-muted-foreground">{table.description}</p>
                ) : null}
                <ArmTierTable table={table} label="Near-miss answers by arm and corpus size" />
                <SourceNote source={entry.source} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-state="empty">
                S4 measured no near-miss rate in this run.
              </p>
            )
          }}
        </SuitePanel>
      </section>
    </>
  )
}

function SizePanel({
  entries,
  questions,
  onQuestions,
}: {
  entries: readonly LqArm[]
  questions: string | undefined
  onQuestions: (questions: string) => void
}) {
  const option =
    QUESTION_OPTIONS.find((candidate) => candidate.id === questions) ?? QUESTION_OPTIONS[0]
  if (!option) return null
  const { series, tiers, tallies } = lqSeries(entries, option.filter)
  const title = `Correct answers by corpus size: ${option.label.toLowerCase()}`
  return (
    <div className="space-y-4">
      <OptionPicker
        prefix="Questions"
        label="Questions the curves count"
        value={option.id}
        onChange={onQuestions}
        options={QUESTION_OPTIONS}
      />
      {series.length === 0 ? (
        <p className="border border-dashed p-4 text-sm text-muted-foreground" data-state="empty">
          S4's summary has no tally for these questions in this run.
        </p>
      ) : (
        <TierLines
          title={title}
          summary={`Each arm's share of correct answers (${option.label.toLowerCase()}) over questions about corpora from a fraction of the budget to many times it, the corpus's size as a multiple of the budget on a log scale. The faint dashed line in each panel is ${REFERENCE_ARMS.documents}, the reference over documents.`}
          series={series}
          reference={REFERENCE_ARMS.documents}
          panelLabel={(id) => <ArmLabel arm={id} />}
          formatTier={corpusTick}
          table={
            <TableRegion label={title}>
              <Table>
                <TableCaption className="sr-only">{title}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Arm</TableHead>
                    {tiers.map((tier) => (
                      <TableHead key={tier} scope="col" className="text-right">
                        {tierLabel(tier)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.map((s) => (
                    <TableRow key={s.id} data-arm={s.id}>
                      <TableCell>
                        <ArmLabel arm={s.id} showPayload />
                      </TableCell>
                      {tiers.map((tier) => {
                        const tally = tallies.get(s.id)?.get(tier)
                        const percent = tally ? share(tally.n, tally.k) : null
                        return (
                          <TableCell
                            key={tier}
                            className="tabular text-right"
                            aria-label={`${s.id}, ${tierLabel(tier)}: ${tally ? formatRate(percent, tally.k, tally.n) : "not measured"}`}
                          >
                            {tally ? (
                              <ShareCell
                                percent={percent === null ? null : formatPercent(percent)}
                                fraction={`${formatCount(tally.k)} / ${formatCount(tally.n)}`}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableRegion>
          }
        />
      )}
    </div>
  )
}
