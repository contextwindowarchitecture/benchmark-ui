import { Construction } from "lucide-react"
import { Link } from "react-router"

import { PageSection } from "@/components/dashboard/dashboard-page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCards } from "@/features/d1/components/metric-card"

import { crossMetrics, type SuitePanelProps } from "./types"

/** S7: the scale grid, the thresholds and the sweeps are phase UI-P4; the common parts serve now. */
export function S7Scale({ runId, summary }: SuitePanelProps) {
  return (
    <PageSection
      title="Budget pressure at scale"
      id="panel"
      description="What the suite judged across its shapes and sizes; the grid and the sweeps come with the shedding viewer."
    >
      <MetricCards metrics={crossMetrics(summary)} />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction aria-hidden="true" className="size-4" /> The scale grid is phase UI-P4
          </CardTitle>
          <CardDescription>
            The shape × size heatmap, the threshold searches, the sweep cells and the fixed-window
            rows arrive with the shedding viewer. The rows below hold every cell already.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link to={`/d1/runs/${runId}/sweeps`} className="underline underline-offset-3">
            Shedding
          </Link>
          <Link to={`/d1/runs/${runId}/perf`} className="underline underline-offset-3">
            Performance
          </Link>
        </CardContent>
      </Card>
    </PageSection>
  )
}
