import { useState } from "react"

import { VOCABULARY_CITATION, type PlaneId } from "@/content"
import type { ContractV1 } from "@/data/schema/generated"
import { planeGroups, slotName } from "@/features/d1/model/contract"
import { useMeasure } from "@/hooks/use-measure"

import { DiagramFrame } from "./diagram-frame"
import { COLUMN, modelLayout, SLOT, SLOT_GAP, SUBTITLE, subtitleLines } from "./model-geometry"

const PLANE_FILL: Record<PlaneId, string> = {
  governance: "fill-plane-governance",
  state: "fill-plane-state",
  evidence: "fill-plane-evidence",
  interaction: "fill-plane-interaction",
}

const PLANE_STROKE: Record<PlaneId, string> = {
  governance: "stroke-plane-governance",
  state: "stroke-plane-state",
  evidence: "stroke-plane-evidence",
  interaction: "stroke-plane-interaction",
}

const PLANE_TEXT: Record<PlaneId, string> = {
  governance: "text-plane-governance",
  state: "text-plane-state",
  evidence: "text-plane-evidence",
  interaction: "text-plane-interaction",
}

const isPlaneId = (id: string): id is PlaneId => id in PLANE_FILL

/**
 * The model (ui-plan.md 7.3): the planes and the slots they hold, from the run's contract, with
 * each slot's rule on hover and in the text. Tiers wait for the harness to type slot defaults.
 */
export function ModelDiagram({ contract, runId }: { contract: ContractV1; runId: string }) {
  const groups = planeGroups(contract)
  const [active, setActive] = useState<string | null>(null)
  const { ref, width: available } = useMeasure<HTMLDivElement>()
  const subtitles = groups.map((group) => subtitleLines(group.answers))
  const { width, height, banded, columns } = modelLayout(
    groups.map((group, index) => ({
      slots: group.slots.length,
      lines: subtitles[index]!.length,
    })),
    available,
  )
  const activeSlot = contract.slots.find((slot) => slot.id === active)
  return (
    <DiagramFrame
      id="model-diagram"
      title="The model: four planes, eleven slots"
      description={
        <>
          Every item an assembler sees belongs to one slot, and every slot to one plane. From the
          contract of run <span className="font-mono">{runId}</span>.
        </>
      }
      figure={
        <div ref={ref} className="w-full space-y-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            className={
              banded
                ? "block h-auto max-w-full text-foreground"
                : "block h-auto w-full max-w-[52rem] text-foreground"
            }
          >
            {groups.map((group, index) => {
              const { x, y, height: columnHeight, header } = columns[index]!
              const plane = isPlaneId(group.id) ? group.id : null
              return (
                <g key={group.id} transform={`translate(${x},${y})`} data-plane={group.id}>
                  <rect
                    width={COLUMN}
                    height={columnHeight}
                    rx={10}
                    className={`${plane ? PLANE_FILL[plane] : "fill-muted-foreground"} opacity-[0.08]`}
                  />
                  <rect
                    width={COLUMN}
                    height={columnHeight}
                    rx={10}
                    className={`fill-none ${plane ? PLANE_STROKE[plane] : "stroke-muted-foreground"}`}
                  />
                  <text
                    x={12}
                    y={22}
                    className={`text-[13px] font-semibold ${plane ? PLANE_TEXT[plane] : "fill-foreground"}`}
                    fill="currentColor"
                  >
                    {group.name}
                  </text>
                  <text className="fill-muted-foreground text-[11px]" data-subtitle>
                    {subtitles[index]!.map((line, number) => (
                      <tspan key={number} x={SUBTITLE.x} y={SUBTITLE.y + number * SUBTITLE.line}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                  {group.slots.map((slot, row) => {
                    const y = header + row * (SLOT + SLOT_GAP)
                    const isActive = active === slot.id
                    return (
                      <g
                        key={slot.id}
                        transform={`translate(10,${y})`}
                        data-slot={slot.id}
                        onMouseEnter={() => setActive(slot.id)}
                        onMouseLeave={() =>
                          setActive((current) => (current === slot.id ? null : current))
                        }
                        className="cursor-help"
                      >
                        <title>{`${slot.id}: ${slot.rule}`}</title>
                        <rect
                          width={COLUMN - 20}
                          height={SLOT}
                          rx={6}
                          className={`${plane ? PLANE_FILL[plane] : "fill-muted-foreground"} ${isActive ? "opacity-40" : "opacity-20"}`}
                        />
                        <rect
                          width={COLUMN - 20}
                          height={SLOT}
                          rx={6}
                          className={`fill-none ${isActive ? "stroke-foreground" : plane ? PLANE_STROKE[plane] : "stroke-muted-foreground"}`}
                        />
                        <text x={10} y={24} className="fill-foreground font-mono text-[12px]">
                          {slotName(slot)}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
          <p className="min-h-10 text-xs text-muted-foreground" data-slot-caption>
            {activeSlot ? (
              <>
                <span className="font-mono text-foreground">{activeSlot.id}</span> holds{" "}
                {activeSlot.holds} {activeSlot.rule}
              </>
            ) : (
              "Hover a slot for what it holds and its rule; every slot is listed in words beside."
            )}
          </p>
        </div>
      }
      equivalent={
        <dl className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} data-plane-words={group.id}>
              <dt className="font-medium">
                {group.name}
                {group.answers ? (
                  <span className="font-normal text-muted-foreground"> · {group.answers}</span>
                ) : null}
              </dt>
              {group.slots.map((slot) => (
                <dd key={slot.id} className="mt-1 ml-3 text-xs">
                  <span className="font-mono text-foreground">{slot.id}</span>{" "}
                  <span className="text-muted-foreground">
                    holds {slot.holds} {slot.rule}
                  </span>
                </dd>
              ))}
            </div>
          ))}
        </dl>
      }
      note="The slots, what they hold and their rules are the contract's own. The planes' names and the three tiers are not yet typed in the contract document; the names come from the specification's words, and the tiers are left out until the harness types them."
      citation={VOCABULARY_CITATION}
    />
  )
}
