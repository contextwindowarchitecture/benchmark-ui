// The pipeline's lane layout (ui-plan.md 7.3, 9.2): the eight stages as rows, shared by the
// pipeline diagram, the pipeline walk and the shedding viewer's lane view, so they are one picture.

import { LANES, type Lane } from "@/features/d1/model/pipeline"

export const LANE_HEIGHT = 36
export const LABEL_WIDTH = 132
export const LANE_TOP = 6
export const LANE_PAD = 8

export type LaneBox = { lane: Lane; index: number; y: number; centerY: number }

export function laneBoxes(): LaneBox[] {
  return LANES.map((lane, index) => ({
    lane,
    index,
    y: LANE_TOP + index * LANE_HEIGHT,
    centerY: LANE_TOP + index * LANE_HEIGHT + LANE_HEIGHT / 2,
  }))
}

export function lanesHeight(): number {
  return LANE_TOP * 2 + LANES.length * LANE_HEIGHT
}

/** The x of an event's mark in the track, by its index among `count` events. */
export function markX(index: number, count: number, width: number): number {
  const trackLeft = LABEL_WIDTH + LANE_PAD
  const trackWidth = Math.max(width - trackLeft - LANE_PAD, 1)
  if (count <= 1) return trackLeft + trackWidth / 2
  return trackLeft + (trackWidth * index) / (count - 1)
}
