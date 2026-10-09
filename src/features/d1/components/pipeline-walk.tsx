// The pipeline walk (ui-plan.md 7.4; DESIGN.md 3.4): one real timeline's events animated along
// the pipeline lanes, event by event. The data is a recorded process, so the animation is a scrub
// over the recorded steps: a GSAP tween maps time to the event index and nothing else, React owns
// every node and sets each mark from the step, the controls are a range input with play, pause and
// step buttons, and the current step is readable as text. Reduced motion shows the final state
// with the slider still live. Inferred events draw dashed and are labeled.

import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from "lucide-react"
import { useCallback, useId, useMemo, useRef, useState } from "react"

import { Outcome } from "@/components/dashboard/outcome"
import { Button } from "@/components/ui/button"
import { laneWords } from "@/content"
import type { TimelineV1 } from "@/data/schema/generated"
import { countsThrough, WALK_RATE, walkView, type WalkEvent } from "@/features/d1/model/pipeline"
import { useMeasure } from "@/hooks/use-measure"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { formatCount } from "@/lib/format"
import { gsap, useGSAP } from "@/lib/motion"

import { laneBoxes, lanesHeight, LANE_HEIGHT, markX } from "./diagrams/pipeline-geometry"
import { PipelineLanes } from "./diagrams/pipeline-lanes"
import { TimelineLanesTable } from "./timeline-lanes-table"

export type PipelineWalkProps = {
  timeline: TimelineV1
  runId: string
  /** The timeline's path in the run, named beside the picture. */
  path: string
  /** Include the lanes table as the text alternative; the explorer shows its own. */
  withTable?: boolean
}

