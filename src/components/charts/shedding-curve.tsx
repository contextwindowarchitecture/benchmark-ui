// The shedding curve (ui-plan.md 9.2, 10): a budget sweep as a stepped line of charged tokens
// against a shrinking budget, with rules at the protected size, the floor and the refusal
// threshold, the refused region shaded and named, and a table of every frame as its alternative.
// React renders every node; D3 computed the geometry; GSAP draws the line once per session when
// the page asks for a reveal (DESIGN.md 3.4, 4.5), and never under reduced motion.

import { useId, useMemo, useRef } from "react"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { Outcome } from "@/components/dashboard/outcome"
import { StatusBadge } from "@/components/dashboard/status-badge"
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
import type { CurvePoint, SweepSummary } from "@/features/d1/model/sweep-curve"
import { useMeasure } from "@/hooks/use-measure"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { ADAPTERS, adapterLabel, isAdapterId } from "@/lib/adapters"
import { formatCount } from "@/lib/format"
import { gsap, MOTION, useGSAP } from "@/lib/motion"

import { curveLayout, shownSeries, type CurveSeries } from "./shedding-geometry"

const HEIGHT = 280
const FALLBACK_WIDTH = 640

export type SheddingCurveProps = {
  summary: SweepSummary
  /** Draw the line once, now; the parent marks the reveal done when it has run or was declined. */
  reveal?: boolean
  onRevealed?: () => void
  /** The frame to mark with a cursor, by index into the shown series; none by default. */
  cursor?: number
  /** Whether to show the frames table open; closed by default. */
  tableOpen?: boolean
}

function strokeClass(adapter: string, alone: boolean): string {
  if (alone) return "stroke-primary"
  return isAdapterId(adapter) ? `stroke-${ADAPTERS[adapter].textClass.slice(5)}` : "stroke-primary"
}

