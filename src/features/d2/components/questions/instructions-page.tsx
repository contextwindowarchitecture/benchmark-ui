// Instruction persistence (UI-D2c): the viability document's hypothesis that CWA keeps the core
// rules from being pushed out of the window, measured by Domain 2's IP family. Per arm at a
// budget, the answers that followed the rule (s2.instruction_persistence); each rule apart (S2's
// typed persistence.by_rule); by the conversation's turn count (persistence.by_turns); and each
// rule at a temperature above zero (S3).

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
import { INSTRUCTIONS } from "@/content/d2/questions"
import { share, type ScriptedArm } from "@/features/d2/model/blocks"
import { tierLabel } from "@/features/d2/model/metrics"
import { REFERENCE_ARMS, valueRows } from "@/features/d2/model/overview"
import {
  budgetTiers,
  chosenTier,
  persistenceSeries,
  ruleCompliant,
  rulesOf,
  shareRows,
} from "@/features/d2/model/questions"
import { d2InstructionsParams } from "@/features/d2/model/url"
import { formatCount, formatPercent, formatRate } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { ArmLabel } from "../arm-label"
import { percentTick } from "../evidence/arm-groups"
import { BlocksPanel, SourceNote, SuitePanel } from "../evidence/evidence-states"
import type { Evidence } from "../evidence/use-evidence"
import { GroupedArmTable, ShareCell } from "../grouped-arm-table"
import { QuestionPage, TierPicker } from "./question-page"
import { MetricPlot, SharePlot } from "./share-plot"

const RULE_ORDER = ["brackets", "signoff", "uppercase"] as const

const RULE_WORDS: Record<string, string> = {
  brackets: "Brackets around figures",
  signoff: "A sign-off",
  uppercase: "Capital letters",
}

const ruleLabel = (rule: string) => RULE_WORDS[rule] ?? rule

export function InstructionsPage() {
  const [params, setParams] = useUrlState(d2InstructionsParams)
  return (
    <QuestionPage
      words={INSTRUCTIONS}
      pin={params.run}
      onPin={(run) => setParams({ run })}
      blockSuites={["S2", "S3"]}
      drillDown={[
        ["S2", "breakdowns", "S2's persistence by rule and length"],
        ["S2", "arms", "S2's instruction persistence by arm and budget"],
        ["S3", "breakdowns", "S3's persistence by rule"],
      ]}
    >
      {(evidence) => (
        <InstructionsEvidence evidence={evidence} at={params.at} onAt={(at) => setParams({ at })} />
      )}
    </QuestionPage>
  )
}

function InstructionsEvidence({
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
      <section aria-labelledby="followed-heading" className="space-y-3">
        <h3 id="followed-heading" className="text-sm font-medium">
          Rules followed (S2)
        </h3>
        <SuitePanel evidence={evidence} suite="S2">
          {(entry) => {
            const tiers = budgetTiers(
              entry.metrics.flatMap((metric) =>
                metric.id === "s2.instruction_persistence" && metric.tier !== null
                  ? [{ tier: metric.tier }]
                  : [],
              ),
            )
            const tier = chosenTier(tiers, at)
            if (!tier) {
              return (
                <p className="text-sm text-muted-foreground" data-state="empty">
                  S2 measured no instruction persistence at a budget in this run.
                </p>
              )
            }
            const rows = valueRows(entry.metrics, "s2.instruction_persistence", tier)
            const label = tierLabel(tier)
            return (
              <div className="space-y-4">
                <TierPicker tiers={tiers} value={tier} onChange={onAt} />
                <MetricPlot
                  rows={rows}
                  title={`Answers that followed the rule at ${label}`}
                  summary={`Each arm's share of the IP family's answers that followed the rule in the system prompt, over every rule, probe and sample at ${label}; an overflow, which reaches no model, is left out. The upper bounds have no budget.`}
                  legend="followed the rule (S2)"
                  header="Followed the rule"
                  mark="dot"
                  domain={[0, 1]}
                  format={(value) => formatPercent(value)}
                  formatTick={percentTick}
                />
                <SourceNote source={entry.source} />
              </div>
            )
          }}
        </SuitePanel>
      </section>

      <section aria-labelledby="rules-heading" className="space-y-3">
        <h3 id="rules-heading" className="text-sm font-medium">
          Each rule apart (S2)
        </h3>
        <SuitePanel evidence={evidence} suite="S2">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S2">
              {(blocks) => (
                <div className="space-y-2">
                  <RulePlots entries={blocks.scripted} at={at} />
                  <SourceNote source={entry.source} />
                </div>
              )}
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>

      <section aria-labelledby="length-heading" className="space-y-3">
        <h3 id="length-heading" className="text-sm font-medium">
          As the conversation grows (S2)
        </h3>
        <SuitePanel evidence={evidence} suite="S2">
          {(entry) => (
            <BlocksPanel evidence={evidence} suite="S2">
              {(blocks) => (
                <div className="space-y-2">
                  <LengthPanel entries={blocks.scripted} at={at} />
                  <SourceNote source={entry.source} />
                </div>
              )}
            </BlocksPanel>
          )}
        </SuitePanel>
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
                  <RuleTable entries={blocks.scripted} at={at} suite="S3" />
                  <SourceNote source={entry.source} />
                </div>
              )}
            </BlocksPanel>
          )}
        </SuitePanel>
      </section>
    </>
  )
}

