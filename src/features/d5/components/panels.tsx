// Domain 5's panels (the UI-D5 plan), shared by the overview and the question pages: a metric per
// arm as a plot, a metric over its sized tiers as small multiples, what the conventional payloads
// let through, and the adaptive attacker beside the static rate. Each names its run.

import { TierLines } from "@/components/charts/tier-lines"
import { percentTick } from "@/features/d2/components/evidence/arm-groups"
import { ArmLabel } from "@/features/d2/components/arm-label"
import { ArmTierTable } from "@/features/d2/components/arm-tier-table"
import { GroupedArmTable } from "@/features/d2/components/grouped-arm-table"
import { MetricValue } from "@/features/d2/components/metric-value"
import { MetricPlot } from "@/features/d2/components/questions/share-plot"
import { metricText } from "@/features/d2/model/metric-text"
import { armTierTable } from "@/features/d2/model/metrics"
import { D5_ARM_ORDER } from "@/features/d5/model/metrics"
import { adaptiveRows, armRows, forgedRows, tierSeries } from "@/features/d5/model/overview"
import { compareD5Tiers, d5TierTick } from "@/features/d5/model/tiers"
import { SourceNote } from "@/features/shared/evidence/evidence-states"
import { useArmVocabulary } from "@/features/shared/vocabulary"
import { formatPercent } from "@/lib/format"

import type { SuiteEvidence } from "./use-evidence"

const rate = (value: number) => formatPercent(value)

/** One metric per arm as a plot: a rate's full scale for a dot, fitted to the values for a bar. */
export function RatePanel({
  entry,
  id,
  tier = null,
  title,
  summary,
  legend,
  header,
  mark = "dot",
}: {
  entry: SuiteEvidence
  id: string
  tier?: string | null
  title: string
  summary: string
  legend: string
  header: string
  mark?: "dot" | "bar"
}) {
  return (
    <div className="space-y-2">
      <MetricPlot
        rows={armRows(entry.metrics, id, tier)}
        title={title}
        summary={summary}
        legend={legend}
        header={header}
        mark={mark}
        domain={mark === "dot" ? [0, 1] : "auto"}
        format={rate}
        formatTick={percentTick}
      />
      <SourceNote source={entry.source} />
    </div>
  )
}

/** A metric over its sized tiers, one small panel per arm with a reference arm faint in each. */
export function TierSeriesPanel({
  entry,
  id,
  reference,
  title,
  summary,
}: {
  entry: SuiteEvidence
  id: string
  reference: string
  title: string
  summary: string
}) {
  const { series, tiers } = tierSeries(entry.metrics, id)
  const table = armTierTable(entry.metrics, id, {
    order: D5_ARM_ORDER,
    compareTier: compareD5Tiers(id),
  })
  if (series.length === 0 || !table) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        The run measured no {id} over its tiers.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <TierLines
        title={title}
        summary={`${summary} The faint dashed line in each panel is ${reference}.`}
        series={series}
        reference={reference}
        panelLabel={(arm) => <ArmLabel arm={arm} />}
        formatTier={(tier) => d5TierTick(tier, id)}
        table={<ArmTierTable table={table} label={title} />}
      />
      <p className="sr-only">{tiers.length} tiers.</p>
      <SourceNote source={entry.source} />
    </div>
  )
}

/** One or more metrics by arm and tier (a carrier, a producer, a scenario), as tables. */
export function TierTables({ entry, ids }: { entry: SuiteEvidence; ids: readonly string[] }) {
  const tables = ids.flatMap((id) => {
    const table = armTierTable(entry.metrics, id, {
      order: D5_ARM_ORDER,
      compareTier: compareD5Tiers(id),
    })
    return table ? [table] : []
  })
  if (tables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        The run measured none of these by tier.
      </p>
    )
  }
  return (
    <div className="space-y-6">
      {tables.map((table) => (
        <section key={table.id} className="space-y-2" aria-labelledby={`${table.id}-tiers`}>
          <h4 id={`${table.id}-tiers`} className="text-sm font-medium">
            {table.label}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">{table.id}</span>
          </h4>
          {table.description ? (
            <p className="max-w-prose text-xs text-muted-foreground">{table.description}</p>
          ) : null}
          <ArmTierTable table={table} />
        </section>
      ))}
      <SourceNote source={entry.source} />
    </div>
  )
}

