// The scaling plots (ui-plan.md 8.7, 10; DESIGN.md 7): one log-log panel per shape, every adapter
// a series in its fixed identity (color and symbol), each fit's points as marks and, over at least
// the profile's minimum of points, the fitted line with the harness's slope. Beside every panel,
// each fit's exponent ± standard error, r² and the points it used, as text; under the panels, a
// table of every fit. React renders; D3 computed the scales.

import { useId, useMemo } from "react"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
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
import { MIN_FIT_POINTS } from "@/data/budgets"
import { fitLine, type ScalingPanel } from "@/features/d1/model/perf"
import { useMeasure } from "@/hooks/use-measure"
import { ADAPTERS, adapterLabel, isAdapterId } from "@/lib/adapters"
import { formatCount, formatExponent, formatMs } from "@/lib/format"

import { logLayout, sharedDomains, type LogLayout } from "./loglog-geometry"

const PANEL_HEIGHT = 220
const MIN_PANEL = 260

function colorClass(adapter: string, kind: "stroke" | "fill"): string {
  if (!isAdapterId(adapter)) return `${kind}-foreground`
  return kind === "stroke" ? ADAPTERS[adapter].strokeClass : ADAPTERS[adapter].fillClass
}

function Mark({ adapter, x, y }: { adapter: string; x: number; y: number }) {
  const symbol = isAdapterId(adapter) ? ADAPTERS[adapter].symbol : "circle"
  const cls = colorClass(adapter, "fill")
  switch (symbol) {
    case "square":
      return <rect x={x - 3.5} y={y - 3.5} width={7} height={7} className={cls} />
    case "triangle":
      return (
        <path d={`M${x},${y - 4.5}L${x + 4.5},${y + 3.5}L${x - 4.5},${y + 3.5}Z`} className={cls} />
      )
    case "diamond":
      return (
        <path
          d={`M${x},${y - 4.5}L${x + 4.5},${y}L${x},${y + 4.5}L${x - 4.5},${y}Z`}
          className={cls}
        />
      )
    default:
      return <circle cx={x} cy={y} r={3.5} className={cls} />
  }
}

