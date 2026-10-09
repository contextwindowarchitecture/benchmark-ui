import { screen, waitFor, within } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  const node = document.getElementById(id) as HTMLElement
  return { ...within(node), node }
}

async function indexBody(
  edit: (index: {
    profiles: Record<string, string>
    runs: { ci_profile: string | null; suites: string[] }[]
  }) => void,
) {
  const index = JSON.parse(await readFile(join(FIXTURES_DIR, "index.json"), "utf8"))
  edit(index)
  return JSON.stringify(index)
}

describe("the Domain 1 overview", () => {
  it("reads the claim, the status line, the headline metrics and the pictures from the composite", async () => {
    renderApp("/d1")
    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: /Domain 1 · Assembly determinism/ },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()

    const claim = await section("claim")
    expect(claim.getByText(/A conforming assembler is deterministic/)).toBeInTheDocument()
    await waitFor(() => expect(claim.getByText("16de4be")).toBeInTheDocument())
    expect(claim.getByText("spec draft 2026-10-07")).toBeInTheDocument()
    expect(claim.getByText("Python 3.14.7")).toBeInTheDocument()
    expect(claim.getByRole("link", { name: FIXTURE_RUNS.nightly })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.nightly}`,
    )
    expect(claim.getByRole("link", { name: FIXTURE_RUNS.s7 })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.s7}`,
    )
    await waitFor(() => expect(claim.getByText("changed")).toBeInTheDocument())
    expect(claim.getByRole("link", { name: "compare" })).toHaveAttribute(
      "href",
      `/d1/compare?from=20261008T131247Z-691b414&to=${FIXTURE_RUNS.nightly}`,
    )

    const evidence = await section("evidence")
    const determinism = await waitFor(() => {
      const node = evidence.node.querySelector('[data-metric="s2.decision_invariance"]')
      expect(node).not.toBeNull()
      return node as HTMLElement
    })
    expect(determinism.querySelectorAll("li[data-adapter]")).toHaveLength(4)
    expect(
      within(determinism).getByText(`s2.decision_invariance · S2 · run ${FIXTURE_RUNS.nightly}`),
    ).toBeInTheDocument()
    const agreement = evidence.node.querySelector('[data-metric="s7.agreement"]') as HTMLElement
    expect(
      within(agreement).getByText(`s7.agreement · S7 · run ${FIXTURE_RUNS.s7}`),
    ).toBeInTheDocument()
    expect(within(agreement).getByText("100%")).toBeInTheDocument()
    expect(within(agreement).getByText("1,106 / 1,106")).toBeInTheDocument()
    const ungated = evidence.node.querySelector('[data-headline-group="ungated"]') as HTMLElement
    expect(ungated.querySelectorAll("[data-metric]").length).toBeGreaterThanOrEqual(5)
    expect(within(ungated).getAllByText("info").length).toBeGreaterThan(0)
    await waitFor(() => expect(evidence.getByText("35")).toBeInTheDocument())
    expect(evidence.getByText("of 35")).toBeInTheDocument()

    // The signature curve from the S7 run's first sweep, the walk, the matrix, the exponents.
    expect(
      await evidence.findByRole("img", { name: /Shedding curve of compressible-v0/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("link", { name: "Replay this sweep frame by frame" }),
    ).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.s7}/sweeps/1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3`,
    )
    await waitFor(() => expect(evidence.node.querySelector("[data-walk]")).not.toBeNull())
    expect(evidence.getByText(/Event 42 of 42: placed at Render & trace\./)).toBeInTheDocument()
    const matrix = evidence.getByRole("region", { name: "Suite by adapter matrix" })
    expect(within(matrix).getAllByRole("row")).toHaveLength(13)
    expect(within(matrix).getByText(`from run ${FIXTURE_RUNS.s7}`)).toBeInTheDocument()
    const exponents = await evidence.findByRole("region", { name: "Pressure exponents table" })
    const python = exponents.querySelector('[data-adapter="python"]') as HTMLElement
    expect(within(python).getByText("0.95")).toBeInTheDocument()
    expect(within(python).getByText("1.91")).toBeInTheDocument()
    expect(await evidence.findByRole("figure", { name: /what S2 changes/ })).toBeInTheDocument()

    const trust = await section("trust")
    expect(
      await trust.findByRole("figure", { name: /four judges of one answer/ }),
    ).toBeInTheDocument()
    expect(trust.getByText("The specification is a draft")).toBeInTheDocument()

    const drill = await section("drill-down")
    expect(await drill.findByText("No findings in the nightly run")).toBeInTheDocument()
    expect(drill.getByText("33 findings in the S7 run")).toBeInTheDocument()
    await waitFor(() => expect(drill.getByText("33 warning")).toBeInTheDocument())
    const defects = drill.getByRole("region", { name: "Defects table" })
    expect(within(defects).getAllByRole("row")).toHaveLength(6)
    expect(within(defects).getByRole("link", { name: "8e03174ca742" })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.failing}/findings/8e03174ca742`,
    )
    expect(drill.getByRole("link", { name: "Performance of the S7 run" })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.s7}/perf`,
    )
  })

  it("says so when no run has S7 and when the address names an unknown run", async () => {
    renderApp("/d1?s7=20260101T000000Z-0000000", {
      overrides: {
        "/results/d1/index.json": {
          status: 200,
          contentType: "application/json",
          body: await indexBody((index) => {
            index.runs = index.runs.filter((run) => !run.suites.includes("S7"))
          }),
        },
      },
    })
    expect(
      await screen.findByText(/names a run the index does not list/, {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByText("20260101T000000Z-0000000")).toBeInTheDocument()
    const evidence = await section("evidence")
    await waitFor(() =>
      expect(evidence.getAllByText("S7: not in this run").length).toBeGreaterThanOrEqual(2),
    )
    expect(evidence.getAllByText("No run in the index has it.").length).toBeGreaterThanOrEqual(2)
    expect(
      (await evidence.findAllByText("Measured by S7, which no run in the index has.")).length,
    ).toBeGreaterThan(0)
    const claim = await section("claim")
    expect(within(claim.node).getAllByText("none in the index")).toHaveLength(1)
  })

  it("says so when there is no nightly run yet, and still shows the S7 run", async () => {
    renderApp("/d1", {
      overrides: {
        "/results/d1/index.json": {
          status: 200,
          contentType: "application/json",
          body: await indexBody((index) => {
            index.profiles = {}
            for (const run of index.runs) run.ci_profile = null
          }),
        },
      },
    })
    expect(await screen.findByText("No nightly run yet", {}, { timeout: 5000 })).toBeInTheDocument()
    const evidence = await section("evidence")
    expect(await evidence.findByRole("img", { name: /Shedding curve/ })).toBeInTheDocument()
    // The S7 run's metrics are there; the nightly's groups say which suite would measure them.
    await waitFor(() =>
      expect(evidence.node.querySelector('[data-metric="s7.agreement"]')).not.toBeNull(),
    )
    expect(
      evidence.getByText("Measured by S2, which the loaded runs do not carry."),
    ).toBeInTheDocument()
    expect(evidence.getAllByText("Coverage: not in this run").length).toBe(1)
  })

  it("shows a pruned nightly run as such", async () => {
    renderApp("/d1", {
      overrides: { [`/results/d1/${FIXTURE_RUNS.nightly}/index.json`]: { status: 404 } },
    })
    expect(
      await screen.findByText(
        `Run ${FIXTURE_RUNS.nightly} is not on the server`,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })
})
