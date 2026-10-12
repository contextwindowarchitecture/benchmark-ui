// Variable tracking (UI-D2c): the viability document's RULER row, measured by Domain 2's own VT
// and CC families. Per arm at a budget and family, the answers that gave the figure's current
// value and those that gave a stale one (S2's typed by_family tallies); where every family's wrong
// answers went (the verdicts); the same at a temperature above zero (S3) and with the model's own
// replies as history (S6's stale rate).

import type { ReactNode } from "react"

import { TRACKING } from "@/content/d2/questions"
import { familyWords } from "@/content/d2/vocabulary"
import { share, type ScriptedArm } from "@/features/d2/model/blocks"
import { tierLabel, type D2Metric } from "@/features/d2/model/metrics"
import { REFERENCE_ARMS, valueRows } from "@/features/d2/model/overview"
import {
  budgetTiers,
  chosenTier,
  familiesOf,
  familyCorrect,
  familyStale,
  SCRIPTED_VERDICTS,
  shareRows,
  verdictRows,
  type ScriptedVerdict,
} from "@/features/d2/model/questions"
import { d2TrackingParams } from "@/features/d2/model/url"
import { formatCount, formatPercent, formatRate } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { BlocksPanel, SourceNote, SuitePanel } from "../evidence/evidence-states"
import type { Evidence } from "../evidence/use-evidence"
import { GroupedArmTable, ShareCell } from "../grouped-arm-table"
import { OptionPicker, QuestionPage, TierPicker } from "./question-page"
import { MetricPlot, SharePlot } from "./share-plot"

/** The families a figure's value is tracked in, in the order the page offers them. */
const FAMILY_ORDER = ["vt", "cc", "ip", "fr"] as const

const VERDICT_WORDS: Record<ScriptedVerdict, string> = {
  correct: "Current value",
  stale: "Stale value",
  distractor: "Near-miss figure",
  wrong: "Wrong",
  unparsed: "Unparsable",
  overflow: "Overflow, not sent",
}

const familyLabel = (id: string) => {
  const words = familyWords(id)
  return words ? `${words.code} · ${words.title}` : id
}

export function TrackingPage() {
  const [params, setParams] = useUrlState(d2TrackingParams)
  return (
    <QuestionPage
      words={TRACKING}
      pin={params.run}
      onPin={(run) => setParams({ run })}
      blockSuites={["S2", "S3"]}
      drillDown={[
        ["S2", "breakdowns", "S2 by family, length and rule"],
        ["S2", "arms", "S2's stale-answer rate by arm and budget"],
        ["S2", "rows", "S2's grades"],
        ["S3", "breakdowns", "S3 by family"],
      ]}
    >
      {(evidence) => (
        <TrackingEvidence
          evidence={evidence}
          at={params.at}
          family={params.family}
          onAt={(at) => setParams({ at })}
          onFamily={(family) => setParams({ family })}
        />
      )}
    </QuestionPage>
  )
}

