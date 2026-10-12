// Cost (UI-D2c): what Domain 2's own calls cost, beside the viability document's Domain 4, which
// Domain 2 measures only in part. Per arm at a budget, prompt tokens per correct answer and the
// p50 latency (S5's typed metrics, every family together); then S5's cost block as its suite page
// shows it: the margin, the under-count by prompt size, tokens and latency by suite, arm and tier,
// and answer length by conversation length.

import { COST } from "@/content/d2/questions"
import { tierLabel, type D2Metric } from "@/features/d2/model/metrics"
import { valueRows } from "@/features/d2/model/overview"
import { budgetTiers, chosenTier } from "@/features/d2/model/questions"
import { d2CostParams } from "@/features/d2/model/url"
import { formatCount, formatMs } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { CostPanel } from "../block-panels"
import { BlocksPanel, SourceNote, SuitePanel } from "../evidence/evidence-states"
import type { Evidence } from "../evidence/use-evidence"
import { QuestionPage, TierPicker } from "./question-page"
import { MetricPlot } from "./share-plot"

export function CostPage() {
  const [params, setParams] = useUrlState(d2CostParams)
  return (
    <QuestionPage
      words={COST}
      pin={params.run}
      onPin={(run) => setParams({ run })}
      blockSuites={["S5"]}
      drillDown={[
        ["S5", "cost", "S5's cost block"],
        ["S5", "arms", "S5's metrics by arm, family and budget"],
      ]}
    >
      {(evidence) => (
        <CostEvidence evidence={evidence} at={params.at} onAt={(at) => setParams({ at })} />
      )}
    </QuestionPage>
  )
}

/** The rows of a metric over every family (family null) at a tier. */
const everyFamily = (metrics: readonly D2Metric[], id: string, tier: string) =>
  valueRows(metrics, id, tier).filter((row) => row.metric.family === null)

function CostEvidence({
  evidence,
  at,
  onAt,
}: {
  evidence: Evidence
  at: string | undefined
  onAt: (at: string) => void
}) {
  return (
    <>
      <section aria-labelledby="per-answer-heading" className="space-y-3">
        <h3 id="per-answer-heading" className="text-sm font-medium">
          Per correct answer, and per call (S5)
        </h3>
        <SuitePanel evidence={evidence} suite="S5">
          {(entry) => {
            const tiers = budgetTiers(
              entry.metrics.flatMap((metric) =>
                metric.id === "s5.prompt_tokens_per_correct" &&
                metric.family === null &&
                metric.tier !== null
                  ? [{ tier: metric.tier }]
                  : [],
              ),
            )
            const tier = chosenTier(tiers, at)
            if (!tier) {
              return (
                <p className="text-sm text-muted-foreground" data-state="empty">
                  S5 measured no arm at a budget in this run.
                </p>
              )
            }
            const label = tierLabel(tier)
            return (
              <div className="space-y-4">
                <TierPicker tiers={tiers} value={tier} onChange={onAt} />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-2">
                  <MetricPlot
                    rows={everyFamily(entry.metrics, "s5.prompt_tokens_per_correct", tier)}
                    title={`Prompt tokens per correct answer at ${label}`}
                    summary={`What each correct answer cost in prompt tokens at ${label}, from the calls S2 made: every prompt token the arm sent, divided by its correct answers. Lower is cheaper; the upper bounds have no budget.`}
                    legend="prompt tokens per correct answer (S5)"
                    header="Tokens per correct answer"
                    mark="bar"
                    domain="auto"
                    format={(value) => `${formatCount(value)} tokens`}
                    formatTick={(value) => formatCount(value)}
                  />
                  <MetricPlot
                    rows={everyFamily(entry.metrics, "s5.latency_p50", tier)}
                    title={`Median latency per call at ${label}`}
                    summary={`The median time each arm's calls took at ${label}, as recorded when the model cache was filled with many requests in flight: the load it was recorded under, not a single request.`}
                    legend="p50 latency (S5)"
                    header="Median latency"
                    mark="bar"
                    domain="auto"
                    format={formatMs}
                  />
                </div>
                <SourceNote source={entry.source} />
              </div>
            )
          }}
        </SuitePanel>
      </section>

      <section aria-labelledby="estimate-heading" className="space-y-3">
        <h3 id="estimate-heading" className="text-sm font-medium">
          The token estimate, and every call's cost (S5)
        </h3>
        <SuitePanel evidence={evidence} suite="S5">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S5">
              {(_blocks, summary) =>
                summary.cost ? (
                  <div className="space-y-2">
                    <CostPanel block={summary.cost} />
                    <SourceNote source={entry.source} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-state="empty">
                    S5's summary holds no cost block in this run.
                  </p>
                )
              }
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>
    </>
  )
}
