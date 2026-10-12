import { readFileSync } from "node:fs"
import { join } from "node:path"

import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS, D2_FIXTURES_DIR } from "@/test/fixture-fetch"
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
      name: /^truncate-pinned, 8,192 tokens: 84\.0% \(363 \/ 432\), 95% interval 72\.1% to 93\.9%$/,
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
        name: "truncate-pinned, 8,192 tokens: with the facts sent 91.7% (363 / 396); not sent 0% (0 / 36)",
      }),
    ).toBeInTheDocument()

    const breakdowns = await loaded("breakdowns")
    expect(
      breakdowns.getByRole("combobox", { name: "Tier the breakdowns are read at" }),
    ).toHaveTextContent("8,192 tokens")
    const family = breakdowns.getByRole("region", { name: "By task family at 8,192 tokens" })
    expect(
      within(family).getByRole("cell", {
        name: "cwa-state, VT · Variable tracking: 94.8% (91 / 96)",
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
      within(rule).getByRole("cell", { name: "cwa-state, capital letters: 87.5% (42 / 48)" }),
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
      within(turns).getByRole("cell", { name: "cwa-state, 100 turns: 96.7% (261 / 270)" }),
    ).toBeInTheDocument()
  })

  it("shows S4's questions by kind and format, with abstentions, and S6's loop against S3", async () => {
    renderApp(`/d2/runs/${run}/suites/S4`)
    const breakdowns = await loaded("breakdowns")
    const kind = await breakdowns.findByRole("region", {
      name: "By question kind at 0.25 × the budget",
    })
    expect(
      within(kind).getByRole("cell", { name: "rag, a comparison of two: 91.7% (11 / 12)" }),
    ).toBeInTheDocument()
    const paired = await loaded("paired")
    expect(
      paired.getByRole("cell", {
        name: "cwa-ranked, 0.25 × the budget: −5.6 pp, 95% interval −11.1 to 0.0 pp, over 36 pairs",
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
        name: "window, Less S3's: +1.3 pp against S3, 95% interval −5.2 to +7.1 pp, over 32 probes",
      }),
    ).toBeInTheDocument()
    const replies = loop.getByRole("region", { name: "Reply length by turn" })
    expect(
      within(replies).getByRole("cell", { name: "cwa-memory, turn 11: 5.0 tokens" }),
    ).toBeInTheDocument()
  })

  it("shows S5's cost: the margin, the under-count by size, and tokens per arm", async () => {
    renderApp(`/d2/runs/${run}/suites/S5`)
    const cost = await loaded("cost")
    expect((await cost.findAllByText("35.0%")).length).toBeGreaterThan(0)
    expect(cost.getAllByText("25.6%").length).toBeGreaterThan(0)
    const bands = cost.getByRole("region", { name: "Under-count by prompt size" })
    const band = within(bands).getByRole("row", { name: /500 to 1,999/ })
    expect(within(band).getByText("5,478")).toBeInTheDocument()
    const byArm = cost.getByRole("region", { name: "Cost by suite, arm and tier" })
    expect(
      within(byArm).getByRole("cell", {
        name: /^concat, 8,192 tokens, Prompt tokens: 3,137, p95 5,456 over 297, max 5,560, total 908,574$/,
      }),
    ).toBeInTheDocument()
    expect(
      within(byArm).getByRole("cell", {
        name: "concat, 8,192 tokens, Per correct answer: 3,304 tokens",
      }),
    ).toBeInTheDocument()
    // Correct of the answers given, not the arm's accuracy; an overflow gave no answer.
    expect(
      within(byArm).getAllByRole("columnheader", { name: "Correct of answered" }).length,
    ).toBeGreaterThan(0)
    // A sum of per-call relative errors means nothing: the estimator's cells carry no total.
    const estimate = within(byArm).getByRole("cell", {
      name: /^concat, 8,192 tokens, Own count less the server's: /,
    })
    expect(estimate.getAttribute("aria-label")).not.toMatch(/total/)
    const lengths = cost.getByRole("region", { name: "Answer length by turn count, S2" })
    expect(
      within(lengths).getByRole("cell", {
        name: /^concat, 8,192 tokens, 100 turns: 6, p95 51 over 135/,
      }),
    ).toBeInTheDocument()
  })

  it("files overflows as not sent, and flags an arm whose attribution files them under facts sent", async () => {
    // The fixture's harness files every overflow as not sent: concat's 135 overflows are its
    // "not sent" tally, and nothing is flagged.
    const { unmount } = renderApp(`/d2/runs/${run}/suites/S2`)
    const fixed = await loaded("attribution")
    expect(
      await fixed.findByRole("cell", {
        name: "concat, 8,192 tokens: with the facts sent 92.6% (275 / 297); not sent 0% (0 / 135)",
      }),
    ).toBeInTheDocument()
    expect(fixed.queryByText(/An overflow or a refusal reaches no model/)).toBeNull()
    unmount()

    // A harness before the fix filed those overflows under facts sent: the same block, so filed.
    const summary = JSON.parse(
      readFileSync(join(D2_FIXTURES_DIR, run, "suites/S2/summary.json"), "utf8"),
    ) as {
      by_arm: {
        arm: string
        tier: string
        given: { present: { n: number; correct: number }; absent: { n: number; correct: number } }
      }[]
    }
    for (const entry of summary.by_arm) {
      if (entry.arm !== "concat" || entry.tier !== "8192") continue
      entry.given = {
        present: {
          n: entry.given.present.n + entry.given.absent.n,
          correct: entry.given.present.correct + entry.given.absent.correct,
        },
        absent: { n: 0, correct: 0 },
      }
    }
    renderApp(`/d2/runs/${run}/suites/S2`, {
      overrides: {
        [`/results/d2/${run}/suites/S2/summary.json`]: {
          status: 200,
          body: JSON.stringify(summary),
          contentType: "application/json",
        },
      },
    })
    const attribution = await loaded("attribution")
    expect(
      await attribution.findByRole("cell", {
        name: /^concat, 8,192 tokens: with the facts sent .*; not sent none; 135 of these reached no model$/,
      }),
    ).toBeInTheDocument()
    expect(attribution.getByText(/An overflow or a refusal reaches no model/)).toBeInTheDocument()
  })

  it("offers a file above the worker's budget as a download at once, without fetching it", async () => {
    const index = JSON.parse(readFileSync(join(D2_FIXTURES_DIR, run, "index.json"), "utf8")) as {
      files: { path: string; rows?: number }[]
    }
    for (const file of index.files) if (file.path === "suites/S2/grades.jsonl") file.rows = 93_312
    const requests: string[] = []
    renderApp(`/d2/runs/${run}/suites/S2`, {
      onRequest: (url) => requests.push(url),
      overrides: {
        [`/results/d2/${run}/index.json`]: {
          status: 200,
          body: JSON.stringify(index),
          contentType: "application/json",
        },
      },
    })
    const rows = await loaded("rows")
    expect(await rows.findByText("Too many rows to show here")).toBeInTheDocument()
    expect(rows.queryByRole("button", { name: "Load the rows" })).toBeNull()
    expect(rows.getByText(/93,312 rows exceed/)).toBeInTheDocument()
    expect(requests.some((url) => url.endsWith("suites/S2/grades.jsonl"))).toBe(false)
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
