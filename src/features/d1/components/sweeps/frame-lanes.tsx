// The shedding viewer's lane view (ui-plan.md 9.2): one frame's timeline on the pipeline's eight
// lanes, every event a mark in sequence order, inferred events dashed and labeled, an empty lane
// saying so. Static: the viewer's slider moves between frames, not between events (the pipeline
// walk does that). The lanes table is the text alternative.

import { useMemo } from "react"

import { Outcome } from "@/components/dashboard/outcome"
import type { TimelineV1 } from "@/data/schema/generated"
import { walkView } from "@/features/d1/model/pipeline"
import { useMeasure } from "@/hooks/use-measure"
import { formatCount } from "@/lib/format"

import { laneBoxes, lanesHeight, LANE_HEIGHT, markX } from "../diagrams/pipeline-geometry"
import { PipelineLanes } from "../diagrams/pipeline-lanes"
import { TimelineLanesTable } from "../timeline-lanes-table"

export function FrameLanes({ timeline, path }: { timeline: TimelineV1; path: string }) {
  const view = useMemo(() => walkView(timeline), [timeline])
  const { ref, width } = useMeasure<HTMLDivElement>()
  const svgWidth = Math.max(width || 640, 480)
  const height = lanesHeight()
  const count = view.events.length
  const laneY = new Map(laneBoxes().map((box) => [box.lane, box.centerY]))
  const emptyLanes = new Set(
    [...view.byLane.entries()].filter(([, events]) => events.length === 0).map(([lane]) => lane),
  )
  const types = new Map<string, number>()
  for (const event of view.events) types.set(event.type, (types.get(event.type) ?? 0) + 1)

  return (
    <div className="space-y-3" data-frame-lanes={path}>
      <p className="text-sm text-muted-foreground">
        <Outcome value={timeline.outcome} />
        {timeline.refusal_reason ? ` ${timeline.refusal_reason}` : ""} at budget{" "}
        {formatCount(timeline.counters.budget_input)}:{" "}
        {count === 0
          ? "no events."
          : `${formatCount(count)} events, ${[...types.entries()].map(([type, n]) => `${formatCount(n)} ${type}`).join(", ")}${view.inferred > 0 ? `; ${formatCount(view.inferred)} in an order the harness inferred, drawn dashed` : ""}.`}{" "}
        <span className="font-mono text-xs break-all">{path}</span>
      </p>
      <div ref={ref} className="w-full" aria-hidden="true">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          width={svgWidth}
          height={height}
          className="block h-auto max-w-full text-foreground"
        >
          <PipelineLanes width={svgWidth} emptyLanes={emptyLanes} />
          {view.events.map((event) => (
            <circle
              key={event.index}
              cx={markX(event.index, count, svgWidth)}
              cy={laneY.get(event.lane) ?? LANE_HEIGHT / 2}
              r={4}
              data-event={event.index}
              strokeDasharray={event.inferred ? "2 2" : undefined}
              className={event.inferred ? "fill-primary/40 stroke-primary" : "fill-primary"}
            />
          ))}
        </svg>
      </div>
      {view.unknownLanes.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          The timeline names lanes this viewer does not draw: {view.unknownLanes.join(", ")}.
        </p>
      ) : null}
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Every event as a table
        </summary>
        <div className="mt-2">
          <TimelineLanesTable timeline={timeline} />
        </div>
      </details>
    </div>
  )
}
