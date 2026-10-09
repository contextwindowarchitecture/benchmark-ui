import { PageSection } from "@/components/dashboard/dashboard-page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCards } from "@/features/d1/components/metric-card"
import { formatCount } from "@/lib/format"

import { EnvironmentMatrix } from "./environment-matrix"
import { perAdapterMetrics, type SuitePanelProps } from "./types"

/** S2 (ui-plan.md 8.4): the environment matrix with the clock-shift probes beside it. */
export function S2Environment({ summary }: SuitePanelProps) {
  const cells = summary.cells ?? []
  const environment = summary.environment
  const clockCells = cells.filter((cell) => cell.cell.includes("faketime"))
  return (
    <PageSection
      title="Environment matrix"
      id="panel"
      description="Whether each adapter's decision, payload and trace stay the same as on the host baseline when the environment changes."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <EnvironmentMatrix cells={cells} label="Environment matrix" />
        <div className="grid gap-4 self-start">
          {environment ? (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>How it was run</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                  <dt className="text-muted-foreground">Host</dt>
                  <dd className="font-mono text-xs">{environment.host_platform}</dd>
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="text-xs">{environment.reference}</dd>
                  <dt className="text-muted-foreground">Repetitions</dt>
                  <dd className="text-xs">
                    {Object.entries(environment.repetitions)
                      .filter((pair): pair is [string, number] => typeof pair[1] === "number")
                      .map(([cell, n]) => `${cell} ×${formatCount(n)}`)
                      .join(", ") || "—"}
                  </dd>
                  <dt className="text-muted-foreground">Container</dt>
                  <dd className="text-xs">
                    {environment.container_error
                      ? `not built: ${environment.container_error}`
                      : environment.container
                        ? "built for the Linux cells"
                        : "none"}
                    {environment.matrix_errors && environment.matrix_errors.length > 0
                      ? `; ${environment.matrix_errors.map((e) => `${e.variant}: ${e.error}`).join("; ")}`
                      : ""}
                  </dd>
                </dl>
              </CardContent>
            </Card>
          ) : null}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Clock shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                The wall clock moved thirty years either way under libfaketime. A cell the library
                could not apply to an adapter is hatched in the matrix and counted here.
              </p>
              {clockCells.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clock-shift cell in this run.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {clockCells.map((cell) => (
                    <li
                      key={`${cell.cell}|${cell.adapter}`}
                      className="flex justify-between gap-2 font-mono"
                    >
                      <span>
                        {cell.cell} · {cell.adapter}
                      </span>
                      <span className={cell.applied > 0 ? undefined : "text-muted-foreground"}>
                        {cell.applied > 0
                          ? `${formatCount(cell.applied)} applied`
                          : `${formatCount(cell.not_applied)} not applied`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <MetricCards metrics={perAdapterMetrics(summary, "s2.clock_shift_not_applied")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageSection>
  )
}