function TrackingEvidence({
  evidence,
  at,
  family,
  onAt,
  onFamily,
}: {
  evidence: Evidence
  at: string | undefined
  family: string | undefined
  onAt: (at: string) => void
  onFamily: (family: string) => void
}) {
  const s2 = evidence.metricsOf("S2")
  return (
    <>
      <section aria-labelledby="values-heading" className="space-y-3">
        <h3 id="values-heading" className="text-sm font-medium">
          Current and stale values (S2)
        </h3>
        <SuitePanel evidence={evidence} suite="S2">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S2">
              {(blocks) => (
                <ValuesPanel
                  entries={blocks.scripted}
                  at={at}
                  family={family}
                  onAt={onAt}
                  onFamily={onFamily}
                  footer={<SourceNote source={entry.source} />}
                />
              )}
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>

      <section aria-labelledby="verdicts-heading" className="space-y-3">
        <h3 id="verdicts-heading" className="text-sm font-medium">
          Where the wrong answers went (S2)
        </h3>
        {s2 ? (
          <BlocksPanel evidence={evidence} suite="S2">
            {(blocks) => (
              <div className="space-y-2">
                <VerdictsTable entries={blocks.scripted} at={at} />
                <SourceNote source={s2.source} />
              </div>
            )}
          </BlocksPanel>
        ) : null}
      </section>

      <section aria-labelledby="sampled-heading" className="space-y-3">
        <h3 id="sampled-heading" className="text-sm font-medium">
          At a temperature above zero (S3)
        </h3>
        <SuitePanel evidence={evidence} suite="S3">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S3">
              {(blocks) => (
                <div className="space-y-2">
                  <FamilyTable entries={blocks.scripted} family={family} at={at} suite="S3" />
                  <SourceNote source={entry.source} />
                </div>
              )}
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>

      <section aria-labelledby="loop-heading" className="space-y-3">
        <h3 id="loop-heading" className="text-sm font-medium">
          With the model's own replies as history (S6)
        </h3>
        <SuitePanel evidence={evidence} suite="S6">
          {(entry) => {
            const tier = loopTier(entry.metrics)
            const rows = tier ? valueRows(entry.metrics, "s6.stale_rate", tier) : []
            const label = tier ? tierLabel(tier) : "its budget"
            return (
              <div className="space-y-2">
                <MetricPlot
                  rows={rows}
                  title={`Stale answers in the loop at ${label}`}
                  summary={`Each arm's share of answers that gave an earlier value of the figure asked, over every family, when the history holds the model's own replies at ${label}.`}
                  legend="stale answers (S6)"
                  header="Stale answers"
                  mark="bar"
                  domain="auto"
                  format={(value) => formatPercent(value)}
                  formatTick={(value) => `${Math.round(value * 100)}%`}
                />
                <SourceNote source={entry.source} />
              </div>
            )
          }}
        </SuitePanel>
      </section>
    </>
  )
}

/** S6's budget: the tightest it measured its stale rate at. */
function loopTier(metrics: readonly D2Metric[]): string | null {
  const measured = metrics.flatMap((metric) =>
    metric.id === "s6.stale_rate" && metric.tier !== null ? [{ tier: metric.tier }] : [],
  )
  return budgetTiers(measured)[0] ?? null
}

function ValuesPanel({
  entries,
  at,
  family,
  onAt,
  onFamily,
  footer,
}: {
  entries: readonly ScriptedArm[]
  at: string | undefined
  family: string | undefined
  onAt: (at: string) => void
  onFamily: (family: string) => void
  footer: ReactNode
}) {
  const tiers = budgetTiers(entries)
  const tier = chosenTier(tiers, at)
  const families = familiesOf(entries, FAMILY_ORDER)
  const chosen = family && families.includes(family) ? family : families[0]
  if (!tier || !chosen) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        S2's summary breaks no arm's answers down by family in this run.
      </p>
    )
  }
  const label = tierLabel(tier)
  const words = familyWords(chosen)
  const current = shareRows(entries, tier, familyCorrect(chosen))
  const stale = shareRows(entries, tier, familyStale(chosen))
  const reference = current.find((row) => row.id === REFERENCE_ARMS.conversations)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <TierPicker tiers={tiers} value={tier} onChange={onAt} />
        <OptionPicker
          prefix="Family"
          label="Family the answers are read from"
          value={chosen}
          onChange={onFamily}
          options={families.map((id) => ({ id, label: familyLabel(id) }))}
        />
      </div>
      {words ? (
        <p className="max-w-prose text-xs text-muted-foreground">
          {words.code}: {words.does}; a probe asks {words.asks}.
        </p>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-2">
        <SharePlot
          rows={current}
          title={`${words?.code ?? chosen}: the current value, at ${label}`}
          summary={`Each arm's share of the ${words?.code ?? chosen} family's answers that gave the figure's current value, over every probe and sample at ${label}; the upper bounds have no budget.${reference ? ` The dashed rule is ${REFERENCE_ARMS.conversations}, the fair reference.` : ""}`}
          legend={`current value (${words?.code ?? chosen}, S2)`}
          header="Current value"
          reference={
            reference && reference.value !== null
              ? { value: reference.value, label: REFERENCE_ARMS.conversations }
              : null
          }
        />
        <SharePlot
          rows={stale}
          title={`${words?.code ?? chosen}: a stale value, at ${label}`}
          summary={`Each arm's share of the ${words?.code ?? chosen} family's answers that gave an earlier value of the figure asked, at ${label}. Lower is better; the scale fits the largest share.`}
          legend={`stale value (${words?.code ?? chosen}, S2)`}
          header="Stale value"
          mark="bar"
        />
      </div>
      {footer}
    </div>
  )
}

