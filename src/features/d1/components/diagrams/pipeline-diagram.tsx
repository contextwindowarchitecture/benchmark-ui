import { LANES as LANE_WORDS, VOCABULARY_CITATION } from "@/content"
import { useMeasure } from "@/hooks/use-measure"

import { DiagramFrame } from "./diagram-frame"
import { lanesHeight } from "./pipeline-geometry"
import { PipelineLanes } from "./pipeline-lanes"

/**
 * The pipeline (ui-plan.md 7.3): the eight stages in order, with what each may do to an item,
 * drawn as the lanes the viewer and the walk use, so the diagram and the data view are the same
 * picture.
 */
export function PipelineDiagram() {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const svgWidth = Math.max(width || 640, 480)
  const height = lanesHeight()
  return (
    <DiagramFrame
      id="pipeline-diagram"
      title="The pipeline: eight stages, in order"
      description="A producer prepares items; the assembler admits, resolves, fits and renders them. Every decision at every stage lands in the trace, and the timeline of one answer lays its events on these lanes."
      figure={
        <div ref={ref} className="w-full">
          <svg
            viewBox={`0 0 ${svgWidth} ${height}`}
            width={svgWidth}
            height={height}
            className="block h-auto max-w-full text-foreground"
          >
            <PipelineLanes width={svgWidth} />
          </svg>
        </div>
      }
      equivalent={
        <ol className="space-y-2">
          {LANE_WORDS.map((lane) => (
            <li key={lane.lane} data-lane-words={lane.lane}>
              <span className="font-medium">{lane.name}</span>{" "}
              <span className="text-xs text-muted-foreground">({lane.owner})</span>
              <p className="text-xs text-muted-foreground">{lane.text}</p>
            </li>
          ))}
        </ol>
      }
      note="The lanes are the timeline schema's eight stages. Their words quote the specification's stage descriptions, which the contract document does not yet type."
      citation={VOCABULARY_CITATION}
    />
  )
}
