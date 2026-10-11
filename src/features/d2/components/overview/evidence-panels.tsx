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
import { metricText } from "@/features/d2/model/metric-text"
import { tierLabel, type D2Metric } from "@/features/d2/model/metrics"
import {
  aptitudeRows,
  longContextSeries,
  loopRows,
  REFERENCE_ARMS,
  valueRows,
  type ArmRowWithMetrics,
} from "@/features/d2/model/overview"
import { formatCount, formatPercent, formatPoints, formatPointsDifference } from "@/lib/format"

import { ArmLabel } from "../arm-label"
import { MetricValue } from "../metric-value"

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

/** S6: accuracy with the model's own replies as history, against the scripted result. */
export function LoopPanel({
  metrics,
  source,
}: {
  metrics: readonly D2Metric[]
  source: PanelSource
}) {
  const rows = loopRows(metrics)
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
      <p className="text-xs text-muted-foreground">
        The difference is the harness's own, in percentage points: the loop's accuracy less the
        scripted run's on the same probes.
      </p>
      <SourceNote source={source} />
    </div>
  )
}
