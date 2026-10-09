import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const failing = FIXTURE_RUNS.failing

const section = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  const node = document.getElementById(id) as HTMLElement
  return { ...within(node), node }
}

describe("findings pages", () => {
  it("is calm when a run has no findings", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}/findings`)
    expect(await screen.findByText("No findings in this run")).toBeInTheDocument()
  })

  it("lists the failing run's findings with suite, severity and oracle facets", async () => {
    renderApp(`/d1/runs/${failing}/findings?suite=S4`)
    expect(await screen.findByRole("heading", { level: 1, name: "Findings" })).toBeInTheDocument()
    const table = await screen.findByRole("region", { name: "findings rows table" })
    expect(within(table).getAllByRole("row")).toHaveLength(8)
    expect(screen.getByText("7 of 19 rows match")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Filter rows by suite" })).toHaveTextContent("S4")
    expect(screen.getByRole("combobox", { name: "Filter rows by oracle" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Filter rows by severity" })).toBeInTheDocument()
    const first = within(table).getAllByRole("link", { name: /breaks MR4/ })[0]
    expect(first?.getAttribute("href")).toMatch(new RegExp(`^/d1/runs/${failing}/findings/`))
  })

  it("renders one finding: what failed, the reproducer, the minimization and the draft", async () => {
    renderApp(`/d1/runs/${failing}/findings/d2cb80f84912`)
    expect(
      await screen.findByRole("heading", { level: 1, name: "Finding d2cb80f84912" }),
    ).toBeInTheDocument()
    const what = await section("what")
    expect(what.getAllByText("metamorphic").length).toBeGreaterThan(0)
    expect(what.getByText("R-22")).toBeInTheDocument()
    expect(await what.findByText("Required fields and canonical JSON shape")).toBeInTheDocument()
    expect(what.getByRole("link", { name: "The rows that carry this finding" })).toHaveAttribute(
      "href",
      `/d1/runs/${failing}/suites/S4?finding=d2cb80f84912`,
    )
    expect(what.getByRole("link", { name: /^fixed/ })).toHaveAttribute(
      "href",
      "https://github.com/contextwindowarchitecture/assembler-python/issues/1",
    )
    expect(what.getAllByText("MR4:integer-spelling").length).toBeGreaterThan(0)

    const reproducer = await section("reproducer")
    await waitFor(() => expect(reproducer.node.querySelector('[data-blob="ready"]')).not.toBeNull())

    const minimization = await section("minimization")
    expect(
      await minimization.findByText(/^\d+, \d+ reductions, (every reduction tried|not exhausted)$/),
    ).toBeInTheDocument()
    expect(minimization.getByText("yes")).toBeInTheDocument()
    expect(minimization.getByText("batches")).toBeInTheDocument()
    await waitFor(() =>
      expect(minimization.node.querySelectorAll("[data-draft-file]").length).toBeGreaterThanOrEqual(
        2,
      ),
    )
  })

  it("says when a finding is not in the run", async () => {
    renderApp(`/d1/runs/${failing}/findings/nope`)
    expect(await screen.findByText("No finding nope in this run.")).toBeInTheDocument()
  })
})
