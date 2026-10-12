// The item strip (ui-plan.md 9.2, 10): every item of a sweep as a row on the budget axis, grouped
// by tier in shedding order, its frames drawn as segments (solid while included whole, hatched
// while included as a variant), its slot's plane as the hue. At the current frame the items the
// frame kept are full strength and the rest dimmed, under a cursor. React renders every node from
// the frame index; D3 computed the scale; nothing here animates, so a scrub is a re-render. A
// table of every item, with its state at the frame, is the text alternative.

import { useId, useMemo } from "react"

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
import { PLANES, planeOf } from "@/content"
import {
  frameCounts,
  ITEM_STATE,
  stateAt,
  type AdapterFrames,
  type SweepItem,
} from "@/features/d1/model/sweep-frames"
import { useMeasure } from "@/hooks/use-measure"
import { formatCount } from "@/lib/format"

import { planeOfSlot, STRIP_ROW, stripLayout } from "./item-strip-geometry"

const FALLBACK_WIDTH = 640
/** Past this height the strip scrolls in place rather than pushing the page. */
const MAX_HEIGHT = 520

const PLANE_FILL: Record<string, string> = {
  governance: "fill-plane-governance",
  state: "fill-plane-state",
  evidence: "fill-plane-evidence",
  interaction: "fill-plane-interaction",
}
const PLANE_STROKE: Record<string, string> = {
  governance: "stroke-plane-governance",
  state: "stroke-plane-state",
  evidence: "stroke-plane-evidence",
  interaction: "stroke-plane-interaction",
}
const OTHER = "other"

const STATE_WORDS: Record<number, string> = {
  [ITEM_STATE.absent]: "not in this frame",
  [ITEM_STATE.whole]: "included whole",
  [ITEM_STATE.variant]: "included as a variant",
  [ITEM_STATE.omitted]: "omitted",
}

function planeKey(slot: string | null): string {
  const plane = planeOfSlot(slot)
  return plane && plane in PLANE_FILL ? plane : OTHER
}

export type ItemStripProps = {
  items: readonly SweepItem[]
  frames: AdapterFrames
  full: number
  /** The current frame, by index into the adapter's frames. */
  frame: number
  /** Whose frames these are, for the words. */
  adapterLabel: string
}

