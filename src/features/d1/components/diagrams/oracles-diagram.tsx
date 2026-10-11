import { HOW_TO_READ } from "@/content"
import { ORACLES, oracleMetrics } from "@/features/d1/model/oracles"
import { metricDefinition, type SummaryMetric } from "@/features/d1/model/run"
import { useMeasure } from "@/hooks/use-measure"

import { DiagramFrame } from "./diagram-frame"
import { ANSWER, BOX_HEIGHT, oraclesLayout } from "./oracles-geometry"

/**
 * The oracles (ui-plan.md 7.3): why the results are credible. Four independent judges around one
 * answer, with the self-check's numbers (S0) on the ones it measures, from the run's summary.
 */
export function OraclesDiagram({ metrics, runId }: { metrics: SummaryMetric[]; runId: string }) {
  const numbers = (oracle: (typeof ORACLES)[number]) => oracleMetrics(oracle, metrics)
  const { ref, width: available } = useMeasure<HTMLDivElement>()
  const layout = oraclesLayout(available)
  const answerX = layout.answer.x + ANSWER.w / 2
  const answerY = layout.answer.y + ANSWER.h / 2
  return (
    <DiagramFrame
      id="oracles-diagram"
      title="The oracles: four judges of one answer"
      description={
        <>
          {HOW_TO_READ.oracles} Self-check numbers from run{" "}
          <span className="font-mono">{runId}</span>.
        </>
      }
      figure={
        <div ref={ref} className="w-full">
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            className={
              layout.kind === "stack"
                ? "block h-auto max-w-full text-foreground"
                : "block h-auto w-full max-w-[44rem] text-foreground"
            }
            data-layout={layout.kind}
          >
            {ORACLES.map((oracle) => {
              const p = layout.boxes[oracle.id]
              const measured = numbers(oracle)
              return (
                <g key={oracle.id} data-oracle={oracle.id}>
                  <polyline
                    points={layout.connectors[oracle.id]}
                    className="fill-none stroke-border"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={p.x}
                    y={p.y}
                    width={layout.boxWidth}
                    height={BOX_HEIGHT}
                    rx={8}
                    className="fill-card stroke-border"
                  />
                  <text
                    x={p.x + 10}
                    y={p.y + 20}
                    className="fill-foreground text-[12px] font-medium"
                  >
                    {oracle.name}
                  </text>
                  {measured.length > 0 ? (
                    <text x={p.x + 10} y={p.y + 40} className="fill-success text-[11px]">
                      {measured.length === 1
                        ? `${measured[0]!.label}: ${metricDefinition(measured[0]!).formattedValue}`
                        : `${measured.length} primitives reproduced, each ${metricDefinition(measured[0]!).formattedValue.replace(/ \(.*\)$/, "")}`}
                    </text>
                  ) : (
                    <text x={p.x + 10} y={p.y + 40} className="fill-muted-foreground text-[11px]">
                      judged on every answer
                    </text>
                  )}
                </g>
              )
            })}
            <g data-answer>
              <rect
                x={layout.answer.x}
                y={layout.answer.y}
                width={ANSWER.w}
                height={ANSWER.h}
                rx={ANSWER.h / 2}
                className="fill-primary/10 stroke-primary"
              />
              <text
                x={answerX}
                y={answerY - 4}
                textAnchor="middle"
                className="fill-foreground text-[12px] font-medium"
              >
                one answer
              </text>
              <text
                x={answerX}
                y={answerY + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                payload + trace
              </text>
            </g>
          </svg>
        </div>
      }
      equivalent={
        <ol className="space-y-2">
          {ORACLES.map((oracle) => {
            const measured = numbers(oracle)
            return (
              <li key={oracle.id} data-oracle-words={oracle.id}>
                <span className="font-medium">{oracle.name}</span>
                <p className="text-xs text-muted-foreground">{oracle.text}</p>
                {measured.length > 0 ? (
                  <ul className="mt-1 text-xs">
                    {measured.map((metric) => (
                      <li key={metric.id} data-metric={metric.id}>
                        {metric.label}:{" "}
                        <span className="tabular">{metricDefinition(metric).formattedValue}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Judged on every answer; its numbers are each suite's agreement and pass rates.
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      }
      citation={HOW_TO_READ.citation}
    />
  )
}
