// The shedding viewer (ui-plan.md 9): one budget sweep replayed frame by frame. The frame index is
// the one piece of state every view renders from: the curve's cursor, the item strip's dimming,
// the lanes of the frame's timeline (or the nearest frame that has one, said) and the counters,
// which are text and always shown. The slider, the step buttons and the keyboard move it; playing
// moves it with a GSAP clock (use-frame-player). The URL keeps the frame, the adapter and the view.

import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from "lucide-react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"

import { ItemStrip } from "@/components/charts/item-strip"
import { SheddingCurve } from "@/components/charts/shedding-curve"
import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { Outcome } from "@/components/dashboard/outcome"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { documentOf, useRunDocuments } from "@/data/queries"
import type { RunIndexV1 } from "@/data/schema/generated"
import type { SweepFramesHandle } from "@/data/use-sweep"
import type { SweepSummary } from "@/features/d1/model/sweep-curve"
import { adapterTimelines, nearestTimeline, placeTimelines } from "@/features/d1/model/sweep-frames"
import { viewerParams, type ViewerView } from "@/features/d1/model/url"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { adapterLabel, orderAdapters } from "@/lib/adapters"
import { formatCount } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { FrameLanes } from "./frame-lanes"
import { useFramePlayer } from "./use-frame-player"

/** How long the URL waits for the frame to settle before following it. */
const URL_DEBOUNCE_MS = 250

const VIEW_LABELS: Record<ViewerView, string> = {
  curve: "Curve",
  items: "Items",
  lanes: "Lanes",
}

export type SweepViewerProps = {
  runId: string
  summary: SweepSummary
  frames: SweepFramesHandle
  runIndex: RunIndexV1
}