export function ScalingPlots({
  panels,
  variable,
  method,
}: {
  panels: readonly ScalingPanel[]
  /** What x is: candidates, or candidate tokens. */
  variable: "candidates" | "tokens"
  /** The timing method's words, for the y axis. */
  method: string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const columns = Math.max(1, Math.min(4, Math.floor((width || 960) / MIN_PANEL)))
  const panelWidth = Math.max(((width || 960) - (columns - 1) * 16) / columns, 200)
  const domains = useMemo(
    () =>
      sharedDomains(
        panels.flatMap((panel) => panel.series.flatMap((s) => s.points.map((p) => p.x))),
        panels.flatMap((panel) => panel.series.flatMap((s) => s.points.map((p) => p.y))),
      ),
    [panels],
  )
  const layout = domains ? logLayout(domains, panelWidth, PANEL_HEIGHT) : null

  return (
    <div className="space-y-4" data-chart="scaling">
      <div
        ref={ref}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {panels.map((panel) => (
          <Panel
            key={panel.shape}
            panel={panel}
            layout={layout}
            variable={variable}
            method={method}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Log-log axes shared by every panel. Each line has the harness&apos;s fitted slope through
        the mean of its points in log space; a fit over fewer than {MIN_FIT_POINTS} points is drawn
        as points alone. Times are the cells&apos; p50s.
      </p>
      <FitsTable panels={panels} />
    </div>
  )
}

function Panel({
  panel,
  layout,
  variable,
  method,
}: {
  panel: ScalingPanel
  layout: LogLayout | null
  variable: "candidates" | "tokens"
  method: string
}) {
  const id = useId()
  const words = panel.series
    .map(
      (s) =>
        `${adapterLabel(s.adapter)} ${s.fit.exponent === null ? "no exponent" : `exponent ${formatExponent(s.fit.exponent, s.fit.standard_error)}`}${s.fit.r2 === null ? "" : `, r² ${s.fit.r2.toFixed(2)}`}, ${formatCount(s.fit.points)} points`,
    )
    .join("; ")
  return (
    <figure className="min-w-0 space-y-1 border p-2" data-panel={panel.shape}>
      <figcaption id={`${id}-caption`} className="text-sm font-medium">
        {panel.shape}
      </figcaption>
      {layout ? (
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          className="block h-auto max-w-full text-foreground"
          role="img"
          aria-labelledby={`${id}-caption ${id}-words`}
        >
          <g className="text-[10px]" aria-hidden="true">
            {layout.yTicks.map((tick) => (
              <g key={`y${tick}`} transform={`translate(0,${layout.y(tick)})`}>
                <line
                  x1={layout.margin.left}
                  x2={layout.width - layout.margin.right}
                  className="stroke-border"
                />
                <text
                  x={layout.margin.left - 4}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground tabular"
                >
                  {formatMs(tick)}
                </text>
              </g>
            ))}
            {layout.xTicks.map((tick) => (
              <g key={`x${tick}`} transform={`translate(${layout.x(tick)},0)`}>
                <line
                  y1={layout.height - layout.margin.bottom}
                  y2={layout.height - layout.margin.bottom + 3}
                  className="stroke-border"
                />
                <text
                  y={layout.height - layout.margin.bottom + 13}
                  textAnchor="middle"
                  className="fill-muted-foreground tabular"
                >
                  {formatCount(tick)}
                </text>
              </g>
            ))}
            <text
              x={layout.width - layout.margin.right}
              y={layout.height - 2}
              textAnchor="end"
              className="fill-muted-foreground"
            >
              {variable === "tokens" ? "candidate tokens" : "candidates"}
            </text>
            <text
              transform={`translate(10,${layout.margin.top}) rotate(-90)`}
              textAnchor="end"
              className="fill-muted-foreground"
            >
              p50, {method}
            </text>
          </g>
          {panel.series.map((s) => {
            const line =
              s.points.length >= MIN_FIT_POINTS ? fitLine(s.points, s.fit.exponent) : null
            return (
              <g key={s.adapter} data-series={s.adapter} data-points={s.points.length}>
                {line ? (
                  <line
                    x1={layout.x(line.x0)}
                    y1={layout.y(line.y0)}
                    x2={layout.x(line.x1)}
                    y2={layout.y(line.y1)}
                    className={`stroke-[1.5] ${colorClass(s.adapter, "stroke")}`}
                    data-fit-line
                  />
                ) : null}
                {s.points.map((p) => (
                  <Mark key={p.x} adapter={s.adapter} x={layout.x(p.x)} y={layout.y(p.y)} />
                ))}
              </g>
            )
          })}
        </svg>
      ) : (
        <p className="text-xs text-muted-foreground">No point to place.</p>
      )}
      <ul className="space-y-0.5 text-xs" aria-hidden="true">
        {panel.series.map((s) => (
          <li key={s.adapter} className="flex flex-wrap items-center gap-x-1.5">
            <AdapterMark adapter={s.adapter} symbolOnly />
            <span className="tabular">
              {s.fit.exponent === null
                ? "no exponent"
                : formatExponent(s.fit.exponent, s.fit.standard_error)}
            </span>
            {s.fit.r2 !== null ? (
              <span className="text-muted-foreground">r² {s.fit.r2.toFixed(2)}</span>
            ) : null}
            <span className="text-muted-foreground">
              {formatCount(s.fit.points)} pts
              {s.fit.points < MIN_FIT_POINTS ? " (under the minimum)" : ""}
              {s.points.length !== s.fit.points
                ? `, ${formatCount(s.points.length)} in this file`
                : ""}
            </span>
          </li>
        ))}
      </ul>
      <span id={`${id}-words`} className="sr-only">
        {words}
      </span>
    </figure>
  )
}

function FitsTable({ panels }: { panels: readonly ScalingPanel[] }) {
  return (
    <details>
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Every fit and its points as a table
      </summary>
      <div className="mt-2 max-h-96 overflow-y-auto">
        <TableRegion label="Scaling fits table">
          <Table>
            <TableCaption className="sr-only">
              One row per shape and adapter: the exponent with its standard error, r², the points
              the fit used, and each point&apos;s size and p50.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Shape</TableHead>
                <TableHead>Adapter</TableHead>
                <TableHead className="text-right">Exponent</TableHead>
                <TableHead className="text-right">r²</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Points (x: p50)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.flatMap((panel) =>
                panel.series.map((s) => (
                  <TableRow key={`${panel.shape}|${s.adapter}`}>
                    <TableCell className="text-xs">{panel.shape}</TableCell>
                    <TableCell>
                      <AdapterMark adapter={s.adapter} />
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {s.fit.exponent === null
                        ? "—"
                        : formatExponent(s.fit.exponent, s.fit.standard_error)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {s.fit.r2 === null ? "—" : s.fit.r2.toFixed(2)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatCount(s.fit.points)}
                    </TableCell>
                    <TableCell className="tabular text-xs">
                      {s.points.map((p) => `${formatCount(p.x)}: ${formatMs(p.y)}`).join(" · ")}
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </TableRegion>
      </div>
    </details>
  )
}
