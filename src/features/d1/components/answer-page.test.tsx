import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const nightly = FIXTURE_RUNS.nightly

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  const node = document.getElementById(id) as HTMLElement
  return { ...within(node), node }
}

describe("answer explorer", () => {
  it("shows a conformance case's answers with their checks and blobs", async () => {
    renderApp(`/d1/runs/${nightly}/answers/S1/admission-reasons`)
    expect(
      await screen.findByRole("heading", { level: 1, name: "admission-reasons" }),
    ).toBeInTheDocument()
    const snapshot = await section("snapshot")
    expect(snapshot.getByText("assembled", { selector: "[data-outcome]" })).toBeInTheDocument()
    await waitFor(() => expect(snapshot.node.querySelector('[data-blob="ready"]')).not.toBeNull())
    const answers = await section("answers")
    const cards = answers.node.querySelectorAll("[data-adapter]")
    expect(cards.length).toBeGreaterThan(0)
    expect(answers.getAllByText(/21 passed, none failed\./).length).toBeGreaterThan(0)
    expect(answers.getAllByText("153 input, 153 charged of a 8,192 budget").length).toBeGreaterThan(
      0,
    )
    await waitFor(() =>
      expect(answers.node.querySelectorAll('[data-blob="ready"]').length).toBeGreaterThan(0),
    )
    expect(
      answers.getAllByText("No timeline for this snapshot and adapter in this run.").length,
    ).toBeGreaterThan(0)
  })

  it("shows a determinism case as hashes only, one part per cell", async () => {
    renderApp(`/d1/runs/${nightly}/answers/S2/admission-reasons`)
    expect(await screen.findByText(/^Hashes only:/)).toBeInTheDocument()
    const answers = await section("answers")
    expect(answers.node.querySelectorAll("[data-part]").length).toBeGreaterThan(0)
    expect(answers.getAllByText("Hashes only for this answer.").length).toBeGreaterThan(0)
  })

  it("shows a relation instance with its base and variant", async () => {
    renderApp(`/d1/runs/${nightly}/answers/S4/duplicate_item_id--twin--state.user`)
    const answers = await section("answers")
    await waitFor(() => expect(answers.node.querySelector('[data-part="base"]')).not.toBeNull())
    expect(answers.node.querySelector('[data-part="variant"]')).not.toBeNull()
  })

  it("says when no row judges the case", async () => {
    renderApp(`/d1/runs/${nightly}/answers/S1/nope`)
    expect(await screen.findByText("No row of S1 judges case nope.")).toBeInTheDocument()
  })
})