export function SweepViewer({ runId, summary, frames, runIndex }: SweepViewerProps) {
  const id = useId()
  const [url, setUrl] = useUrlState(viewerParams)
  const reduced = useReducedMotion()
  const scope = useRef<HTMLDivElement>(null)

  const adapters = useMemo(
    () => orderAdapters(summary.curves.map((curve) => curve.adapter)),
    [summary.curves],
  )
  const adapter =
    url.adapter && adapters.includes(url.adapter)
      ? url.adapter
      : adapters.includes(summary.sheddingFrom)
        ? summary.sheddingFrom
        : (adapters[0] ?? "")
  const curve = summary.curves.find((entry) => entry.adapter === adapter)
  const points = useMemo(() => curve?.points ?? [], [curve])
  const count = points.length
  const last = Math.max(count - 1, 0)
  const initial = url.frame ?? (reduced ? last : 0)
  const [frameState, setFrameState] = useState(initial)
  const frame = Math.min(Math.max(frameState, 0), last)
  const onFrame = useCallback((next: number) => setFrameState(next), [])
  const player = useFramePlayer({ scope, count, frame, onFrame, reduced })

  // The URL follows the frame once it settles, and only once it differs from what the URL says.
  const urlFrame = url.frame
  useEffect(() => {
    if (urlFrame === frame || (urlFrame === undefined && frame === initial)) return
    const timer = setTimeout(() => setUrl({ frame }), URL_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [frame, urlFrame, initial, setUrl])

  const view: ViewerView = url.view ?? "curve"
  const second: "items" | "lanes" = view === "lanes" ? "lanes" : "items"
  const point = points[frame]
  const adapterFrames =
    frames.status === "ready"
      ? frames.frames.adapters.find((entry) => entry.adapter === adapter)
      : undefined

  const listed = useMemo(() => new Set(runIndex.files.map((file) => file.path)), [runIndex])
  const timelinePaths = useMemo(
    () => adapterTimelines(summary.timelines, adapter).filter((path) => listed.has(path)),
    [summary.timelines, adapter, listed],
  )
  const timelineQueries = useRunDocuments(runId, timelinePaths, "timeline")
  const timelines = timelinePaths.flatMap((path, i) => {
    const document = documentOf(timelineQueries[i]?.data)
    return document ? [{ path, document }] : []
  })
  const timelinesPending = timelineQueries.some((query) => query.isPending)
  const timelinesFailed = timelineQueries.filter(
    (query) => query.isError || (query.data !== undefined && !query.data.ok),
  ).length
  const placed = placeTimelines(
    points.map((p) => p.budget),
    timelines.map(({ path, document }) => ({ path, budget: document.counters.budget_input })),
  )
  const near = nearestTimeline(placed, frame)
  const nearDocument = near ? timelines.find((t) => t.path === near.path)?.document : undefined

  const mispredicted = adapterFrames?.mispredicted[frame] ?? false
  const auditFailed = adapterFrames?.auditFailed[frame] ?? []
  const stepText = point
    ? `Frame ${formatCount(frame + 1)} of ${formatCount(count)}: budget ${formatCount(point.budget)}, ${point.outcome}${point.refusalReason ? ` (${point.refusalReason})` : ""}`
    : "No frames"

  const onSliderKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === " " && !reduced) {
      event.preventDefault()
      player.toggle()
    }
  }

  return (
    <div ref={scope} className="space-y-4" data-viewer data-frame={frame} data-adapter={adapter}>
      <div
        className="sticky top-14 z-10 -mx-4 space-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
        role="group"
        aria-label="Sweep playback"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="To the first frame"
            onClick={() => player.seek(0)}
            disabled={count === 0}
          >
            <SkipBack aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Step back"
            onClick={() => player.seek(frame - 1)}
            disabled={frame <= 0}
          >
            <StepBack aria-hidden="true" />
          </Button>
          {!reduced && count > 1 ? (
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={player.playing ? "Pause" : "Play"}
              aria-pressed={player.playing}
              onClick={player.toggle}
            >
              {player.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Step forward"
            onClick={() => player.seek(frame + 1)}
            disabled={frame >= last}
          >
            <StepForward aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="To the last frame"
            onClick={() => player.seek(last)}
            disabled={count === 0}
          >
            <SkipForward aria-hidden="true" />
          </Button>
          <label className="flex min-w-48 flex-1 items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only" id={`${id}-slider`}>
              Frame
            </span>
            <input
              type="range"
              min={0}
              max={last}
              step={1}
              value={frame}
              aria-labelledby={`${id}-slider`}
              aria-valuetext={stepText}
              onChange={(event) => player.seek(Number(event.currentTarget.value))}
              onKeyDown={onSliderKey}
              className="h-6 w-full accent-primary"
              disabled={count === 0}
            />
            <span className="tabular whitespace-nowrap">
              {formatCount(frame + 1)} / {formatCount(count)}
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {adapters.length > 1 ? (
            <Select value={adapter} onValueChange={(value) => setUrl({ adapter: value })}>
              <SelectTrigger size="sm" className="w-36" aria-label="Whose frames">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adapters.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    <AdapterMark adapter={entry} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div className="flex gap-1" role="group" aria-label="View">
            {(Object.keys(VIEW_LABELS) as ViewerView[]).map((entry) => (
              <Button
                key={entry}
                variant={view === entry ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={view === entry}
                onClick={() => setUrl({ view: entry })}
              >
                {VIEW_LABELS[entry]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {reduced
              ? "Playback is off under reduced motion; the slider, the buttons and the arrow keys still move through the frames."
              : "Arrow keys step on the slider; space plays and pauses."}
          </p>
        </div>
      </div>

      <dl
        className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border p-3 text-sm sm:grid-cols-4 lg:grid-cols-8"
        data-counters
      >
        <Counter label="Budget" value={point ? formatCount(point.budget) : "—"} />
        <Counter
          label="Outcome"
          value={
            point ? (
              <span>
                <Outcome value={point.outcome} />
                {point.refusalReason ? (
                  <span className="block font-mono text-xs break-all">{point.refusalReason}</span>
                ) : null}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Counter
          label="Charged"
          value={point?.charged === null || !point ? "—" : formatCount(point.charged)}
        />
        <Counter label="Included" value={point ? formatCount(point.included) : "—"} />
        <Counter label="Compressed" value={point ? formatCount(point.compressed) : "—"} />
        <Counter label="Omitted" value={point ? formatCount(point.omitted) : "—"} />
        <Counter label="Step" value={point ? (point.exactStep ? "exact" : "coarse") : "—"} />
        <Counter
          label="Checks"
          value={
            !adapterFrames
              ? "—"
              : mispredicted || auditFailed.length > 0
                ? [
                    mispredicted ? "outcome not as predicted" : null,
                    auditFailed.length > 0 ? `audit failed ${auditFailed.join(", ")}` : null,
                  ]
                    .filter(Boolean)
                    .join("; ")
                : "as predicted, audit clean"
          }
        />
      </dl>

      <div className={view === "curve" ? "block" : "hidden lg:block"} data-panel="curve">
        <SheddingCurve summary={summary} cursorBudget={point?.budget} />
      </div>

      <div className={view === "curve" ? "hidden lg:block" : "block"} data-panel={second}>
        {second === "items" ? (
          <section aria-label="Items kept at each budget" className="space-y-2">
            <h2 className="text-base font-semibold">Items</h2>
            {frames.status === "ready" ? (
              adapterFrames ? (
                <ItemStrip
                  items={frames.frames.items}
                  frames={adapterFrames}
                  full={summary.full}
                  frame={frame}
                  adapterLabel={adapterLabel(adapter)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  The sweep has no frames for {adapterLabel(adapter)}.
                </p>
              )
            ) : frames.status === "error" ? (
              <Alert variant="destructive">
                <AlertTitle>Could not read the frames&apos; items</AlertTitle>
                <AlertDescription>
                  {frames.error?.message ?? "The sweep's frames are not available."}{" "}
                  <Button variant="outline" size="sm" onClick={frames.retry}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div role="status" aria-label="Loading the frames' items" aria-busy="true">
                <Skeleton className="h-96 w-full" />
              </div>
            )}
          </section>
        ) : (
          <section aria-label="The frame's timeline" className="space-y-2">
            <h2 className="text-base font-semibold">Lanes</h2>
            {near && nearDocument ? (
              <>
                {!near.exact ? (
                  <p className="text-sm" data-state="nearest-timeline">
                    This frame has no timeline; the nearest frame that has one is frame{" "}
                    {formatCount(near.frame + 1)}, at budget{" "}
                    {formatCount(points[near.frame]?.budget ?? 0)}, shown below.{" "}
                    <Button variant="link" size="sm" onClick={() => player.seek(near.frame)}>
                      Go to that frame
                    </Button>
                  </p>
                ) : null}
                <FrameLanes timeline={nearDocument} path={near.path} />
              </>
            ) : timelinesPending ? (
              <div role="status" aria-label="Loading the timelines" aria-busy="true">
                <Skeleton className="h-72 w-full" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-state="no-timeline">
                {timelinePaths.length === 0
                  ? `The sweep names no timeline of ${adapterLabel(adapter)} that this run lists.`
                  : timelinesFailed > 0
                    ? `${formatCount(timelinesFailed)} of the ${formatCount(timelinePaths.length)} timelines of ${adapterLabel(adapter)} the sweep names could not be read.`
                    : `None of the ${formatCount(timelinePaths.length)} timelines of ${adapterLabel(adapter)} the sweep names is at the budget of one of its frames.`}
              </p>
            )}
          </section>
        )}
      </div>

      <section aria-label="Per adapter" className="space-y-2">
        <h2 className="text-base font-semibold">Per adapter</h2>
        <TableRegion label="Sweep per adapter table">
          <Table>
            <TableCaption className="sr-only">
              Each adapter&apos;s frames, frames whose outcome differs from the prediction, and the
              audit checks any frame failed.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Adapter</TableHead>
                <TableHead className="text-right">Frames</TableHead>
                <TableHead className="text-right">Mispredicted</TableHead>
                <TableHead>Audit failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adapters.map((entry) => {
                const failed = summary.auditFailed[entry] ?? []
                return (
                  <TableRow key={entry}>
                    <TableCell>
                      <AdapterMark adapter={entry} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCount(
                        summary.curves.find((c) => c.adapter === entry)?.points.length ?? 0,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCount(summary.mispredicted[entry] ?? 0)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {failed.length > 0 ? failed.join(", ") : "none"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableRegion>
      </section>
    </div>
  )
}

function Counter({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  )
}
