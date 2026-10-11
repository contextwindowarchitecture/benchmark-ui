// The oracles diagram's layout (ui-plan.md 7.3): the four judges around one answer where the
// measured width holds them legibly, and below that the compact equivalent DESIGN.md 4.2 asks
// for, the judges stacked on a spine from the answer, at full size instead of shrunk or scrolled.

import { ORACLES, type OracleId } from "@/features/d1/model/oracles"

export const BOX_HEIGHT = 56
export const ANSWER = { w: 140, h: 60 }

/** Below this width the radial picture's words drop under 9 px, so the stack is drawn. */
export const RADIAL_MIN_WIDTH = 480

const RADIAL = { w: 640, h: 300 }
const BOX_WIDTH = 230
const SPINE_X = 40
const INDENT = 56
const STACK_GAP = 12
const ORDER = ORACLES.map((oracle) => oracle.id)

export type OraclesLayout = {
  kind: "radial" | "stack"
  width: number
  height: number
  boxWidth: number
  /** Each judge's box, by its top left. */
  boxes: Record<OracleId, { x: number; y: number }>
  /** Each judge's connector to the answer as polyline points; stacked ones share the spine. */
  connectors: Record<OracleId, string>
  /** The answer's top left. */
  answer: { x: number; y: number }
}

/** The layout in `available` pixels; an unmeasured width (0) draws the radial picture. */
export function oraclesLayout(available: number): OraclesLayout {
  return available === 0 || available >= RADIAL_MIN_WIDTH ? radial() : stack(available)
}

function radial(): OraclesLayout {
  const { w, h } = RADIAL
  const center = { x: w / 2, y: h / 2 }
  const boxes: OraclesLayout["boxes"] = {
    expected: { x: 8, y: 8 },
    differential: { x: w - BOX_WIDTH - 8, y: 8 },
    auditor: { x: 8, y: h - BOX_HEIGHT - 8 },
    metamorphic: { x: w - BOX_WIDTH - 8, y: h - BOX_HEIGHT - 8 },
  }
  const connector = (id: OracleId) => {
    const box = boxes[id]
    const anchorX = box.x < center.x ? box.x + BOX_WIDTH : box.x
    return `${anchorX},${box.y + BOX_HEIGHT / 2} ${center.x},${center.y}`
  }
  return {
    kind: "radial",
    width: w,
    height: h,
    boxWidth: BOX_WIDTH,
    boxes,
    connectors: byOracle(connector),
    answer: { x: center.x - ANSWER.w / 2, y: center.y - ANSWER.h / 2 },
  }
}

function stack(available: number): OraclesLayout {
  const width = Math.max(available, INDENT + BOX_WIDTH + 1)
  const answer = { x: 1, y: 1 }
  const spineTop = answer.y + ANSWER.h
  const boxes = Object.fromEntries(
    ORDER.map((id, index) => [
      id,
      { x: INDENT, y: spineTop + STACK_GAP + index * (BOX_HEIGHT + STACK_GAP) },
    ]),
  ) as OraclesLayout["boxes"]
  // Drawn from the answer down, so the dashes the connectors share on the spine coincide.
  const connector = (id: OracleId) => {
    const middle = boxes[id].y + BOX_HEIGHT / 2
    return `${SPINE_X},${spineTop} ${SPINE_X},${middle} ${INDENT},${middle}`
  }
  return {
    kind: "stack",
    width,
    height: spineTop + ORDER.length * (BOX_HEIGHT + STACK_GAP) + 1,
    boxWidth: width - INDENT - 1,
    boxes,
    connectors: byOracle(connector),
    answer,
  }
}

function byOracle<T>(value: (id: OracleId) => T): Record<OracleId, T> {
  return Object.fromEntries(ORDER.map((id) => [id, value(id)])) as Record<OracleId, T>
}
