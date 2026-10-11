import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const s7 = FIXTURE_RUNS.s7
const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"
const viewer = (query = "") => `/d1/runs/${s7}/sweeps/${SWEEP}${query}`

const counter = (label: string) => {
  const counters = document.querySelector("[data-counters]") as HTMLElement
  const term = within(counters).getByText(label)
  return term.nextElementSibling?.textContent ?? ""
}

describe("the shedding viewer", () => {
  it("opens at the first frame with the curve, the counters and the item strip", async () => {
    renderApp(viewer())
    expect(
      await screen.findByRole("heading", { level: 1, name: "Shedding · compressible-v0" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Shedding curve of compressible-v0/ })).toBeVisible()
    expect(counter("Budget")).toBe("2,104")
    expect(counter("Included")).toBe("42")
    expect(counter("Step")).toBe("exact")
    const strip = await screen.findByRole("img", { name: /Items kept at each budget/ })
    expect(strip).toHaveAccessibleName(/42 items over 16 frames of Python/)
    expect(screen.getByRole("slider", { name: "Frame" })).toHaveAttribute(
      "aria-valuetext",
      "Frame 1 of 16: budget 2,104, assembled",
    )
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument()
    const perAdapter = screen.getByRole("region", { name: "Sweep per adapter table" })
    expect(within(perAdapter).getAllByRole("row")).toHaveLength(5)
  })

  it("steps through the frames and keeps the frame in the address", async () => {
    const { router } = renderApp(viewer())
    await screen.findByRole("img", { name: /Items kept at each budget/ })
    fireEvent.click(screen.getByRole("button", { name: "Step forward" }))
    expect(counter("Budget")).toBe("1,980")
    expect(counter("Omitted")).toBe("2")
    expect(screen.getByRole("img", { name: /Items kept at each budget/ })).toHaveAccessibleName(
      /At budget 1,980: 40 included whole, 0 as a variant, 2 omitted/,
    )
    await waitFor(() => expect(router.state.location.search).toBe("?frame=1"))
    fireEvent.click(screen.getByRole("button", { name: "To the last frame" }))
    expect(counter("Budget")).toBe("46")
    expect(counter("Outcome")).toMatch(/refused.*protected_content_over_budget/)
    expect(screen.getByRole("button", { name: "Step forward" })).toBeDisabled()
    fireEvent.change(screen.getByRole("slider", { name: "Frame" }), { target: { value: "3" } })
    expect(counter("Budget")).toBe("1,660")
    expect(counter("Step")).toBe("coarse")
  })

  it("takes the frame, the adapter and the view from the address", async () => {
    renderApp(viewer("?frame=15&adapter=go&view=lanes"))
    await screen.findByRole("heading", { level: 1, name: "Shedding · compressible-v0" })
    expect(counter("Budget")).toBe("46")
    expect(document.querySelector("[data-viewer]")).toHaveAttribute("data-adapter", "go")
    expect(screen.getByRole("button", { name: "Lanes" })).toHaveAttribute("aria-pressed", "true")
    // The fixture's frames are trimmed, so none of the timelines sits at one of their budgets.
    expect(
      await screen.findByText(
        "None of the 5 timelines of Go the sweep names is at the budget of one of its frames.",
      ),
    ).toBeInTheDocument()
  })

  it("falls back to the shedding list's adapter and the first frame on values it cannot use", async () => {
    renderApp(viewer("?frame=x&adapter=cobol&view=sideways"))
    await screen.findByRole("heading", { level: 1, name: "Shedding · compressible-v0" })
    expect(document.querySelector("[data-viewer]")).toHaveAttribute("data-adapter", "python")
    expect(counter("Budget")).toBe("2,104")
    expect(screen.getByRole("button", { name: "Curve" })).toHaveAttribute("aria-pressed", "true")
  })

  it("points a run without S7 at the newest run that has it", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}/sweeps/${SWEEP}`)
    expect(await screen.findByText("S7's sweeps: not in this run")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: s7 })).toHaveAttribute("href", `/d1/runs/${s7}/sweeps`)
  })

  it("says so for a sweep the run does not list", async () => {
    renderApp(`/d1/runs/${s7}/sweeps/${"0".repeat(64)}`)
    expect(await screen.findByText(/This run lists no sweep 0000000\./)).toBeInTheDocument()
  })

  it("says so for a digest that is not one", async () => {
    renderApp(`/d1/runs/${s7}/sweeps/nope`)
    expect(await screen.findByText("nope is not a sweep's digest.")).toBeInTheDocument()
  })

  it("shows the unsupported state for a sweep of a schema it does not read", async () => {
    renderApp(viewer(), {
      overrides: {
        [`/results/d1/${s7}/suites/S7/sweeps/${SWEEP}.json`]: {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/sweep/v2"}',
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText("This viewer does not read cwa-bench-d1/sweep/v2"),
    ).toBeInTheDocument()
  })
})
