// An arm plot (the UI-D2 plan; DESIGN.md 7): a value per arm on one horizontal scale, grouped,
// as a dot with its interval as a whisker or as a bar from zero, with a lighter bar behind it for
// a second value of the same unit, and a dashed reference rule. Arms are categories, not series:
// they carry no hue of their own, only their group's mark, and a label. React renders every node;
// arm-plot-geometry computed them. The picture is named by its title and summary, and the values
// sit in a table beside it, so nothing is read from the picture alone.

import { cn } from "cn"
import { useId, useMemo, type ReactNode } from "react"

import { useMeasure } from "@/hooks/use-measure"

import { armPlotLayout, type ArmPlotGroup, type ArmRow } from "./arm-plot-geometry"

const FALLBACK_WIDTH = 640

export type ArmTone = "accent" | "muted" | "outline"

/** Literal classes per tone (DESIGN.md 5: no class names built from data). */
const DOT: Record<ArmTone, string> = {
  accent: "fill-primary stroke-primary",
  muted: "fill-muted-foreground stroke-muted-foreground",
  outline: "fill-background stroke-muted-foreground",
}
const BAR: Record<ArmTone, string> = {
  accent: "fill-primary",
  muted: "fill-muted-foreground/70",
  outline: "fill-muted-foreground/30",
}

export type ArmPlotProps = {
  title: string
  /** The words a reader of the picture alone would need: what is plotted, from which run. */
  summary: string
  rows: readonly ArmRow[]
  groups: readonly (ArmPlotGroup & { tone: ArmTone })[]
  domain: readonly [number, number] | "auto"
  mark: "dot" | "bar"
  /** The value's text beside each row: "84.3%", "1,726 tokens". */
  format: (value: number) => string
  /** A tick's text on the axis. */
  formatTick?: (value: number) => string
  reference?: { value: number; label: string } | null
  /**
   * The legend's words for the mark, for the whisker (the interval as its record names it), and
   * for the backdrop bar when there is one.
   */
  legend: { mark: string; interval?: string; backdrop?: string }
  /** The table alternative, shown under a disclosure. */
  table: ReactNode
  tableOpen?: boolean
}