function RulePlots({ entries, at }: { entries: readonly ScriptedArm[]; at: string | undefined }) {
  const tier = chosenTier(budgetTiers(entries), at)
  const rules = rulesOf(entries, RULE_ORDER)
  if (!tier || rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        S2's summary checks no IP rule in this run.
      </p>
    )
  }
  const label = tierLabel(tier)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 2xl:grid-cols-3">
      {rules.map((rule) => {
        const rows = shareRows(entries, tier, ruleCompliant(rule))
        const reference = rows.find((row) => row.id === REFERENCE_ARMS.conversations)
        return (
          <SharePlot
            key={rule}
            rows={rows}
            title={`${ruleLabel(rule)}, at ${label}`}
            summary={`Each arm's share of the IP family's answers under the rule "${ruleLabel(rule).toLowerCase()}" that followed it, at ${label}; the upper bounds have no budget.${reference ? ` The dashed rule is ${REFERENCE_ARMS.conversations}.` : ""}`}
            legend={`followed: ${ruleLabel(rule).toLowerCase()} (S2)`}
            header="Followed the rule"
            reference={
              reference && reference.value !== null
                ? { value: reference.value, label: REFERENCE_ARMS.conversations }
                : null
            }
          />
        )
      })}
    </div>
  )
}

function LengthPanel({ entries, at }: { entries: readonly ScriptedArm[]; at: string | undefined }) {
  const tier = chosenTier(budgetTiers(entries), at)
  if (!tier) return null
  const { series, turns, tallies } = persistenceSeries(entries, tier)
  const label = tierLabel(tier)
  const title = `Answers that followed the rule by conversation length, at ${label}`
  if (series.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        S2's summary breaks no arm's persistence down by conversation length in this run.
      </p>
    )
  }
  return (
    <TierLines
      title={title}
      summary={`Each arm's share of the IP family's answers that followed the rule, in conversations of each turn count on a log scale, at ${label}; the upper bounds have no budget. The faint dashed line in each panel is ${REFERENCE_ARMS.conversations}. A line that falls with length is a rule pushed out as the conversation grows.`}
      series={series}
      reference={REFERENCE_ARMS.conversations}
      panelLabel={(id) => <ArmLabel arm={id} />}
      formatTier={(turn) => turn}
      table={
        <TableRegion label={title}>
          <Table>
            <TableCaption className="sr-only">{title}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Arm</TableHead>
                {turns.map((turn) => (
                  <TableHead key={turn} scope="col" className="text-right">
                    {turn} turns
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((s) => (
                <TableRow key={s.id} data-arm={s.id}>
                  <TableCell>
                    <ArmLabel arm={s.id} />
                  </TableCell>
                  {turns.map((turn) => {
                    const tally = tallies.get(s.id)?.get(turn)
                    const percent = tally ? share(tally.n, tally.k) : null
                    return (
                      <TableCell
                        key={turn}
                        className="tabular text-right"
                        aria-label={`${s.id}, ${turn} turns: ${tally ? formatRate(percent, tally.k, tally.n) : "not measured"}`}
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
  )
}

/** Each rule's compliance per arm, as a table. */
function RuleTable({
  entries,
  at,
  suite,
}: {
  entries: readonly ScriptedArm[]
  at: string | undefined
  suite: string
}) {
  const tier = chosenTier(budgetTiers(entries), at)
  const rules = rulesOf(entries, RULE_ORDER)
  if (!tier || rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        {suite}'s summary checks no IP rule in this run.
      </p>
    )
  }
  const byRule = new Map(
    rules.map((rule) => [
      rule,
      new Map(shareRows(entries, tier, ruleCompliant(rule)).map((row) => [row.id, row])),
    ]),
  )
  const arms = [
    ...new Map(
      [...byRule.values()].flatMap((rows) =>
        [...rows.values()].map((row) => [row.id, { id: row.id, group: row.group }] as const),
      ),
    ).values(),
  ]
  const label = tierLabel(tier)
  return (
    <GroupedArmTable
      label={`${suite}: each rule at ${label}`}
      caption={`Each arm's share of the IP family's answers that followed each rule, over every probe and sample at ${label}.`}
      arms={arms}
      columns={rules.map((rule) => ({ key: rule, label: ruleLabel(rule) }))}
      cell={(arm, rule) => {
        const row = byRule.get(rule)?.get(arm)
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
  )
}
