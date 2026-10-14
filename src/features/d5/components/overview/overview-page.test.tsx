import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D5_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D5_FIXTURE_RUNS.recorded

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 5's overview", () => {
  it("reads as claim, answer, both kinds of claim, trust and drill-down, from the run it names", async () => {
    renderApp("/d5")
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Domain 5 · Instruction hierarchy, security and indirect prompt injection",
      }),
    ).toBeInTheDocument()
    const claim = await section("claim")
    expect(claim.getByText("What CWA guarantees by construction")).toBeInTheDocument()
    const runs = await claim.findByRole("region", { name: "Runs read" })
    expect(within(runs).getByRole("link", { name: run })).toHaveAttribute("href", `/d5/runs/${run}`)
    expect(await within(runs).findByText("recorded")).toBeInTheDocument()

    const structure = await section("structure")
    expect(
      await structure.findByText("CWA payloads the structure oracle reads back item for item"),
    ).toBeInTheDocument()
    const forged = await structure.findByRole("region", {
      name: "Forged structure in the conventional payloads",
    })
    expect(
      within(forged).getByRole("cell", {
        name: /^delimited, Boundary forged by a tag attack: 100%/,
      }),
    ).toBeInTheDocument()

    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", { name: /^Attacks executed per arm/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getAllByText(/95% cluster-bootstrap interval over task instances/).length,
    ).toBeGreaterThan(0)
    expect(
      evidence.getByRole("cell", { name: /^cwa less xml-unescaped: −7\.3 pp/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("img", { name: /^LLMail-Inject's emails that succeeded per arm/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("img", { name: /^Adaptive attack success per arm after 2,000 queries/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("img", { name: /^The attack's code word in later replies per arm/ }),
    ).toBeInTheDocument()

    const trust = await section("trust")
    expect(trust.getByText("No temporal decay")).toBeInTheDocument()
    const drill = await section("drill-down")
    expect(drill.getByRole("link", { name: "Structural Isolation" })).toHaveAttribute(
      "href",
      "/d5/structure",
    )
  })

  it("names a pinned run the index does not list", async () => {
    renderApp("/d5?run=20260101T000000Z-0000000")
    expect(
      await screen.findByText("The address names a run the index does not list"),
    ).toBeInTheDocument()
    expect(screen.getByText(/is not in Domain 5's index/)).toBeInTheDocument()
  })
})