/** Every family's grades by verdict, per arm at the budget: what a wrong answer was. */
function VerdictsTable({
  entries,
  at,
}: {
  entries: readonly ScriptedArm[]
  at: string | undefined
}) {
  const tier = chosenTier(budgetTiers(entries), at)
  if (!tier) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        S2's summary has no arm at a budget in this run.
      </p>
    )
  }
  const rows = verdictRows(entries, tier)
  const byArm = new Map(rows.map((row) => [row.arm, row]))
  const label = tierLabel(tier)
  return (
    <div className="space-y-2">
      <GroupedArmTable
        label={`Grades by verdict at ${label}`}
        caption={`Each arm's grades over every family at ${label}, by verdict: the current value, an earlier value of the figure asked, a near-miss figure with a similar name, another wrong answer, a reply the grader could not parse, and a payload that overflowed and reached no model. The upper bounds at no budget.`}
        arms={rows.map((row) => ({ id: row.arm, group: row.group }))}
        columns={SCRIPTED_VERDICTS.map((verdict) => ({
          key: verdict,
          label: VERDICT_WORDS[verdict],
        }))}
        cell={(arm, verdict) => {
          const row = byArm.get(arm)
          if (!row) return null
          const k = row.verdicts[verdict as ScriptedVerdict]
          const percent = share(row.n, k)
          return {
            node: (
              <ShareCell
                percent={percent === null ? null : formatPercent(percent)}
                fraction={`${formatCount(k)} / ${formatCount(row.n)}`}
              />
            ),
            text: formatRate(percent, k, row.n),
          }
        }}
      />
      <p className="text-xs text-muted-foreground">
        Over every family's probes and samples: the verdicts are tallied per arm, not per family.
      </p>
    </div>
  )
}

/** One family's current and stale shares per arm, as a table. */
function FamilyTable({
  entries,
  family,
  at,
  suite,
}: {
  entries: readonly ScriptedArm[]
  family: string | undefined
  at: string | undefined
  suite: string
}) {
  const tiers = budgetTiers(entries)
  const tier = chosenTier(tiers, at)
  const families = familiesOf(entries, FAMILY_ORDER)
  const chosen = family && families.includes(family) ? family : families[0]
  if (!tier || !chosen) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        {suite}'s summary breaks no arm's answers down by family in this run.
      </p>
    )
  }
  const current = new Map(shareRows(entries, tier, familyCorrect(chosen)).map((r) => [r.id, r]))
  const stale = new Map(shareRows(entries, tier, familyStale(chosen)).map((r) => [r.id, r]))
  const arms = [...current.values()].map((row) => ({ id: row.id, group: row.group }))
  const label = tierLabel(tier)
  return (
    <div className="space-y-2">
      <GroupedArmTable
        label={`${suite}: ${familyLabel(chosen)} at ${label}`}
        caption={`Each arm's share of the ${familyLabel(chosen)} family's answers that gave the current value and that gave a stale one, over every probe and sample at ${label}.`}
        arms={arms}
        columns={[
          { key: "current", label: "Current value" },
          { key: "stale", label: "Stale value" },
        ]}
        cell={(arm, column) => {
          const row = (column === "current" ? current : stale).get(arm)
          if (!row) return null
          return {
            node: (
              <ShareCell
                percent={row.value === null ? null : formatPercent(row.value)}
                fraction={`${formatCount(row.tally.k)} / ${formatCount(row.tally.n)}`}
              />
            ),
            text: formatRate(row.value, row.tally.k, row.tally.n),
          }
        }}
      />
    </div>
  )
}
