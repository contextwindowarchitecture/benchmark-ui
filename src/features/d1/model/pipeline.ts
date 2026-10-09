// The pipeline's lanes (ui-plan.md 7.3, 9.2): the eight stages of the timeline schema's
// vocabulary, in order, and a timeline's events shaped onto them. The lane vocabulary is typed
// (the event's `stage` enum), so the pipeline diagram and the viewer's lane view are one picture.

import type { TimelineV1 } from "@/data/schema/generated"

export type Lane = TimelineV1["events"][number]["stage"]
export type TimelineEvent = TimelineV1["events"][number]
export type EventType = TimelineEvent["type"]

/** The eight lanes in the schema's order; a timeline's own `lanes[]` is checked against them. */
export const LANES: readonly Lane[] = [
  "producer",
  "admit",
  "resolve",
  "supersede",
  "dedupe",
  "diversity",
  "fit",
  "render",
]

export function isLane(value: string): value is Lane {
  return (LANES as readonly string[]).includes(value)
}

export type WalkEvent = {
  /** The event's index in sequence order: the walk's step. */
  index: number
  seq: number
  lane: Lane
  type: EventType
  inferred: boolean
}

export type WalkView = {
  events: WalkEvent[]
  /** Events per lane, in sequence, every lane present even when empty. */
  byLane: Map<Lane, WalkEvent[]>
  inferred: number
  /** Lanes the timeline names that the schema's vocabulary does not; shown, never animated. */
  unknownLanes: string[]
}

/** A timeline's events in sequence order, shaped onto the lanes. */
export function walkView(timeline: TimelineV1): WalkView {
  const sorted = [...timeline.events].sort((a, b) => a.seq - b.seq)
  const events: WalkEvent[] = sorted.map((event, index) => ({
    index,
    seq: event.seq,
    lane: event.stage,
    type: event.type,
    inferred: event.order === "inferred",
  }))
  const byLane = new Map<Lane, WalkEvent[]>(LANES.map((lane) => [lane, []]))
  for (const event of events) byLane.get(event.lane)?.push(event)
  return {
    events,
    byLane,
    inferred: events.filter((event) => event.inferred).length,
    unknownLanes: timeline.lanes.filter((lane) => !isLane(lane)),
  }
}

/** The counts of events by type up to and including a step (−1 for none), for the walk's text. */
export function countsThrough(view: WalkView, step: number): Map<EventType, number> {
  const counts = new Map<EventType, number>()
  for (const event of view.events) {
    if (event.index > step) break
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1)
  }
  return counts
}
