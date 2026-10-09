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

describe("coverage page", () => {
  it("renders the three matrices of the nightly with the contract's words and the suites", async () => {
    renderApp(`/d1/runs/${nightly}/coverage`)
    expect(await screen.findByRole("heading", { level: 1, name: "Coverage" })).toBeInTheDocument()
    const requirements = await section("requirements")
    expect(
      await requirements.findByRole("heading", { level: 3, name: /^boundary/ }),
    ).toBeInTheDocument()
    expect(requirements.getByRole("heading", { level: 3, name: /^assembler/ })).toBeInTheDocument()
    expect(
      requirements.getByRole("heading", { level: 3, name: /^application/ }),
    ).toBeInTheDocument()
    // 26 requirements × 4 adapters, each cell named with its fraction.
    expect(requirements.getAllByLabelText(/, Python: /)).toHaveLength(26)
    expect(
      await requirements.findByText("Required fields and canonical JSON shape"),
    ).toBeInTheDocument()
    // The suites that exercise a requirement arrive with the suite summaries.
    await waitFor(() =>
      expect(requirements.getAllByRole("link", { name: "S1" }).length).toBeGreaterThan(0),
    )

    const reasons = await section("reasons")
    const python = reasons.getByRole("region", { name: "Reasons by slot matrix for Python" })
    expect(within(python).getAllByRole("row")).toHaveLength(36)
    expect(within(python).getByText("producer_not_authenticated")).toBeInTheDocument()
    expect(within(python).getByText("no slot")).toBeInTheDocument()

    const tags = await section("tags")
    expect(tags.getByText("418 tags, every one exercised.")).toBeInTheDocument()
    expect(
      within(tags.getByRole("region", { name: "Tags matrix" })).getAllByRole("row"),
    ).toHaveLength(419)
  })

  it("takes the adapter and the family from the address", async () => {
    renderApp(`/d1/runs/${nightly}/coverage?adapter=go&family=included`)
    const reasons = await section("reasons")
    expect(
      await reasons.findByRole("region", { name: "Reasons by slot matrix for Go" }),
    ).toBeInTheDocument()
    const tags = await section("tags")
    expect(tags.getByText(/^\d+ tags in included, every one exercised\.$/)).toBeInTheDocument()
  })

  it("shows the unsupported state when the coverage document is of a schema it does not read", async () => {
    renderApp(`/d1/runs/${nightly}/coverage`, {
      overrides: {
        [`/results/d1/${nightly}/coverage.json`]: {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/coverage/v9"}',
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText("This viewer does not read cwa-bench-d1/coverage/v9"),
    ).toBeInTheDocument()
  })
})