export function SheddingCurve({
  summary,
  reveal = false,
  onRevealed,
  cursor,
  tableOpen = false,
}: SheddingCurveProps) {
  const id = useId()
  const { ref, width } = useMeasure<HTMLDivElement>()
  const rootRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const reduced = useReducedMotion()
  const series = useMemo(() => shownSeries(summary), [summary])
  const layout = useMemo(
    () =>
      curveLayout({
        series,
        full: summary.full,
        protected: summary.protected,
        floor: summary.floor,
        threshold: summary.threshold,
        width: width || FALLBACK_WIDTH,
        height: HEIGHT,
      }),
    [series, summary.full, summary.protected, summary.floor, summary.threshold, width],
  )
  const first = series[0]
  const firstPath = layout?.series[0]?.d ?? null
  const adapters = summary.curves.length
  const frames = first?.points.length ?? 0
  const refusedReason = layout?.refused?.reason ?? null

  useGSAP(
    () => {
      const node = pathRef.current
      if (!reveal) return
      if (reduced || !node || !firstPath || typeof node.getTotalLength !== "function") {
        onRevealed?.()
        return
      }
      const length = node.getTotalLength()
      if (!(length > 0)) {
        onRevealed?.()
        return
      }
      gsap.fromTo(
        node,
        { strokeDasharray: length, strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          duration: MOTION.emphasis,
          ease: "power1.out",
          onComplete: () => {
            gsap.set(node, { clearProps: "strokeDasharray,strokeDashoffset" })
            onRevealed?.()
          },
        },
      )
    },
    { scope: rootRef, dependencies: [reveal, reduced, firstPath], revertOnUpdate: true },
  )

  const summaryText = first
    ? `${summary.cell.shape}, ${formatCount(summary.cell.candidates)} candidates of ${formatCount(summary.cell.candidate_tokens)} tokens: charged tokens against a budget shrinking from ${formatCount(summary.full)} over ${formatCount(frames)} frames${summary.threshold !== null ? `, refusing below ${formatCount(summary.threshold)}` : ""}; protected size ${formatCount(summary.protected)}${summary.floor !== null ? `, floor ${formatCount(summary.floor)}` : ""}. ${summary.agree ? `${formatCount(adapters)} of ${formatCount(adapters)} adapters agree frame for frame; ${adapterLabel(first.adapter)}'s frames are shown.` : "The adapters disagree; every adapter's frames are shown."}`
    : "No frames."

  return (
    <div ref={rootRef} className="space-y-3" data-chart="shedding-curve">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {summary.agree ? (
          <StatusBadge status="pass" label={`${adapters} of ${adapters} agree`} />
        ) : (
          <StatusBadge status="warning" label="adapters disagree" />
        )}
        {series.map((s) => (
          <AdapterMark key={s.adapter} adapter={s.adapter} />
        ))}
        <span>
          {formatCount(frames)} frames · step {summary.stepPercent}% · from run{" "}
          <span className="font-mono">{summary.runId}</span>
        </span>
      </div>
      <p id={`${id}-summary`} className="text-sm text-muted-foreground">
        {summaryText}
      </p>
      <div ref={ref} className="w-full">
        {layout ? (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            className="block h-auto max-w-full text-foreground"
            role="img"
            aria-labelledby={`${id}-title ${id}-summary`}
          >
            <title id={`${id}-title`}>Shedding curve of {summary.cell.shape}</title>
            {layout.refused ? (
              <g data-region="refused">
                <rect
                  x={Math.min(layout.refused.x0, layout.refused.x1)}
                  y={layout.margin.top}
                  width={Math.abs(layout.refused.x1 - layout.refused.x0)}
                  height={layout.height - layout.margin.top - layout.margin.bottom}
                  className="fill-failure/10"
                />
                <text
                  x={Math.min(layout.refused.x0, layout.refused.x1) + 6}
                  y={layout.margin.top + 14}
                  className="fill-failure text-[11px]"
                >
                  refused{layout.refused.reason ? `: ${layout.refused.reason}` : ""}
                </text>
              </g>
            ) : null}
            <g className="text-[11px]" aria-hidden="true">
              {layout.yTicks.map((tick) => (
                <g key={`y${tick}`} transform={`translate(0,${layout.y(tick)})`}>
                  <line
                    x1={layout.margin.left}
                    x2={layout.width - layout.margin.right}
                    className="stroke-border"
                  />
                  <text
                    x={layout.margin.left - 8}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-muted-foreground tabular"
                  >
                    {formatCount(tick)}
                  </text>
                </g>
              ))}
              {layout.xTicks.map((tick) => (
                <g key={`x${tick}`} transform={`translate(${layout.x(tick)},0)`}>
                  <line
                    y1={layout.height - layout.margin.bottom}
                    y2={layout.height - layout.margin.bottom + 4}
                    className="stroke-border"
                  />
                  <text
                    y={layout.height - layout.margin.bottom + 16}
                    textAnchor="middle"
                    className="fill-muted-foreground tabular"
                  >
                    {formatCount(tick)}
                  </text>
                </g>
              ))}
              <text
                x={layout.width - layout.margin.right}
                y={layout.height - 4}
                textAnchor="end"
                className="fill-muted-foreground"
              >
                budget, tokens (shrinking →)
              </text>
              <text
                transform={`translate(12,${layout.margin.top}) rotate(-90)`}
                textAnchor="end"
                className="fill-muted-foreground"
              >
                charged tokens
              </text>
            </g>
            {layout.protectedY !== null ? (
              <g data-rule="protected">
                <line
                  x1={layout.margin.left}
                  x2={layout.width - layout.margin.right}
                  y1={layout.protectedY}
                  y2={layout.protectedY}
                  className="stroke-warning"
                  strokeDasharray="4 3"
                />
                <text
                  x={layout.width - layout.margin.right}
                  y={layout.protectedY - 4}
                  textAnchor="end"
                  className="fill-warning text-[11px]"
                >
                  protected {formatCount(summary.protected)}
                </text>
              </g>
            ) : null}
            {layout.floorY !== null && summary.floor !== null ? (
              <g data-rule="floor">
                <line
                  x1={layout.margin.left}
                  x2={layout.width - layout.margin.right}
                  y1={layout.floorY}
                  y2={layout.floorY}
                  className="stroke-info"
                  strokeDasharray="2 3"
                />
                <text
                  x={layout.margin.left + 4}
                  y={layout.floorY - 4}
                  className="fill-info text-[11px]"
                >
                  floor {formatCount(summary.floor)}
                </text>
              </g>
            ) : null}
            {layout.thresholdX !== null && summary.threshold !== null ? (
              <g data-rule="threshold">
                <line
                  x1={layout.thresholdX}
                  x2={layout.thresholdX}
                  y1={layout.margin.top}
                  y2={layout.height - layout.margin.bottom}
                  className="stroke-failure"
                  strokeDasharray="4 3"
                />
                <text
                  x={layout.thresholdX - 4}
                  y={layout.height - layout.margin.bottom - 6}
                  textAnchor="end"
                  className="fill-failure text-[11px]"
                >
                  threshold {formatCount(summary.threshold)}
                </text>
              </g>
            ) : null}
            {layout.series.map((s, i) => (
              <g key={s.adapter} data-series={s.adapter}>
                {s.d ? (
                  <path
                    ref={i === 0 ? pathRef : undefined}
                    d={s.d}
                    className={`fill-none stroke-2 ${strokeClass(s.adapter, layout.series.length === 1)}`}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
                {s.point ? (
                  <circle
                    cx={s.point.x}
                    cy={s.point.y}
                    r={3.5}
                    className={strokeClass(s.adapter, layout.series.length === 1).replace(
                      "stroke-",
                      "fill-",
                    )}
                  />
                ) : null}
                {s.coarse.map((cx, j) => (
                  <line
                    key={j}
                    x1={cx}
                    x2={cx}
                    y1={layout.height - layout.margin.bottom}
                    y2={layout.height - layout.margin.bottom - 6}
                    className="stroke-muted-foreground"
                  />
                ))}
              </g>
            ))}
            {cursor !== undefined && first?.points[cursor] ? (
              <line
                data-cursor={cursor}
                x1={layout.x(first.points[cursor].budget)}
                x2={layout.x(first.points[cursor].budget)}
                y1={layout.margin.top}
                y2={layout.height - layout.margin.bottom}
                className="stroke-foreground"
              />
            ) : null}
          </svg>
        ) : (
          <p className="text-sm text-muted-foreground" data-state="empty">
            This sweep has no frames.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The line steps: each frame is a real assembly at that budget, and the value holds until the
        next frame. Short ticks on the axis mark frames the harness calls coarser steps.
        {refusedReason ? ` Past the threshold the assembler refuses with ${refusedReason}.` : ""}
      </p>
      <details open={tableOpen}>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Every frame as a table
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto">
          <FramesTable series={series} />
        </div>
      </details>
    </div>
  )
}

function FramesTable({ series }: { series: readonly CurveSeries[] }) {
  return (
    <TableRegion label="Sweep frames table">
      <Table>
        <TableCaption className="sr-only">
          One row per frame per adapter: budget, outcome, charged tokens, items included, compressed
          and omitted, and whether the step is exact.
        </TableCaption>
        <TableHeader>
          <TableRow>
            {series.length > 1 ? <TableHead>Adapter</TableHead> : null}
            <TableHead className="text-right">Budget</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead className="text-right">Charged</TableHead>
            <TableHead className="text-right">Included</TableHead>
            <TableHead className="text-right">Compressed</TableHead>
            <TableHead className="text-right">Omitted</TableHead>
            <TableHead>Step</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {series.flatMap((s) =>
            s.points.map((point: CurvePoint, i) => (
              <TableRow key={`${s.adapter}:${i}`} data-frame={i}>
                {series.length > 1 ? (
                  <TableCell>
                    <AdapterMark adapter={s.adapter} />
                  </TableCell>
                ) : null}
                <TableCell className="text-right">{formatCount(point.budget)}</TableCell>
                <TableCell>
                  <Outcome value={point.outcome} />
                  {point.refusalReason ? (
                    <span className="text-xs text-muted-foreground"> {point.refusalReason}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  {point.charged === null ? "—" : formatCount(point.charged)}
                </TableCell>
                <TableCell className="text-right">{formatCount(point.included)}</TableCell>
                <TableCell className="text-right">{formatCount(point.compressed)}</TableCell>
                <TableCell className="text-right">{formatCount(point.omitted)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {point.exactStep ? "exact" : "coarse"}
                </TableCell>
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
