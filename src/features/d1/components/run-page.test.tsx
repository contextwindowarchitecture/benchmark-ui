import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FIXTURE_RUNS } from "@/test/fixture-fetch"
import { renderApp } from "@/test/render-app"

const section = (id: string) => {
  const node = document.getElementById(id)
  if (!node) throw new Error(`no section ${id}`)
  return within(node)
}

/** The sections render once the run's index.json has loaded. */
const loaded = async (id: string) => {
  await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
  return section(id)
}

describe("run page", () => {
  it("renders the nightly fixture: provenance, matrix, metrics, no findings, drift and files", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}`)
    expect(await screen.findByRole("heading", { name: FIXTURE_RUNS.nightly })).toBeInTheDocument()
    expect(await screen.findByText("A fixture, not a whole run")).toBeInTheDocument()

    // Provenance from the manifest.
    const provenance = section("provenance")
    expect(await provenance.findByText("cwa-bench-d1 0.1.0 · Python 3.14.7")).toBeInTheDocument()
    expect(provenance.getByRole("button", { name: "Copy source digest" })).toBeInTheDocument()
    expect(
      provenance.getByTitle("d5d2bcd71dde133adfb5361002e052af1a496abc40bf0bd541f8b148aa8cb1b0"),
    ).toHaveTextContent("d5d2bcd")
    expect(provenance.getAllByText("16de4be")).toHaveLength(2)
    expect(provenance.queryByText(/provenance warning/)).toBeNull()
    expect(provenance.getByText("2026-10-07")).toBeInTheDocument()
    expect(provenance.getByText("nightly profile, from mirrors")).toBeInTheDocument()
    expect(provenance.getByText("go version go1.27.0 darwin/arm64")).toBeInTheDocument()
    expect(provenance.getByRole("list", { name: "Environment cells" }).children).toHaveLength(28)
    expect(provenance.getAllByRole("row")).toHaveLength(5)

    // The suite × adapter matrix with tallies from the suite summaries.
    const matrix = section("matrix")
    expect(await matrix.findByRole("link", { name: /^S1 · Conformance replay/ })).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.nightly}/suites/S1`,
    )
    expect(matrix.getAllByRole("row")).toHaveLength(12)
    const cell = await matrix.findByRole("link", {
      name: /^S1 python: pass, 65 \/ 65 cases, 25 \/ 25 rejections/,
    })
    expect(cell).toHaveAttribute(
      "href",
      `/d1/runs/${FIXTURE_RUNS.nightly}/suites/S1?adapter=python`,
    )

    // Every metric, grouped by suite.
    const metrics = section("metrics")
    expect(await metrics.findByText(/\d+ metrics/)).toBeInTheDocument()
    const digest = metrics.getByText("s0.digest").closest("tr") as HTMLElement
    expect(within(digest).getByText("100% (65 / 65)")).toBeInTheDocument()
    expect(within(digest).getByText("100%")).toBeInTheDocument()
    expect(within(digest).getByText("pass")).toBeInTheDocument()

    // No findings is a calm, prominent state.
    expect(section("findings").getByText("No findings in this run")).toBeInTheDocument()

    // Drift from ci.json.
    const drift = section("drift")
    expect(await drift.findByText("changed")).toBeInTheDocument()
    expect(drift.getByRole("link", { name: "20261008T131247Z-691b414" })).toHaveAttribute(
      "href",
      "/d1/runs/20261008T131247Z-691b414",
    )
    expect(drift.getByText("0 new, 1 resolved, 0 persisting.")).toBeInTheDocument()
    expect(drift.getAllByText("S2").length).toBeGreaterThan(0)
    expect(drift.getByText(/5,408 match/)).toBeInTheDocument()

    // The file list with downloads.
    const files = section("files")
    expect(files.getByRole("link", { name: "Download summary.json" })).toHaveAttribute(
      "href",
      `/results/d1/${FIXTURE_RUNS.nightly}/summary.json`,
    )
    expect(
      within(files.getByText("config.toml").closest("tr") as HTMLElement).getByText("none"),
    ).toBeInTheDocument()
  })

  it("filters metrics by status from the URL", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}?metric=info`)
    const metrics = await loaded("metrics")
    expect(await metrics.findByText(/of \d+ metrics match/)).toBeInTheDocument()
    const badges = metrics.getAllByText("info", { selector: "span[data-status] span" })
    expect(badges.length).toBeGreaterThan(0)
    expect(metrics.queryAllByText("pass", { selector: "span[data-status] span" })).toHaveLength(0)
  })

  it("renders the failing fixture's findings by suite and severity, with no drift report", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.failing}`)
    await screen.findByRole("heading", { name: FIXTURE_RUNS.failing })
    const findings = await loaded("findings")
    expect(await findings.findByText(/19 findings: S4 7, S5 12/)).toBeInTheDocument()
    await waitFor(() => expect(findings.getAllByRole("row").length).toBeGreaterThan(19))
    expect(
      findings.getAllByText("error", { selector: "span[data-status] span" }).length,
    ).toBeGreaterThan(0)
    const upstream = findings
      .getAllByRole("link", { name: /^fixed/ })
      .map((a) => a.getAttribute("href"))
    expect(upstream).toContain(
      "https://github.com/contextwindowarchitecture/assembler-python/issues/1",
    )
    expect(
      section("drift").getByText("A drift report (ci.json): not in this run"),
    ).toBeInTheDocument()
    expect(section("provenance").queryByText(/provenance warning/)).toBeNull()
  })

  it("renders the S7 fixture's matrix without per-adapter tallies", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.s7}`)
    const matrix = await loaded("matrix")
    expect(await matrix.findByRole("link", { name: /^S7/ })).toBeInTheDocument()
    expect(await matrix.findAllByText("no per-adapter tally")).toHaveLength(4)
    expect(section("files").getByText("perf/summary.json")).toBeInTheDocument()
  })

  it("shows the pruned state when the run's directory is gone", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.failing}`, {
      overrides: { [`/results/d1/${FIXTURE_RUNS.failing}/index.json`]: { status: 404 } },
    })
    expect(
      await screen.findByText(`Run ${FIXTURE_RUNS.failing} is not on the server`),
    ).toBeInTheDocument()
  })

  it("keeps the other regions when one document is of an unsupported schema or invalid", async () => {
    renderApp(`/d1/runs/${FIXTURE_RUNS.nightly}`, {
      overrides: {
        [`/results/d1/${FIXTURE_RUNS.nightly}/manifest.json`]: {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/manifest/v3"}',
          contentType: "application/json",
        },
        [`/results/d1/${FIXTURE_RUNS.nightly}/ci.json`]: {
          status: 200,
          body: '{"$schema":"cwa-bench-d1/ci-report/v1","run_id":"x"}',
          contentType: "application/json",
        },
      },
    })
    expect(
      await screen.findByText("This viewer does not read cwa-bench-d1/manifest/v3"),
    ).toBeInTheDocument()
    expect(await section("drift").findByText(/does not match its schema/)).toBeInTheDocument()
    expect(
      await section("matrix").findByRole("link", { name: /^S1 · Conformance replay/ }),
    ).toBeInTheDocument()
  })

  it("says when the address is not a run id", async () => {
    renderApp("/d1/runs/latest")
    expect(await screen.findByText("latest is not a run id.")).toBeInTheDocument()
  })
})