export function ItemStrip({ items, frames, full, frame, adapterLabel }: ItemStripProps) {
  const id = `strip${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const { ref, width } = useMeasure<HTMLDivElement>()
  const layout = useMemo(
    () => stripLayout({ items, frames, full, width: Math.max(width || FALLBACK_WIDTH, 360) }),
    [items, frames, full, width],
  )
  const count = items.length
  const budget = frames.budgets[frame]
  const counts = frameCounts(frames, count, frame)
  const variantAt = useMemo(() => new Map(frames.variants[frame] ?? []), [frames, frame])
  const planes = useMemo(() => {
    const present = new Set(items.map((item) => planeKey(item.slot)))
    return [...PLANES.map((plane) => plane.id as string), OTHER].filter((plane) =>
      present.has(plane),
    )
  }, [items])

  const summary =
    budget === undefined
      ? `${formatCount(count)} items; no frame selected.`
      : `${formatCount(count)} items over ${formatCount(frames.budgets.length)} frames of ${adapterLabel}. At budget ${formatCount(budget)}: ${formatCount(counts.whole)} included whole, ${formatCount(counts.variant)} as a variant, ${formatCount(counts.omitted)} omitted.`

  return (
    <div className="space-y-3" data-chart="item-strip" data-frame={frame}>
      <p id={`${id}-summary`} className="text-sm text-muted-foreground">
        {summary}
      </p>
      {/* A scrolling area is reachable from the keyboard (DESIGN.md 10), as a table region is. */}
      <div
        ref={ref}
        className="w-full overflow-y-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        style={{ maxHeight: MAX_HEIGHT }}
        role="region"
        aria-label="Item strip"
        tabIndex={0}
      >
        {layout ? (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            className="block h-auto max-w-full text-foreground"
            role="img"
            aria-labelledby={`${id}-title ${id}-summary`}
          >
            <title id={`${id}-title`}>Items kept at each budget</title>
            <defs>
              {planes.map((plane) => (
                <pattern
                  key={plane}
                  id={`${id}-hatch-${plane}`}
                  width={4}
                  height={4}
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect
                    width={4}
                    height={4}
                    className={PLANE_FILL[plane] ?? "fill-muted-foreground"}
                    opacity={0.3}
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={4}
                    strokeWidth={2}
                    className={PLANE_STROKE[plane] ?? "stroke-muted-foreground"}
                  />
                </pattern>
              ))}
            </defs>
            <g className="text-[11px]" aria-hidden="true">
              {layout.xTicks.map((tick) => (
                <g key={tick} transform={`translate(${layout.x(tick)},0)`}>
                  <line
                    y1={layout.margin.top}
                    y2={layout.height - layout.margin.bottom}
                    className="stroke-border"
                    strokeDasharray="1 3"
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
            </g>
            {layout.groups.map((group) => (
              <g key={group.tier} data-tier={group.tier}>
                <text
                  x={4}
                  y={group.y + 13}
                  className="fill-muted-foreground text-[11px] font-medium"
                  aria-hidden="true"
                >
                  {group.tier}
                </text>
                {group.rows.map((row) => {
                  const state = stateAt(frames, count, frame, row.index)
                  const kept = state === ITEM_STATE.whole || state === ITEM_STATE.variant
                  const plane = planeKey(row.item.slot)
                  return (
                    <g
                      key={row.item.id}
                      data-item={row.item.id}
                      data-state={state}
                      opacity={kept ? 1 : 0.35}
                    >
                      <text
                        x={layout.margin.left - 6}
                        y={row.y + STRIP_ROW - 1}
                        textAnchor="end"
                        className="fill-foreground font-mono text-[10px]"
                        aria-hidden="true"
                      >
                        {row.item.id.length > 16 ? `${row.item.id.slice(0, 15)}…` : row.item.id}
                      </text>
                      {row.segments.map((segment) => (
                        <rect
                          key={segment.from}
                          x={Math.min(segment.x0, segment.x1)}
                          y={row.y}
                          width={Math.max(Math.abs(segment.x1 - segment.x0), 1)}
                          height={STRIP_ROW}
                          className={
                            segment.state === ITEM_STATE.whole
                              ? (PLANE_FILL[plane] ?? "fill-muted-foreground")
                              : undefined
                          }
                          fill={
                            segment.state === ITEM_STATE.variant
                              ? `url(#${id}-hatch-${plane})`
                              : undefined
                          }
                        >
                          <title>
                            {`${row.item.id} (${row.item.slot ?? "no slot"}): ${segment.state === ITEM_STATE.whole ? "whole" : `as ${segment.variant ?? "a variant"}`} from budget ${formatCount(frames.budgets[segment.from] ?? 0)}`}
                          </title>
                        </rect>
                      ))}
                    </g>
                  )
                })}
              </g>
            ))}
            {budget !== undefined ? (
              <line
                data-cursor={frame}
                x1={layout.x(budget)}
                x2={layout.x(budget)}
                y1={layout.margin.top}
                y2={layout.height - layout.margin.bottom}
                className="stroke-foreground"
              />
            ) : null}
          </svg>
        ) : (
          <p className="text-sm text-muted-foreground" data-state="empty">
            {count === 0 ? "This sweep names no items." : `${adapterLabel} has no frames.`}
          </p>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {planes.map((plane) => (
          <li key={plane} className="flex items-center gap-1.5">
            <svg width={12} height={12} aria-hidden="true">
              <rect
                width={12}
                height={12}
                className={PLANE_FILL[plane] ?? "fill-muted-foreground"}
              />
            </svg>
            {plane === OTHER ? "no plane" : (planeOf(plane)?.name ?? plane)}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          {/* A neutral hatch: the legend names the pattern, the planes name the hues. */}
          <svg width={12} height={12} aria-hidden="true">
            <rect width={12} height={12} className="fill-muted-foreground" opacity={0.25} />
            <path
              d="M-3,3 l6,-6 M0,12 l12,-12 M9,15 l6,-6"
              strokeWidth={2}
              className="stroke-muted-foreground"
            />
          </svg>
          hatched: included as a variant (compressed)
        </li>
        <li>dimmed: not kept at the current frame</li>
      </ul>
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Every item as a table
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto">
          <TableRegion label="Sweep items table">
            <Table>
              <TableCaption className="sr-only">
                One row per item in shedding order: its slot and tier, the budget at which it was
                first compressed and first omitted, and its state at the current frame.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">First compressed</TableHead>
                  <TableHead className="text-right">First omitted</TableHead>
                  <TableHead>At this frame</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const state = stateAt(frames, count, frame, index)
                  const variant = variantAt.get(index)
                  return (
                    <TableRow key={item.id} data-item-row={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="text-xs">{item.slot ?? "—"}</TableCell>
                      <TableCell className="text-xs">{item.tier ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {item.firstCompressedAt === null
                          ? "—"
                          : formatCount(item.firstCompressedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.firstOmittedAt === null ? "—" : formatCount(item.firstOmittedAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {STATE_WORDS[state]}
                        {variant ? <span className="font-mono"> {variant}</span> : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableRegion>
        </div>
      </details>
    </div>
  )
}
