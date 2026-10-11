// The overview's evidence (the UI-D2 plan): each panel one suite's typed metrics from the run the
// composite reads it from, as a picture with its summary and its table. Every panel names its run.

import { Link } from "react-router"

import { ArmPlot, type ArmTone } from "@/components/charts/arm-plot"
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
import { ARM_GROUPS, type ArmGroup } from "@/content/d2/vocabulary"
import {
  byArmAndTier,
  pairedReference,
  share,
  type ArmBlock,
  type LoopArm,
  type LqArm,
} from "@/features/d2/model/blocks"
import { intervalLevel, metricText } from "@/features/d2/model/metric-text"
import { tierLabel, type D2Metric } from "@/features/d2/model/metrics"
import {
  aptitudeRows,
  attributionRows,
  longContextSeries,
  loopRows,
  pairedRows,
  REFERENCE_ARMS,
  valueRows,
  type ArmRowWithMetrics,
} from "@/features/d2/model/overview"
import {
  formatCount,
  formatPercent,
  formatPoints,
  formatPointsDifference,
  formatPointsDifferenceInterval,
  formatRate,
} from "@/lib/format"

import { ArmLabel } from "../arm-label"
import { GroupedArmTable, ShareCell } from "../grouped-arm-table"
import { MetricValue } from "../metric-value"
import { PairedTable } from "../paired-table"

const TONES: Record<ArmGroup, ArmTone> = {
  control: "outline",
  conventional: "muted",
  cwa: "accent",
}

const GROUPS = ARM_GROUPS.map((group) => ({ ...group, tone: TONES[group.id] }))

const percentTick = (value: number) => `${Math.round(value * 100)}%`

/** Where a panel's numbers come from: its run, linked, and the scripts' size. */
export type PanelSource = { runId: string; suite: string; size: string | null }

export function SourceNote({ source }: { source: PanelSource }) {
  return (
    <p className="text-xs text-muted-foreground" data-source={source.suite}>
      {source.suite} of run{" "}
      <Link
        to={`/d2/runs/${source.runId}/suites/${source.suite}`}
        className="font-mono underline underline-offset-3"
      >
        {source.runId}
      </Link>
      {source.size ? `, ${source.size} size` : ""}.
    </p>
  )
}

