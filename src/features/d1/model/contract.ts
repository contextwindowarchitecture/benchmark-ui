// Pure selectors over the contract document for the diagrams (ui-plan.md 7.3): the slots grouped
// by plane. The plane is the typed slot id's prefix; the plane's words come from content until the
// harness types `planes[]`.

import { PLANES, planeOf } from "@/content"
import type { ContractV1 } from "@/data/schema/generated"

export type Slot = ContractV1["slots"][number]

export type PlaneGroup = { id: string; name: string; answers: string; slots: Slot[] }

/** The contract's slots grouped by plane, planes in the content's order, unknown planes after. */
export function planeGroups(contract: ContractV1): PlaneGroup[] {
  const groups = new Map<string, Slot[]>()
  for (const slot of contract.slots) {
    const plane = slot.id.includes(".") ? (slot.id.split(".")[0] as string) : "other"
    const list = groups.get(plane) ?? []
    list.push(slot)
    groups.set(plane, list)
  }
  const known = PLANES.map((plane) => plane.id as string)
  const order = [
    ...known.filter((id) => groups.has(id)),
    ...[...groups.keys()].filter((id) => !known.includes(id)),
  ]
  return order.map((id) => {
    const words = planeOf(id)
    return {
      id,
      name: words?.name ?? id,
      answers: words?.answers ?? "",
      slots: groups.get(id) ?? [],
    }
  })
}

/** A slot's name within its plane: `evidence.knowledge` → `knowledge`. */
export function slotName(slot: Pick<Slot, "id">): string {
  return slot.id.includes(".") ? slot.id.slice(slot.id.indexOf(".") + 1) : slot.id
}