export function ArmPlot({
  title,
  summary,
  rows,
  groups,
  domain,
  mark,
  format,
  formatTick = format,
  reference,
  legend,
  table,
  tableOpen = false,
}: ArmPlotProps) {
  const id = useId()
  const { ref, width } = useMeasure<HTMLDivElement>()
  const layout = useMemo(
    () =>
      armPlotLayout({
        rows,
        groups,
        domain,
        width: width || FALLBACK_WIDTH,
        mark,
        reference: reference ?? null,
      }),
    [rows, groups, domain, width, mark, reference],
  )
  const tones = new Map(groups.map((group) => [group.id, group.tone]))
  const byId = new Map(rows.map((row) => [row.id, row]))
  const hasBackdrop = rows.some((row) => row.backdrop != null)
  const hasInterval = rows.some((row) => row.low != null && row.high != null)

  return (
    <figure className="space-y-2" data-chart="arm-plot">
      <div ref={ref} className="w-full">
        {layout ? (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            role="img"
            aria-labelledby={`${id}-title ${id}-summary`}
            className="max-w-full overflow-visible text-xs"
          >
            <title id={`${id}-title`}>{title}</title>
            <g aria-hidden="true">
              {layout.ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={layout.x(tick)}
                    x2={layout.x(tick)}
                    y1={layout.margin.top}
                    y2={layout.height - layout.margin.bottom}
                    className="stroke-border"
                  />
                  <text
                    x={layout.x(tick)}
                    y={layout.height - layout.margin.bottom + 16}
                    textAnchor="middle"
                    className="fill-muted-foreground tabular"
                  >
                    {formatTick(tick)}
                  </text>
                </g>
              ))}
              {layout.groups.map((group) => (
                <text
                  key={group.id}
                  x={0}
                  y={group.y}
                  className="fill-muted-foreground text-[11px] font-medium"
                >
                  {group.label}
                </text>
              ))}
              {layout.referenceX !== null && reference ? (
                <g>
                  <line
                    x1={layout.referenceX}
                    x2={layout.referenceX}
                    y1={layout.margin.top}
                    y2={layout.height - layout.margin.bottom}
                    strokeDasharray="4 3"
                    className="stroke-foreground/60"
                  />
                </g>
              ) : null}
              {layout.rows.map((laid) => {
                const row = byId.get(laid.id)
                const tone = tones.get(row?.group ?? "") ?? "muted"
                return (
                  <g key={laid.id} data-row={laid.id}>
                    <text
                      x={layout.margin.left - 8}
                      y={laid.y}
                      dy="0.32em"
                      textAnchor="end"
                      className="fill-foreground font-mono"
                    >
                      {laid.id}
                    </text>
                    {laid.backdrop !== null ? (
                      <rect
                        x={Math.min(laid.base, laid.backdrop)}
                        y={laid.y - 8}
                        width={Math.abs(laid.backdrop - laid.base)}
                        height={16}
                        rx={2}
                        className="fill-muted-foreground/15"
                      />
                    ) : null}
                    {mark === "bar" && laid.x !== null ? (
                      <rect
                        x={Math.min(laid.base, laid.x)}
                        y={laid.y - 6}
                        width={Math.max(Math.abs(laid.x - laid.base), 1)}
                        height={12}
                        rx={2}
                        className={BAR[tone]}
                      />
                    ) : null}
                    {laid.low !== null && laid.high !== null ? (
                      <g className={cn("stroke-foreground/70")}>
                        <line x1={laid.low} x2={laid.high} y1={laid.y} y2={laid.y} />
                        <line x1={laid.low} x2={laid.low} y1={laid.y - 4} y2={laid.y + 4} />
                        <line x1={laid.high} x2={laid.high} y1={laid.y - 4} y2={laid.y + 4} />
                      </g>
                    ) : null}
                    {mark === "dot" && laid.x !== null ? (
                      <circle
                        cx={laid.x}
                        cy={laid.y}
                        r={4.5}
                        strokeWidth={1.5}
                        className={DOT[tone]}
                      />
                    ) : null}
                    <text
                      x={layout.width - layout.margin.right + 8}
                      y={laid.y}
                      dy="0.32em"
                      className={cn(
                        "tabular",
                        laid.x === null ? "fill-muted-foreground" : "fill-foreground",
                      )}
                    >
                      {row && row.value != null && Number.isFinite(row.value)
                        ? format(row.value)
                        : "not measured"}
                    </text>
                  </g>
                )
              })}
              {layout.referenceX !== null && reference ? (
                <text
                  x={layout.referenceX + (layout.referenceAnchor === "end" ? -4 : 4)}
                  y={layout.height - layout.margin.bottom - 4}
                  textAnchor={layout.referenceAnchor}
                  className="fill-muted-foreground text-[11px]"
                >
                  {reference.label}
                </text>
              ) : null}
            </g>
          </svg>
        ) : (
          <p className="border border-dashed p-4 text-sm text-muted-foreground" data-state="empty">
            Nothing to plot.
          </p>
        )}
      </div>
      <figcaption id={`${id}-summary`} className="text-sm text-muted-foreground">
        {summary}
      </figcaption>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" width="14" height="10">
            {mark === "dot" ? (
              <circle cx="7" cy="5" r="4" className="fill-primary" />
            ) : (
              <rect x="0" y="1" width="14" height="8" rx="2" className="fill-primary" />
            )}
          </svg>
          {legend.mark}
        </li>
        {hasInterval ? (
          <li className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" width="14" height="10" className="stroke-foreground/70">
              <line x1="1" x2="13" y1="5" y2="5" />
              <line x1="1" x2="1" y1="1" y2="9" />
              <line x1="13" x2="13" y1="1" y2="9" />
            </svg>
            {legend.interval ?? "interval"}
          </li>
        ) : null}
        {hasBackdrop && legend.backdrop ? (
          <li className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" width="14" height="10">
              <rect
                x="0"
                y="0"
                width="14"
                height="10"
                rx="2"
                className="fill-muted-foreground/15"
              />
            </svg>
            {legend.backdrop}
          </li>
        ) : null}
        {reference ? (
          <li className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" width="14" height="10" className="stroke-foreground/60">
              <line x1="7" x2="7" y1="0" y2="10" strokeDasharray="3 2" />
            </svg>
            {reference.label}
          </li>
        ) : null}
      </ul>
      <details open={tableOpen} className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">The values as a table</summary>
        <div className="mt-2">{table}</div>
      </details>
    </figure>
  )
}
