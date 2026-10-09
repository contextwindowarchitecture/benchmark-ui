import { laneWords } from "@/content"

import { LABEL_WIDTH, LANE_HEIGHT, LANE_PAD, laneBoxes } from "./pipeline-geometry"

/**
 * The eight lanes as an SVG fragment: a label column with each stage's name and owner, and a
 * track. The pipeline diagram and the walk draw into the same lanes.
 */
export function PipelineLanes({
  width,
  activeLane,
  emptyLanes,
}: {
  width: number
  /** A lane to highlight. */
  activeLane?: string | null
  /** Lanes with no events in the record shown, labeled as such. */
  emptyLanes?: ReadonlySet<string>
}) {
  return (
    <g data-lanes>
      {laneBoxes().map((box) => {
        const words = laneWords(box.lane)
        const active = activeLane === box.lane
        const empty = emptyLanes?.has(box.lane) ?? false
        return (
          <g key={box.lane} transform={`translate(0,${box.y})`} data-lane={box.lane}>
            <rect
              x={0}
              y={0}
              width={width}
              height={LANE_HEIGHT}
              className={
                box.index % 2 === 0
                  ? "fill-muted/40"
                  : active
                    ? "fill-muted/40"
                    : "fill-transparent"
              }
            />
            {active ? (
              <rect
                x={0}
                y={0}
                width={width}
                height={LANE_HEIGHT}
                className="fill-none stroke-foreground"
              />
            ) : null}
            <text
              x={LANE_PAD}
              y={LANE_HEIGHT / 2 - 2}
              className="fill-foreground text-[12px] font-medium"
            >
              {words?.name ?? box.lane}
            </text>
            <text
              x={LANE_PAD}
              y={LANE_HEIGHT / 2 + 11}
              className="fill-muted-foreground text-[10px]"
            >
              {words?.owner ?? "stage"}
            </text>
            <line
              x1={LABEL_WIDTH}
              x2={LABEL_WIDTH}
              y1={4}
              y2={LANE_HEIGHT - 4}
              className="stroke-border"
            />
            {empty ? (
              <text
                x={LABEL_WIDTH + LANE_PAD}
                y={LANE_HEIGHT / 2 + 4}
                className="fill-muted-foreground text-[11px] italic"
              >
                no events at this stage
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
