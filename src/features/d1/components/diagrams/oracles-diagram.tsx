import { HOW_TO_READ } from "@/content"
import { ORACLES, oracleMetrics, type OracleId } from "@/features/d1/model/oracles"
import { metricDefinition, type SummaryMetric } from "@/features/d1/model/run"

import { DiagramFrame } from "./diagram-frame"

const W = 640
const H = 300
const CENTER = { x: W / 2, y: H / 2 }
const BOX = { w: 230, h: 56 }
const POSITIONS: Record<OracleId, { x: number; y: number }> = {
  expected: { x: 8, y: 8 },
  differential: { x: W - BOX.w - 8, y: 8 },
  auditor: { x: 8, y: H - BOX.h - 8 },
  metamorphic: { x: W - BOX.w - 8, y: H - BOX.h - 8 },
}

/**
 * The oracles (ui-plan.md 7.3): why the results are credible. Four independent judges around one
 * answer, with the self-check's numbers (S0) on the ones it measures, from the run's summary.
 */
export function OraclesDiagram({ metrics, runId }: { metrics: SummaryMetric[]; runId: string }) {
  const numbers = (oracle: (typeof ORACLES)[number]) => oracleMetrics(oracle, metrics)
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full max-w-[44rem] text-foreground"
          style={{ minWidth: 480 }}
        >
          {ORACLES.map((oracle) => {
            const p = POSITIONS[oracle.id]
            const measured = numbers(oracle)
            const anchorX = p.x < CENTER.x ? p.x + BOX.w : p.x
            const anchorY = p.y + BOX.h / 2
            return (
              <g key={oracle.id} data-oracle={oracle.id}>
                <line
                  x1={anchorX}
                  y1={anchorY}
                  x2={CENTER.x}
                  y2={CENTER.y}
                  className="stroke-border"
                  strokeDasharray="3 3"
                />
                <rect
                  x={p.x}
                  y={p.y}
                  width={BOX.w}
                  height={BOX.h}
                  rx={8}
                  className="fill-card stroke-border"
                />
                <text x={p.x + 10} y={p.y + 20} className="fill-foreground text-[12px] font-medium">
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
              x={CENTER.x - 70}
              y={CENTER.y - 30}
              width={140}
              height={60}
              rx={30}
              className="fill-primary/10 stroke-primary"
            />
            <text
              x={CENTER.x}
              y={CENTER.y - 4}
              textAnchor="middle"
              className="fill-foreground text-[12px] font-medium"
            >
              one answer
            </text>
            <text
              x={CENTER.x}
              y={CENTER.y + 14}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              payload + trace
            </text>
          </g>
        </svg>
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
