import { fireEvent, render, screen } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TimelineV1 } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { PipelineWalk } from "./pipeline-walk"

const PATH = "timelines/0b7c50eb7a0298d763b683bbb8e34227a099303a1463deb642cb8afec7f3e56c/go.json"

async function timeline(): Promise<TimelineV1> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.s7, PATH), "utf8")),
    "timeline",
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

const matchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = matchMedia
})

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe("the pipeline walk", () => {
  it("shows the final state first, every event on its lane, and steps back and forward", async () => {
    render(<PipelineWalk timeline={await timeline()} runId={FIXTURE_RUNS.s7} path={PATH} />)
    const root = document.querySelector("[data-walk]") as HTMLElement
    expect(root.dataset["walkStep"]).toBe("41")
    expect(root.querySelectorAll("[data-event]")).toHaveLength(42)
    expect(root.querySelectorAll('[data-event][data-shown="true"]')).toHaveLength(42)
    expect(root.querySelectorAll("svg [data-lane]")).toHaveLength(8)
    expect(screen.getByText(/Event 42 of 42: placed at Render & trace\./)).toBeInTheDocument()
    expect(screen.getByText(/40 omitted, 2 placed/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Step back" }))
    expect(root.dataset["walkStep"]).toBe("40")
    expect(root.querySelectorAll('[data-event][data-shown="false"]')).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "To the start" }))
    expect(root.dataset["walkStep"]).toBe("-1")
    expect(screen.getByText(/Before the first event: 42 to come\./)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Step back" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Step forward" }))
    expect(screen.getByText(/Event 1 of 42: omitted at Fit\./)).toBeInTheDocument()

    const slider = screen.getByRole("slider", { name: "Event" })
    fireEvent.change(slider, { target: { value: "10" } })
    expect(root.dataset["walkStep"]).toBe("9")
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringContaining("Event 10 of 42"))
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Timeline lanes table" })).toBeInTheDocument()
  })

  it("leaves out playback under reduced motion and keeps the slider", async () => {
    mockReducedMotion(true)
    render(
      <PipelineWalk
        timeline={await timeline()}
        runId={FIXTURE_RUNS.s7}
        path={PATH}
        withTable={false}
      />,
    )
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull()
    expect(screen.getByText(/Playback is off under reduced motion/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole("slider", { name: "Event" }), { target: { value: "3" } })
    expect((document.querySelector("[data-walk]") as HTMLElement).dataset["walkStep"]).toBe("2")
    expect(screen.queryByRole("region", { name: "Timeline lanes table" })).toBeNull()
  })

  it("marks inferred events and names unknown lanes", async () => {
    const base = await timeline()
    const edited: TimelineV1 = {
      ...base,
      lanes: [...base.lanes, "mystery"],
      events: base.events.map((event, i) => (i === 0 ? { ...event, order: "inferred" } : event)),
    }
    render(<PipelineWalk timeline={edited} runId={FIXTURE_RUNS.s7} path={PATH} />)
    expect(screen.getByText(/1 events in inferred order, drawn dashed/)).toBeInTheDocument()
    expect(document.querySelector('[data-event="0"]')).toHaveAttribute("stroke-dasharray", "2 2")
    expect(screen.getByText(/lanes this viewer does not draw: mystery/)).toBeInTheDocument()
  })
})
