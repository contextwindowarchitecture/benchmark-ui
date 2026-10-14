// Small multiples over a tier's size (the UI-D2 plan; DESIGN.md 7): one panel per arm, a rate
// against the corpus's size or the conversation's turn count on a log scale, the reference arm
// faint in every other panel. The
// panels are pictures hidden from assistive technology; the figure's caption says what they show
// and the table beside them holds every value.

import { useId, useMemo, type ReactNode } from "react"

import { useMeasure } from "@/hooks/use-measure"

import { tierLinesLayout, type TierSeries } from "./tier-lines-geometry"

const GAP = 12
const MIN_PANEL = 190
const PANEL_HEIGHT = 140

export type TierLinesProps = {
  title: string
  summary: string
  series: readonly TierSeries[]
  reference?: string | null
  /** A panel's heading: the arm's id, with its role. */
  panelLabel: (id: string) => ReactNode
  /** An axis tick's text: "×0.25". */
  formatTier: (tier: string) => string
  table: ReactNode
  tableOpen?: boolean
}

export function TierLines({
  title,
  summary,
  series,
  reference,
  panelLabel,
  formatTier,
  table,
  tableOpen = false,
}: TierLinesProps) {
  const id = useId()
  const { ref, width } = useMeasure<HTMLDivElement>()
  const columns = Math.max(1, Math.floor(((width || 640) + GAP) / (MIN_PANEL + GAP)))
  const panelWidth = Math.floor(((width || 640) - GAP * (columns - 1)) / columns)
  const layout = useMemo(
    () => tierLinesLayout({ series, reference, panelWidth, panelHeight: PANEL_HEIGHT }),
    [series, reference, panelWidth],
  )
  return (
    <figure className="space-y-2" data-chart="tier-lines" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className="sr-only">
        {title}
      </h4>
      <div
        ref={ref}
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {layout ? (
          layout.panels.map((panel) => (
            <div key={panel.id} className="min-w-0 space-y-1" data-panel={panel.id}>
              <div className="text-xs">{panelLabel(panel.id)}</div>
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${layout.panelWidth} ${layout.panelHeight}`}
                width={layout.panelWidth}
                height={layout.panelHeight}
                className="max-w-full overflow-visible text-[10px]"
              >
                {layout.yTicks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={layout.margin.left}
                      x2={layout.panelWidth - layout.margin.right}
                      y1={layout.y(tick)}
                      y2={layout.y(tick)}
                      className="stroke-border"
                    />
                    <text
                      x={layout.margin.left - 4}
                      y={layout.y(tick)}
                      dy="0.32em"
                      textAnchor="end"
                      className="fill-muted-foreground tabular"
                    >
                      {`${Math.round(tick * 100)}%`}
                    </text>
                  </g>
                ))}
                {layout.ticks.map((tick) => (
                  <text
                    key={tick.tier}
                    x={tick.x}
                    y={layout.panelHeight - layout.margin.bottom + 14}
                    textAnchor="middle"
                    className="fill-muted-foreground tabular"
                  >
                    {formatTier(tick.tier)}
                  </text>
                ))}
                {panel.reference ? (
                  <path
                    d={panel.reference}
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    className="fill-none stroke-muted-foreground/50"
                  />
                ) : null}
                {panel.path ? (
                  <path d={panel.path} strokeWidth={2} className="fill-none stroke-primary" />
                ) : null}
                {panel.points.map((point) => (
                  <circle
                    key={point.tier}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    className="fill-primary"
                  />
                ))}
              </svg>
            </div>
          ))
        ) : (
          <p className="border border-dashed p-4 text-sm text-muted-foreground" data-state="empty">
            Nothing to plot.
          </p>
        )}
      </div>
      <figcaption className="text-sm text-muted-foreground">{summary}</figcaption>
      <details open={tableOpen} className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">The values as a table</summary>
        <div className="mt-2">{table}</div>
      </details>
    </figure>
  )
}