function RowsTable({
  rows,
  label,
  valueHeader,
  backdropHeader,
}: {
  rows: readonly ArmRowWithMetrics[]
  label: string
  valueHeader: string
  backdropHeader?: string
}) {
  return (
    <TableRegion label={label}>
      <Table>
        <TableCaption className="sr-only">{label}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Arm</TableHead>
            <TableHead scope="col">Tier</TableHead>
            <TableHead scope="col" className="text-right">
              {valueHeader}
            </TableHead>
            {backdropHeader ? (
              <TableHead scope="col" className="text-right">
                {backdropHeader}
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} data-arm={row.id}>
              <TableCell>
                <ArmLabel arm={row.id} showPayload />
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">{tierLabel(row.tier)}</TableCell>
              <TableCell className="tabular text-right">
                <MetricValue metric={row.metric} />
              </TableCell>
              {backdropHeader ? (
                <TableCell className="tabular text-right">
                  {row.backdropMetric ? (
                    <MetricValue metric={row.backdropMetric} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}

/** The signature: accuracy per arm at the tightest budget, the fact-sent share behind it. */
export function AptitudePanel({
  s2,
  s1,
  budget,
  source,
  factSource,
}: {
  s2: readonly D2Metric[]
  s1: readonly D2Metric[]
  budget: string
  source: PanelSource
  factSource: PanelSource | null
}) {
  const rows = aptitudeRows(s2, budget, s1)
  const reference = rows.find((row) => row.id === REFERENCE_ARMS.conversations)
  const label = tierLabel(budget)
  return (
    <div className="space-y-2">
      <ArmPlot
        title={`Correct answers per arm at ${label}`}
        summary={`Each arm's share of correct answers over every probe and sample at ${label}, with its 95% cluster-bootstrap interval over conversations; the upper bounds have no budget.${factSource ? " Behind each, the share of the arm's probes whose needed facts were in the payload at that budget, so a wrong answer can be told from a fact that was never sent." : ""}${reference ? ` The dashed rule is ${REFERENCE_ARMS.conversations}, the fair reference.` : ""}`}
        rows={rows}
        groups={GROUPS}
        domain={[0, 1]}
        mark="dot"
        format={(value) => formatPercent(value)}
        formatTick={percentTick}
        reference={
          reference && reference.value !== null
            ? { value: reference.value, label: REFERENCE_ARMS.conversations }
            : null
        }
        legend={{ mark: "correct answers (S2)", backdrop: "needed facts in the payload (S1)" }}
        table={
          <RowsTable
            rows={rows}
            label={`Correct answers per arm at ${label}`}
            valueHeader="Correct answers"
            backdropHeader={factSource ? "Facts in the payload" : undefined}
          />
        }
      />
      <SourceNote source={source} />
      {factSource ? <SourceNote source={factSource} /> : null}
    </div>
  )
}

/** S3: how much repeated samples vary, per arm, in points. */
export function UnreliabilityPanel({
  metrics,
  budget,
  source,
}: {
  metrics: readonly D2Metric[]
  budget: string
  source: PanelSource
}) {
  const rows = valueRows(metrics, "s3.unreliability", budget)
  const label = tierLabel(budget)
  return (
    <div className="space-y-2">
      <ArmPlot
        title={`Unreliability per arm at ${label}`}
        summary={`Unreliability, the study's U90−10: for each probe, the 90th less the 10th percentile of its repeated samples' scores at a temperature above zero, averaged over probes, in points out of 100, with its 95% interval. Lower is steadier.`}
        rows={rows}
        groups={GROUPS}
        domain="auto"
        mark="dot"
        format={formatPoints}
        formatTick={(value) => formatCount(value)}
        legend={{ mark: "unreliability (S3), points" }}
        table={
          <RowsTable
            rows={rows}
            label={`Unreliability per arm at ${label}`}
            valueHeader="Unreliability"
          />
        }
      />
      <SourceNote source={source} />
    </div>
  )
}

/** S5: prompt tokens per correct answer, per arm. */
export function CostPanel({
  metrics,
  budget,
  source,
}: {
  metrics: readonly D2Metric[]
  budget: string
  source: PanelSource
}) {
  const rows = valueRows(metrics, "s5.prompt_tokens_per_correct", budget).filter(
    (row) => row.metric.family === null,
  )
  const label = tierLabel(budget)
  return (
    <div className="space-y-2">
      <ArmPlot
        title={`Prompt tokens per correct answer at ${label}`}
        summary={`What each correct answer cost in prompt tokens at ${label}, from the calls S2 made: every prompt token the arm sent, divided by its correct answers. Lower is cheaper.`}
        rows={rows}
        groups={GROUPS}
        domain="auto"
        mark="bar"
        format={(value) => `${formatCount(value)} tokens`}
        formatTick={(value) => formatCount(value)}
        legend={{ mark: "prompt tokens per correct answer (S5)" }}
        table={
          <RowsTable
            rows={rows}
            label={`Prompt tokens per correct answer at ${label}`}
            valueHeader="Tokens per correct answer"
          />
        }
      />
      <SourceNote source={source} />
    </div>
  )
}

/** S4: accuracy against corpus size, one panel per arm, the reference faint in each. */
export function LongContextPanel({
  metrics,
  source,
}: {
  metrics: readonly D2Metric[]
  source: PanelSource
}) {
  const { series, metrics: byArm, tiers } = longContextSeries(metrics)
  const tableLabel = "Correct answers per arm and corpus size"
  return (
    <div className="space-y-2">
      <TierLines
        title={tableLabel}
        summary={`Each arm's share of correct answers over questions about corpora from a fraction of the budget to many times it, the corpus's size as a multiple of the budget on a log scale. The faint dashed line in each panel is ${REFERENCE_ARMS.documents}, the reference over documents.`}
        series={series}
        reference={REFERENCE_ARMS.documents}
        panelLabel={(id) => <ArmLabel arm={id} />}
        formatTier={(tier) => tier.replace(/^x/, "×")}
        table={
          <TableRegion label={tableLabel}>
            <Table>
              <TableCaption className="sr-only">{tableLabel}</TableCaption>
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
                      const metric = byArm.get(s.id)?.get(tier)
                      return (
                        <TableCell
                          key={tier}
                          className="tabular text-right"
                          aria-label={`${s.id}, ${tierLabel(tier)}: ${metric ? metricText(metric) : "not measured"}`}
                        >
                          {metric ? (
                            <MetricValue metric={metric} />
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
      <SourceNote source={source} />
    </div>
  )
}

/**
 * S6: accuracy with the model's own replies as history, against the scripted result and, when
 * the suite's typed block is given, paired with the reference arm.
 */
export function LoopPanel({
  metrics,
  source,
  blocks = [],
}: {
  metrics: readonly D2Metric[]
  source: PanelSource
  blocks?: readonly LoopArm[]
}) {
  const rows = loopRows(metrics)
  const paired = new Map(blocks.map((block) => [block.arm, block.paired]))
  const reference = pairedReference(blocks)
  if (rows.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        S6 measured no arm in this run.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <TableRegion label="The model in the loop">
        <Table>
          <TableCaption className="sr-only">
            Each arm's accuracy with the model's own replies as its history, and its difference from
            the scripted result on the same probes.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Arm</TableHead>
              <TableHead scope="col" className="text-right">
                Correct answers
              </TableHead>
              <TableHead scope="col" className="text-right">
                Against the scripted result
              </TableHead>
              {blocks.length > 0 ? (
                <TableHead scope="col" className="text-right">
                  Less {reference ?? "the reference"}
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const difference = paired.get(row.arm)
              const pairedText = difference
                ? `${formatPointsDifference(difference.difference)}, ${intervalLevel(difference.interval.level)} interval ${formatPointsDifferenceInterval(difference.interval.low, difference.interval.high)}, over ${formatCount(difference.n)} pairs`
                : row.arm === reference
                  ? "the reference"
                  : "not paired"
              return (
                <TableRow key={row.arm} data-arm={row.arm}>
                  <TableCell>
                    <ArmLabel arm={row.arm} />
                  </TableCell>
                  <TableCell className="tabular text-right">
                    <MetricValue metric={row.aptitude} />
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {row.against && row.against.value !== null ? (
                      <span title={row.against.description || undefined}>
                        {formatPointsDifference(row.against.value)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">not measured</span>
                    )}
                  </TableCell>
                  {blocks.length > 0 ? (
                    <TableCell
                      className="tabular text-right"
                      aria-label={`${row.arm}, less ${reference ?? "the reference"}: ${pairedText}`}
                      title={pairedText}
                    >
                      {difference ? (
                        <span className="inline-flex flex-col items-end">
                          <span>{formatPointsDifference(difference.difference)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatPointsDifferenceInterval(
                              difference.interval.low,
                              difference.interval.high,
                            )}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.arm === reference ? "reference" : "not paired"}
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableRegion>
      <p className="text-xs text-muted-foreground">
        The differences are the harness's own, in percentage points: the loop's accuracy less the
        scripted run's on the same probes
        {blocks.length > 0
          ? ", and less the reference arm's in the loop on the same probes and chains, with its interval"
          : ""}
        .
      </p>
      <SourceNote source={source} />
    </div>
  )
}

/**
 * The write-up's comparison: each arm less the reference arm on the same probes and samples at
 * the budget, with the harness's interval, as a dot with a whisker on a scale with zero marked
 * as the reference. From S2's typed by_arm block.
 */
export function PairedPanel({
  entries,
  budget,
  source,
}: {
  entries: readonly ArmBlock[]
  budget: string
  source: PanelSource
}) {
  const rows = pairedRows(entries, budget)
  const reference = pairedReference(entries) ?? REFERENCE_ARMS.conversations
  const label = tierLabel(budget)
  const title = `Paired difference from ${reference} at ${label}`
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        No arm is paired with {reference} at {label} in this run.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <ArmPlot
        title={title}
        summary={`Each arm's share of correct answers less ${reference}'s on the same probes and samples at ${label}, in percentage points, with its 95% cluster-bootstrap interval over conversations; the dashed rule at zero is ${reference} itself. The upper bounds have no budget and are not paired.`}
        rows={rows}
        groups={GROUPS}
        domain="auto"
        mark="dot"
        format={formatPointsDifference}
        formatTick={(value) => `${Math.round(value * 100)} pp`}
        reference={{ value: 0, label: reference }}
        legend={{ mark: `difference from ${reference} (S2), percentage points` }}
        table={
          <PairedTable
            entries={entries}
            tiers={[budget]}
            label={title}
            caption={`Each arm less ${reference} on the same probes and samples at ${label}, in percentage points with its interval.`}
          />
        }
      />
      <SourceNote source={source} />
    </div>
  )
}

/**
 * The write-up's attribution, from S2's typed block: correct answers among the probes whose
 * needed facts the payload carried, and among those whose facts it did not, per arm at the
 * budget; the upper bounds at no budget.
 */
export function AttributionPanel({
  entries,
  budget,
  source,
}: {
  entries: readonly ArmBlock[]
  budget: string
  source: PanelSource
}) {
  const rows = attributionRows(entries, budget)
  const label = tierLabel(budget)
  const title = `Correct answers by whether the facts were sent at ${label}`
  const byArm = new Map(rows.map((row) => [row.arm, row]))
  const cell = (arm: string, column: string) => {
    const row = byArm.get(arm)
    if (!row) return null
    const tally = column === "sent" ? row.given.present : row.given.absent
    if (tally.n === 0) {
      return {
        node: <span className="text-muted-foreground">none</span>,
        text: column === "sent" ? "no probe had its facts sent" : "every probe had its facts sent",
      }
    }
    const percent = share(tally.n, tally.correct)
    return {
      node: (
        <ShareCell
          percent={percent === null ? null : formatPercent(percent)}
          fraction={`${formatCount(tally.correct)} / ${formatCount(tally.n)}`}
        />
      ),
      text: formatRate(percent, tally.correct, tally.n),
    }
  }
  return (
    <div className="space-y-2">
      <GroupedArmTable
        label={title}
        caption={`Correct answers among the probes whose needed facts were in the payload at ${label}, and among those whose facts were not; the upper bounds at no budget.`}
        arms={rows.map((row) => ({ id: row.arm, group: row.group }))}
        columns={[
          { key: "sent", label: "Facts sent" },
          { key: "unsent", label: "Facts not sent" },
        ]}
        cell={cell}
      />
      <p className="text-xs text-muted-foreground">
        A wrong answer with the facts sent is the model's; one without them is the payload's. The
        upper bounds are read at no budget.
      </p>
      <SourceNote source={source} />
    </div>
  )
}

/** S4's arms paired with the reference over documents at every corpus size, from its block. */
export function LongContextPairedPanel({
  entries,
  source,
}: {
  entries: readonly LqArm[]
  source: PanelSource
}) {
  const reference = pairedReference(entries) ?? REFERENCE_ARMS.documents
  const tiers = byArmAndTier(entries).tiers
  if (tiers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        No arm is paired with {reference} in this run.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <PairedTable
        entries={entries}
        label={`Paired difference from ${reference} by corpus size`}
        caption={`Each arm less ${reference} on the same questions and samples at each corpus size, in percentage points with its interval.`}
      />
      <SourceNote source={source} />
    </div>
  )
}
