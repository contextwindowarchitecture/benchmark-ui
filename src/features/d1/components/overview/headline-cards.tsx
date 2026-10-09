import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HeadlineGroupView, HeadlineMetric } from "@/features/d1/model/overview"
import { suiteOfMetricId } from "@/features/d1/model/overview"
import { formattedTarget, metricDefinition } from "@/features/d1/model/run"
import { formatCount } from "@/lib/format"

/** The headline groups as cards (ui-plan.md 8.1, item 2), each metric straight from metrics[]. */
export function HeadlineGroups({
  groups,
  missingNote,
}: {
  groups: HeadlineGroupView[]
  /** What to say about ids no loaded run carries, by suite (the S7 run is missing). */
  missingNote: (suite: string) => string
}) {
  return (
    <div className="space-y-6">
      {groups.map(({ group, metrics, missing }) => (
        <section
          key={group.id}
          aria-labelledby={`headline-${group.id}`}
          data-headline-group={group.id}
        >
          <h3 id={`headline-${group.id}`} className="mb-2 text-sm font-medium">
            {group.title}
          </h3>
          {metrics.length === 0 && missing.length > 0 ? (
            <p
              className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
              data-state="absent"
            >
              {missingNote(suiteOfMetricId(missing[0] ?? ""))}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <HeadlineCard key={metric.id} metric={metric} />
            ))}
            {metrics.length > 0
              ? missing.map((id) => (
                  <Card
                    key={id}
                    className="min-w-0 gap-2 border-dashed py-4"
                    data-metric-missing={id}
                  >
                    <CardHeader className="px-4">
                      <CardTitle className="font-mono text-sm font-medium">{id}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 text-xs text-muted-foreground">
                      {missingNote(suiteOfMetricId(id))}
                    </CardContent>
                  </Card>
                ))
              : null}
          </div>
        </section>
      ))}
    </div>
  )
}

/** One headline metric: a cross-adapter value large, or the four adapters' values in rows. */
export function HeadlineCard({ metric }: { metric: HeadlineMetric }) {
  const first = metric.entries[0]
  return (
    <Card data-metric={metric.id} className="min-w-0 gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
        <CardDescription className="font-mono text-xs">
          {metric.id} · {suiteOfMetricId(metric.id)} · run {metric.runId}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        {metric.cross && first ? (
          <CrossValue metric={first} />
        ) : (
          <ul className="space-y-1">
            {metric.entries.map((entry) => {
              const definition = metricDefinition(entry)
              const fraction =
                entry.unit === "rate"
                  ? definition.formattedValue.match(/\((.*)\)$/)?.[1]
                  : undefined
              const value = fraction
                ? definition.formattedValue.replace(/ \(.*\)$/, "")
                : definition.formattedValue
              return (
                <li
                  key={entry.adapter ?? "all"}
                  className="flex flex-wrap items-center justify-between gap-x-3 text-sm"
                  data-adapter={entry.adapter ?? undefined}
                >
                  <span className="inline-flex items-center gap-2">
                    <StatusBadge status={entry.status} iconOnly />
                    {entry.adapter ? <AdapterMark adapter={entry.adapter} /> : "all adapters"}
                  </span>
                  <span className="tabular">
                    <span
                      className={entry.value === null ? "text-muted-foreground" : "font-medium"}
                    >
                      {value}
                    </span>
                    {fraction ? (
                      <span className="text-xs text-muted-foreground"> {fraction}</span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {first ? (
          <p className="mt-2 text-xs text-muted-foreground">
            target {formattedTarget(first)}
            {first.description ? ` · ${first.description}` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function CrossValue({ metric }: { metric: HeadlineMetric["entries"][number] }) {
  const definition = metricDefinition(metric)
  const fraction =
    metric.unit === "rate" &&
    metric.numerator !== null &&
    metric.denominator !== null &&
    metric.value !== null
      ? `${formatCount(metric.numerator)} / ${formatCount(metric.denominator)}`
      : null
  const value =
    metric.value === null
      ? definition.formattedValue
      : fraction
        ? definition.formattedValue.replace(/ \(.*\)$/, "")
        : definition.formattedValue
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={
          metric.value === null
            ? "text-lg text-muted-foreground"
            : "tabular text-2xl font-semibold tracking-tight"
        }
      >
        {value}
      </span>
      {fraction ? <span className="tabular text-sm text-muted-foreground">{fraction}</span> : null}
      <StatusBadge status={metric.status} className="ml-auto" />
    </div>
  )
}
