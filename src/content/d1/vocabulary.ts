// The words the diagrams need that the contract document does not yet type (ui-plan.md 7.3; the
// plan's harness ask 11): the planes' names and what each answers, and the eight pipeline lanes
// with what each stage may do to an item. Quoted from the specification's contract as the nightly
// fixture carries it (contract commit 16de4be, spec draft 2026-10-07). The slots themselves are
// typed and come from each run's contract.json; when the harness types planes[] and stages[],
// these words give way to the contract's own.

import type { TimelineV1 } from "@/data/schema/generated"

import type { Citation } from "../source"

export type PlaneId = "governance" | "state" | "evidence" | "interaction"

export type PlaneWords = { id: PlaneId; name: string; answers: string }

export const PLANES: readonly PlaneWords[] = [
  { id: "governance", name: "Governance", answers: "Who may direct the model" },
  { id: "state", name: "State", answers: "What is true right now" },
  { id: "evidence", name: "Evidence", answers: "What the model may ground on" },
  { id: "interaction", name: "Interaction", answers: "What has happened, and what is asked" },
]

export function planeOf(id: string): PlaneWords | undefined {
  return PLANES.find((plane) => plane.id === id)
}

/** A timeline event's stage: the eight lanes, in the schema's order. */
export type Lane = TimelineV1["events"][number]["stage"]

export type LaneWords = {
  lane: Lane
  name: string
  owner: "producer" | "assembler"
  /** What the stage may do to an item, in the specification's words. */
  text: string
}

export const LANES: readonly LaneWords[] = [
  {
    lane: "producer",
    name: "Producer",
    owner: "producer",
    text: "Rewrite the query for retrieval if it helps and keep the rewritten form; retrieve candidates from sources whose provenance can be named; rerank each against the query and put the score in relevance; package each chunk as its own evidence item with source, version, relevance and authority (R-1, R-13).",
  },
  {
    lane: "admit",
    name: "Admit",
    owner: "assembler",
    text: "Check each item against its schema and the route: who sent it, which slot, what authority, its scope, age and expiry, and the route's min_relevance. Anything that fails is excluded with a reason code.",
  },
  {
    lane: "resolve",
    name: "Resolve",
    owner: "assembler",
    text: "Settle the conflict groups the application declared (R-11).",
  },
  {
    lane: "supersede",
    name: "Supersede",
    owner: "assembler",
    text: "In the slots where the route asks, drop observations a newer one supersedes (R-25).",
  },
  {
    lane: "dedupe",
    name: "Dedupe",
    owner: "assembler",
    text: "In the slots where the route asks, drop exact duplicates (R-24).",
  },
  {
    lane: "diversity",
    name: "Diversity",
    owner: "assembler",
    text: "In the slots where the route asks, drop anything past max_per_source (R-26).",
  },
  {
    lane: "fit",
    name: "Fit",
    owner: "assembler",
    text: "Refuse before any reduction if protected content cannot fit (R-16, R-17). Otherwise apply item and slot caps, then shed in tier order under budget pressure: droppable first, then compressible (R-16). If too little evidence is left on a route that requires it, refuse instead (R-12).",
  },
  {
    lane: "render",
    name: "Render & trace",
    owner: "assembler",
    text: "Render the payload in the profile's order, hash it, and write a trace that accounts for every decision above (R-21).",
  },
]

export function laneWords(lane: string): LaneWords | undefined {
  return LANES.find((words) => words.lane === lane)
}

export const VOCABULARY_CITATION: Citation = {
  file: "domain1/fixtures/runs/20261008T133453Z-691b414/contract.json",
  section: "planes[] and stages[]",
}
