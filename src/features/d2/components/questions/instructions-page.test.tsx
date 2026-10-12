import { readFileSync } from "node:fs"
import { join } from "node:path"

import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D2_FIXTURE_RUNS, D2_FIXTURES_DIR } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D2_FIXTURE_RUNS.nightly

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 2's instruction persistence page", () => {
  it("states the viability document's hypothesis and how the IP family measures it", async () => {
    renderApp("/d2/instructions")
    expect(
      await screen.findByRole("heading", { level: 1, name: "Instruction persistence" }),
    ).toBeInTheDocument()
    const viability = await section("viability")
    expect(viability.getByText(/Core rules pushed out of the context window/)).toBeInTheDocument()
    expect(viability.getByText(/The IP family is VT with one rule/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Instructions" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it("plots compliance per arm, each rule apart, and by conversation length", async () => {
    renderApp("/d2/instructions")
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", { name: /^Answers that followed the rule at 8,192 tokens/ }),
    ).toBeInTheDocument()

    expect(
      await evidence.findByRole("img", { name: /^Capital letters, at 8,192 tokens/ }),
    ).toBeInTheDocument()
    const capitals = evidence.getByRole("region", { name: "Capital letters, at 8,192 tokens" })
    expect(
      within(capitals).getByRole("cell", { name: "cwa-state: 87.5% (42 / 48)" }),
    ).toBeInTheDocument()

    const length = evidence.getByRole("region", {
      name: "Answers that followed the rule by conversation length, at 8,192 tokens",
    })
    expect(
      within(length).getByRole("cell", { name: "truncate, 100 turns: 33.3% (30 / 90)" }),
    ).toBeInTheDocument()

    expect(
      await evidence.findByRole("region", { name: "S3: each rule at 8,192 tokens" }),
    ).toBeInTheDocument()
    expect(evidence.getAllByRole("link", { name: run }).length).toBeGreaterThan(0)
  })

  it("reads the budget from the address", async () => {
    renderApp("/d2/instructions?at=16384")
    expect(
      await screen.findByRole("img", { name: /^Capital letters, at 16,384 tokens/ }),
    ).toBeInTheDocument()
  })

  it("says when S3 is in no run the index lists", async () => {
    const index = JSON.parse(readFileSync(join(D2_FIXTURES_DIR, "index.json"), "utf8")) as {
      runs: { suites: string[] }[]
    }
    for (const entry of index.runs) entry.suites = entry.suites.filter((s) => s !== "S3")
    renderApp("/d2/instructions", {
      overrides: {
        "/results/d2/index.json": {
          status: 200,
          body: JSON.stringify(index),
          contentType: "application/json",
        },
      },
    })
    const evidence = await section("evidence")
    expect(await evidence.findByText("S3: not in this run")).toBeInTheDocument()
  })
})
