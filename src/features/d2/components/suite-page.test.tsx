import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D2_FIXTURE_RUNS.nightly

const loaded = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("a Domain 2 suite page", () => {
  it("lays S2's metrics out by arm and tier, reads its typed blocks, and pages its grades", async () => {
    renderApp(`/d2/runs/${run}/suites/S2`)
    expect(
      await screen.findByRole("heading", { level: 1, name: "S2 · Scripted conversations" }),
    ).toBeInTheDocument()

    const gate = await loaded("metrics")
    expect(gate.getByText("s2.call_errors")).toBeInTheDocument()

    const arms = await loaded("arms")
    const aptitude = arms.getByRole("region", { name: "Correct answers by arm and tier" })
    const cell = within(aptitude).getByRole("cell", {
      name: /^truncate-pinned, 8,192 tokens: 84\.3% \(364 \/ 432\), 95% interval 71\.8% to 94\.3%$/,
    })
    expect(cell).toBeInTheDocument()
    expect(
      within(aptitude).getByRole("cell", { name: "control-full, 8,192 tokens: not measured" }),
    ).toBeInTheDocument()

    const paired = await loaded("paired")
    const pairedTable = paired.getByRole("region", {
      name: "S2 paired differences by arm and tier",
    })
    expect(
      within(pairedTable).getByRole("cell", {
        name: "concat, 8,192 tokens: −20.4 pp, 95% interval −29.0 to −9.6 pp, over 432 pairs",
      }),
    ).toBeInTheDocument()
    expect(
      within(pairedTable).getByRole("cell", {
        name: "truncate-pinned, 8,192 tokens: the reference",
      }),
    ).toBeInTheDocument()
    expect(
      within(pairedTable).getByRole("cell", {
        name: "control-full, no budget: not paired, no budget",
      }),
    ).toBeInTheDocument()

    const attribution = await loaded("attribution")
    expect(
      attribution.getByRole("cell", {
        name: "truncate-pinned, 8,192 tokens: with the facts sent 91.9% (364 / 396); not sent 0% (0 / 36)",
      }),
    ).toBeInTheDocument()

    const breakdowns = await loaded("breakdowns")
    expect(
      breakdowns.getByRole("combobox", { name: "Tier the breakdowns are read at" }),
    ).toHaveTextContent("8,192 tokens")
    const family = breakdowns.getByRole("region", { name: "By task family at 8,192 tokens" })
    expect(
      within(family).getByRole("cell", {
        name: "cwa-state, VT · Variable tracking: 97.9% (94 / 96)",
      }),
    ).toBeInTheDocument()
    expect(
      within(family).getByRole("cell", {
        name: "control-full, IP · Instruction persistence: 100% (144 / 144)",
      }),
    ).toBeInTheDocument()
    const rule = breakdowns.getByRole("region", {
      name: "Instruction persistence by rule at 8,192 tokens",
    })
    expect(
      within(rule).getByRole("cell", { name: "cwa-state, capital letters: 85.4% (41 / 48)" }),
    ).toBeInTheDocument()

    const model = await loaded("model")
    expect(model.getByText("qwen3.6-35b-a3b-fp8")).toBeInTheDocument()
    expect(
      model.getByText("replayed from the cache; no call reached an endpoint"),
    ).toBeInTheDocument()
    expect(
      model.getByText("4,755 asked, 4,755 from the cache, 0 to the endpoint"),
    ).toBeInTheDocument()
    expect(model.getByText("no probe: every arm passed S1's gate")).toBeInTheDocument()

    const rows = await loaded("rows")
    const user = userEvent.setup()
    await user.click(rows.getByRole("button", { name: "Load the rows" }))
    expect(await rows.findByText("12 rows")).toBeInTheDocument()
    expect(rows.getAllByText("correct").length).toBeGreaterThan(0)
  })

  it("reads the breakdowns at the tier the address names", async () => {
    renderApp(`/d2/runs/${run}/suites/S2?at=16384`)
    const breakdowns = await loaded("breakdowns")
    const turns = await breakdowns.findByRole("region", {
      name: "By conversation length at 16,384 tokens",
    })
    expect(
      within(turns).getByRole("cell", { name: "cwa-state, 100 turns: 97.0% (262 / 270)" }),
    ).toBeInTheDocument()
  })

  it("shows S4's questions by kind and format, with abstentions, and S6's loop against S3", async () => {
    renderApp(`/d2/runs/${run}/suites/S4`)
    const breakdowns = await loaded("breakdowns")
    const kind = await breakdowns.findByRole("region", {
      name: "By question kind at 0.25 × the budget",
    })
    expect(
      within(kind).getByRole("cell", { name: "rag, a comparison of two: 83.3% (10 / 12)" }),
    ).toBeInTheDocument()
    const paired = await loaded("paired")
    expect(
      paired.getByRole("cell", {
        name: "cwa-ranked, 0.25 × the budget: +5.6 pp, 95% interval 0.0 to +11.1 pp, over 36 pairs",
      }),
    ).toBeInTheDocument()
    const questions = await loaded("questions")
    expect(
      questions.getByRole("cell", {
        name: "truncate-pinned, 1 × the budget: abstained 37.5% (9 / 24); payloads of 6,045 tokens on average",
      }),
    ).toBeInTheDocument()

    renderApp(`/d2/runs/${run}/suites/S6`)
    const loop = await loaded("loop")
    const against = await loop.findByRole("region", { name: "Against the scripted result" })
    expect(
      within(against).getByRole("cell", {
        name: "window, Less S3's: +2.5 pp against S3, 95% interval 0.0 to +5.2 pp, over 32 probes",
      }),
    ).toBeInTheDocument()
    const replies = loop.getByRole("region", { name: "Reply length by turn" })
    expect(
      within(replies).getByRole("cell", { name: "cwa-memory, turn 11: 9.7 tokens" }),
    ).toBeInTheDocument()
  })

  it("shows S5's cost: the margin, the under-count by size, and tokens per arm", async () => {
    renderApp(`/d2/runs/${run}/suites/S5`)
    const cost = await loaded("cost")
    expect((await cost.findAllByText("35.0%")).length).toBeGreaterThan(0)
    expect(cost.getAllByText("25.6%").length).toBeGreaterThan(0)
    const bands = cost.getByRole("region", { name: "Under-count by prompt size" })
    const band = within(bands).getByRole("row", { name: /500 to 1,999/ })
    expect(within(band).getByText("5,448")).toBeInTheDocument()
    const byArm = cost.getByRole("region", { name: "Cost by suite, arm and tier" })
    expect(
      within(byArm).getByRole("cell", {
        name: /^concat, 8,192 tokens, Prompt tokens: 3,137, p95 5,456 over 297, max 5,560, total 908,574$/,
      }),
    ).toBeInTheDocument()
    expect(
      within(byArm).getByRole("cell", {
        name: "concat, 8,192 tokens, Per correct answer: 3,292 tokens",
      }),
    ).toBeInTheDocument()
    const lengths = cost.getByRole("region", { name: "Answer length by turn count, S2" })
    expect(
      within(lengths).getByRole("cell", {
        name: /^concat, 8,192 tokens, 100 turns: 6, p95 51 over 135/,
      }),
    ).toBeInTheDocument()
  })

  it("opens a filtered page of rows from the address", async () => {
    renderApp(`/d2/runs/${run}/suites/S2?arm=truncate-pinned`)
    const rows = await loaded("rows")
    expect(await rows.findByText(/of 12 rows match/)).toBeInTheDocument()
  })

  it("shows S0's self-checks and S1's gate from their typed blocks", async () => {
    renderApp(`/d2/runs/${run}/suites/S0`)
    const checks = await loaded("self-check")
    expect(await checks.findByText("Planted replies graded as intended")).toBeInTheDocument()
    expect(checks.getAllByRole("row")).toHaveLength(10)

    renderApp(`/d2/runs/${run}/suites/S1`)
    const gate = await loaded("gate")
    expect(await gate.findByText("Conversations and arms through the gate")).toBeInTheDocument()
  })

  it("says a suite is not in the run", async () => {
    renderApp(`/d2/runs/${run}/suites/S9`)
    expect(await screen.findByText(/Suite S9: not in this run/)).toBeInTheDocument()
  })
})