/** Per conventional arm: payloads whose structure a tag attack forged, and raw turn markers. */
export function ForgedPanel({ entry }: { entry: SuiteEvidence }) {
  const vocabulary = useArmVocabulary()
  const rows = forgedRows(entry.metrics)
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        S1 read no baseline for forged structure in this run.
      </p>
    )
  }
  const byArm = new Map(rows.map((row) => [row.arm, row]))
  return (
    <div className="space-y-2">
      <GroupedArmTable
        label="Forged structure in the conventional payloads"
        caption="Per conventional arm: the payloads whose own boundary a tag attack forged, and the payloads that hand the model a marker attack's chat-template markers as raw text. The CWA arms escape both, so none appears here."
        arms={rows.map((row) => ({ id: row.arm, group: vocabulary.groupOf(row.arm) }))}
        columns={[
          { key: "forged", label: "Boundary forged by a tag attack" },
          { key: "markers", label: "Raw turn markers sent" },
        ]}
        cell={(arm, column) => {
          const metric = column === "forged" ? byArm.get(arm)?.forged : byArm.get(arm)?.markers
          return metric
            ? { node: <MetricValue metric={metric} />, text: metricText(metric, vocabulary.points) }
            : null
        }}
      />
      <p className="text-xs text-muted-foreground">
        A dash is an arm with no boundary of its own to forge. Whether the served tokenizer reads a
        forged marker as a real one is S1's special-token check, on its suite page.
      </p>
      <SourceNote source={entry.source} />
    </div>
  )
}

/** Per arm: the adaptive attacker's held-out success at its full budget, beside the static rate. */
export function AdaptivePanel({ entry, at }: { entry: SuiteEvidence; at?: string }) {
  const vocabulary = useArmVocabulary()
  const { budget, rows } = adaptiveRows(entry.metrics, at)
  if (!budget || rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        S4 measured no adaptive attack in this run.
      </p>
    )
  }
  const byArm = new Map(rows.map((row) => [row.arm, row]))
  const budgetWords = vocabulary.tierLabel(budget, "s4.asr_by_budget")
  return (
    <div className="space-y-2">
      <MetricPlot
        rows={armRows(entry.metrics, "s4.asr_by_budget", budget)}
        title={`Adaptive attack success per arm after ${budgetWords}`}
        summary={`Each arm's held-out success of the best attack an adaptive attacker found within ${budgetWords}, with its interval over task instances. Every arm falls to an attacker that adapts; the static rate for the same goal is in the table.`}
        legend="adaptive attacks executed (S4)"
        header="Adaptive"
        mark="dot"
        domain={[0, 1]}
        format={rate}
        formatTick={percentTick}
      />
      <GroupedArmTable
        label={`Static and adaptive attack success after ${budgetWords}`}
        caption="Each arm's static success for the hijack goal (S2's templates) beside the adaptive attacker's held-out success."
        arms={rows.map((row) => ({ id: row.arm, group: vocabulary.groupOf(row.arm) }))}
        columns={[
          { key: "static", label: "Static" },
          { key: "adaptive", label: "Adaptive" },
        ]}
        cell={(arm, column) => {
          const row = byArm.get(arm)
          const metric = column === "static" ? row?.static : row?.adaptive
          return metric
            ? { node: <MetricValue metric={metric} />, text: metricText(metric, vocabulary.points) }
            : null
        }}
      />
      <SourceNote source={entry.source} />
    </div>
  )
}
