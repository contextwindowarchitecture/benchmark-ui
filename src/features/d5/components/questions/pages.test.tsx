import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { D5_FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const run = D5_FIXTURE_RUNS.recorded

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return within(document.getElementById(id) as HTMLElement)
}

describe("Domain 5's question pages", () => {
  it("Structural Isolation names its viability row, then S1's checks and the forged boundaries", async () => {
    renderApp("/d5/structure")
    expect(
      await screen.findByRole("heading", { level: 1, name: "Structural Isolation" }),
    ).toBeInTheDocument()
    const viability = await section("viability")
    expect(viability.getByText(/Latent Role Confusion/)).toBeInTheDocument()
    expect(viability.getByText("How Domain 5 measures it")).toBeInTheDocument()
    const evidence = await section("evidence")
    expect(await evidence.findByText("Answers equal to the prediction")).toBeInTheDocument()
    expect(
      evidence.getByRole("region", { name: "Forged structure in the conventional payloads" }),
    ).toBeInTheDocument()
    const carriers = evidence.getByRole("region", {
      name: /^Baseline payloads whose structure the attack forged by arm and tier/,
    })
    expect(
      within(carriers).getByText("after a forged close of the arm's own wrapper"),
    ).toBeInTheDocument()
  })

  it("Attacks links BIPIA, plots success per arm, the pairs and success by length, and names what waits", async () => {
    renderApp("/d5/attacks")
    const viability = await section("viability")
    expect(viability.getByRole("link", { name: /^Benchmarking and Defending/ })).toHaveAttribute(
      "href",
      "https://arxiv.org/abs/2312.14197",
    )
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", { name: /^Attacks executed per arm/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("cell", { name: /^cwa-boundary less reminder: −8\.1 pp/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("region", { name: "Attacks executed by content length" }),
    ).toBeInTheDocument()
    expect(evidence.getAllByRole("link", { name: run }).length).toBeGreaterThan(0)
    expect(evidence.getByText(/in a block the harness does not type yet/)).toBeInTheDocument()
  })

  it("Utility plots clean and benign-imperative accuracy", async () => {
    renderApp("/d5/utility")
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", {
        name: /^Benign-imperative tasks answered correctly per arm/,
      }),
    ).toBeInTheDocument()
  })

  it("Adaptive Attacker reads the budget from the address", async () => {
    renderApp("/d5/adaptive?at=500")
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", {
        name: /^Adaptive attack success per arm after 500 queries/,
      }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("region", { name: "Adaptive attack success by queries spent" }),
    ).toBeInTheDocument()
  })

  it("External Sets links both papers and breaks LLMail-Inject down by scenario", async () => {
    renderApp("/d5/external")
    const viability = await section("viability")
    expect(viability.getByRole("link", { name: /^LLMail-Inject/ })).toBeInTheDocument()
    expect(viability.getByRole("link", { name: /^Can LLMs Separate/ })).toBeInTheDocument()
    const evidence = await section("evidence")
    const scenarios = await evidence.findByRole("region", {
      name: /^LLMail-Inject attacks executed, by .* by arm and tier/,
    })
    expect(within(scenarios).getByText("scenario 2")).toBeInTheDocument()
    expect(within(scenarios).getByText("beat its own level")).toBeInTheDocument()
  })

  it("Pasted Material reads S5's rates, filed under S5", async () => {
    renderApp("/d5/pasted")
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("img", { name: /^Pasted attacks executed per arm/ }),
    ).toBeInTheDocument()
    expect(
      evidence.getByRole("cell", { name: /^cwa-pasted less pasted-naive: \+1\.7 pp/ }),
    ).toBeInTheDocument()
  })

  it("Persistence plots the code word by band and where the poison went", async () => {
    renderApp("/d5/persistence")
    const evidence = await section("evidence")
    expect(
      await evidence.findByRole("region", {
        name: "The attack's code word in later replies, by distance from the poison",
      }),
    ).toBeInTheDocument()
    expect(
      document.querySelector("[data-chart=tier-lines] [data-panel=cwa-state-x]"),
    ).not.toBeNull()
    expect(
      evidence.getByRole("img", { name: /^Probes answered with the planted figure per arm/ }),
    ).toBeInTheDocument()
  })
})