export function PipelineWalk({ timeline, runId, path, withTable = true }: PipelineWalkProps) {
  const id = useId()
  const view = useMemo(() => walkView(timeline), [timeline])
  const count = view.events.length
  const last = count - 1
  // The final state first: the picture is complete without a timeline completing. The step is
  // kept with the timeline it belongs to, so a new timeline starts at its own final state.
  const [stepState, setStepState] = useState<{ of: number; step: number }>({ of: last, step: last })
  const step = stepState.of === last ? stepState.step : last
  const setStep = useCallback(
    (next: number | ((current: number) => number)) =>
      setStepState((current) => {
        const base = current.of === last ? current.step : last
        return { of: last, step: typeof next === "function" ? next(base) : next }
      }),
    [last],
  )
  const [playing, setPlaying] = useState(false)
  const reduced = useReducedMotion()
  const scope = useRef<HTMLDivElement>(null)
  const tween = useRef<gsap.core.Tween | null>(null)
  const { ref, width } = useMeasure<HTMLDivElement>()
  const svgWidth = Math.max(width || 640, 480)
  const height = lanesHeight()

  useGSAP(
    () => {
      tween.current = null
      if (reduced || count === 0) return
      // A clock from "nothing yet" (progress 0) to the last event (progress 1), at WALK_RATE
      // events per second; the step is read off its progress and nothing else is animated.
      const clock = { progress: 0 }
      const t = gsap.to(clock, {
        progress: 1,
        duration: count / WALK_RATE,
        ease: "none",
        paused: true,
        onUpdate: () => {
          const index = -1 + t.progress() * count
          setStep(Math.min(last, Math.max(-1, Math.floor(index))))
        },
        onComplete: () => setPlaying(false),
      })
      t.progress(1)
      tween.current = t
    },
    { scope, dependencies: [count, last, reduced], revertOnUpdate: true },
  )

  const seek = useCallback(
    (next: number) => {
      const bounded = Math.min(last, Math.max(-1, next))
      const t = tween.current
      if (t) {
        t.pause()
        t.progress((bounded + 1) / count)
      }
      setPlaying(false)
      setStep(bounded)
    },
    [count, last, setStep],
  )

  const toggle = useCallback(() => {
    const t = tween.current
    if (!t) return
    if (playing) {
      t.pause()
      setPlaying(false)
      return
    }
    if (t.progress() >= 1) t.progress(0)
    t.play()
    setPlaying(true)
  }, [playing])

  const current: WalkEvent | undefined = step >= 0 ? view.events[step] : undefined
  const counts = countsThrough(view, step)
  const emptyLanes = new Set(
    [...view.byLane.entries()].filter(([, events]) => events.length === 0).map(([lane]) => lane),
  )
  const boxes = laneBoxes()
  const laneY = new Map(boxes.map((box) => [box.lane, box.centerY]))
  const stepText =
    step < 0
      ? `Before the first event: ${formatCount(count)} to come.`
      : current
        ? `Event ${formatCount(step + 1)} of ${formatCount(count)}: ${current.type} at ${laneWords(current.lane)?.name ?? current.lane}${current.inferred ? " (order inferred by the harness)" : ""}.`
        : "No events."
  const countsText = [...counts.entries()]
    .map(([type, n]) => `${formatCount(n)} ${type}`)
    .join(", ")

  return (
    <div ref={scope} className="space-y-3" data-walk data-walk-step={step}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          <Outcome value={timeline.outcome} />
          {timeline.refusal_reason ? ` ${timeline.refusal_reason}` : ""}
        </span>
        <span>
          {formatCount(timeline.counters.candidates)} candidates,{" "}
          {formatCount(timeline.counters.admitted)} admitted,{" "}
          {formatCount(timeline.counters.included)} included,{" "}
          {formatCount(timeline.counters.compressed)} compressed,{" "}
          {formatCount(timeline.counters.omitted)} omitted
        </span>
        {view.inferred > 0 ? (
          <span>{formatCount(view.inferred)} events in inferred order, drawn dashed</span>
        ) : null}
        <span>
          <span className="font-mono">{path}</span> of run{" "}
          <span className="font-mono">{runId}</span>
        </span>
      </div>
      <div ref={ref} className="w-full" aria-hidden="true">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          width={svgWidth}
          height={height}
          className="block h-auto max-w-full text-foreground"
        >
          <PipelineLanes
            width={svgWidth}
            activeLane={current?.lane ?? null}
            emptyLanes={emptyLanes}
          />
          {current ? (
            <line
              x1={markX(current.index, count, svgWidth)}
              x2={markX(current.index, count, svgWidth)}
              y1={0}
              y2={height}
              className="stroke-foreground/40"
              data-walk-cursor
            />
          ) : null}
          {view.events.map((event) => {
            const shown = event.index <= step
            const isCurrent = event.index === step
            return (
              <circle
                key={event.index}
                cx={markX(event.index, count, svgWidth)}
                cy={laneY.get(event.lane) ?? LANE_HEIGHT / 2}
                r={isCurrent ? 6 : 4}
                data-event={event.index}
                data-shown={shown ? "true" : "false"}
                strokeDasharray={event.inferred ? "2 2" : undefined}
                className={
                  shown
                    ? isCurrent
                      ? "fill-primary stroke-foreground"
                      : event.inferred
                        ? "fill-primary/40 stroke-primary"
                        : "fill-primary stroke-none"
                    : "fill-muted-foreground/20 stroke-none"
                }
              />
            )
          })}
        </svg>
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Pipeline walk controls"
      >
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="To the start"
          onClick={() => seek(-1)}
          disabled={count === 0}
        >
          <SkipBack aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Step back"
          onClick={() => seek(step - 1)}
          disabled={step < 0}
        >
          <StepBack aria-hidden="true" />
        </Button>
        {!reduced && count > 0 ? (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            onClick={toggle}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Step forward"
          onClick={() => seek(step + 1)}
          disabled={step >= last}
        >
          <StepForward aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="To the end"
          onClick={() => seek(last)}
          disabled={count === 0}
        >
          <SkipForward aria-hidden="true" />
        </Button>
        <label className="flex min-w-48 flex-1 items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only" id={`${id}-slider`}>
            Event
          </span>
          <input
            type="range"
            min={0}
            max={count}
            value={step + 1}
            step={1}
            aria-labelledby={`${id}-slider`}
            aria-valuetext={stepText}
            onChange={(event) => seek(Number(event.currentTarget.value) - 1)}
            className="h-6 w-full accent-primary"
            disabled={count === 0}
          />
          <span className="tabular whitespace-nowrap">
            {formatCount(step + 1)} / {formatCount(count)}
          </span>
        </label>
      </div>
      <p className="text-sm" data-walk-text>
        {stepText}
        {countsText ? <span className="text-muted-foreground"> So far: {countsText}.</span> : null}
        {reduced ? (
          <span className="text-muted-foreground">
            {" "}
            Playback is off under reduced motion; the slider and the step buttons still move through
            the events.
          </span>
        ) : null}
      </p>
      {view.unknownLanes.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          The timeline names lanes this viewer does not draw: {view.unknownLanes.join(", ")}.
        </p>
      ) : null}
      {withTable ? (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Every event as a table
          </summary>
          <div className="mt-2">
            <TimelineLanesTable timeline={timeline} />
          </div>
        </details>
      ) : null}
    </div>
  )
}
